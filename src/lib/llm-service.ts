/**
 * Claude API LLM 서비스
 * - 일반 분석 (단건 응답)
 * - 스트리밍 분석 (토큰 단위 실시간 전송)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { 공격로그입력 } from "@/types/input";
import {
  프롬프트맵,
  분석단계이름,
  전체리포트_프롬프트,
} from "@/lib/prompts";

const 기본모델 = "claude-opus-4-7";
const 최대토큰 = 1024;

// 모든 분석에 공통으로 캐시되는 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 사이버 보안 전문가입니다. 사용자가 제공하는 공격 로그를 분석하고 요청된 형식의 JSON만 출력하세요.
마크다운 코드블록, 설명 텍스트 없이 순수 JSON만 반환하세요. 출력은 반드시 { 로 시작하고 } 로 끝나야 합니다.`;

function JSON추출(텍스트: string): Record<string, unknown> {
  let s = 텍스트.replace(/```(?:json)?\s*/g, "").replace(/```\s*$/g, "").trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (m) s = m[0];
  return JSON.parse(s) as Record<string, unknown>;
}

export class LLM분석서비스 {
  readonly 모델: string;
  private client: Anthropic;

  constructor(모델 = 기본모델) {
    this.모델 = 모델;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // ─── 내부: Claude 단건 호출 ──────────────────────────────────────────────

  async _claude호출(프롬프트: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.모델,
      max_tokens: 최대토큰,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: 프롬프트 }],
    });
    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }

  // ─── 내부: Claude 스트리밍 호출 ─────────────────────────────────────────

  async *_claude스트리밍(프롬프트: string): AsyncGenerator<[string, boolean]> {
    const stream = this.client.messages.stream({
      model: this.모델,
      max_tokens: 최대토큰,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: 프롬프트 }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield [event.delta.text, false];
      }
    }
    yield ["", true];
  }

  // ─── 내부: 재시도 호출 ───────────────────────────────────────────────────

  async _재시도호출(프롬프트: string): Promise<Record<string, unknown>> {
    const 원문 = await this._claude호출(프롬프트);
    return JSON추출(원문);
  }

  // ─── 스트리밍: 단일 분석 ─────────────────────────────────────────────────

  async *_단일스트리밍(
    로그: 공격로그입력,
    분석유형: string
  ): AsyncGenerator<Record<string, unknown>> {
    const 프롬프트fn = 프롬프트맵[분석유형];
    if (!프롬프트fn) {
      yield { 유형: "오류", 메시지: `알 수 없는 분석 유형: ${분석유형}` };
      return;
    }
    const 프롬프트 = 프롬프트fn(로그);
    let 전체텍스트 = "";

    for await (const [token, done] of this._claude스트리밍(프롬프트)) {
      if (token) {
        전체텍스트 += token;
        yield { 유형: "토큰", 텍스트: token };
      }
      if (done) break;
    }

    try {
      const 결과 = JSON추출(전체텍스트);
      yield { 유형: "완료", 결과, 분석유형 };
    } catch (e) {
      yield { 유형: "오류", 메시지: `결과 파싱 실패: ${String(e)}` };
    }
  }

  // ─── 스트리밍: 전체 리포트 (5단계) ─────────────────────────────────────

  async *_전체리포트스트리밍(
    로그: 공격로그입력
  ): AsyncGenerator<Record<string, unknown>> {
    const 단계목록 = ["사건요약", "의도분석", "숙련도분석", "대응권고"];
    const 수집결과: Record<string, Record<string, unknown>> = {};
    const 총단계 = 5;

    for (let i = 0; i < 단계목록.length; i++) {
      const 유형 = 단계목록[i];
      yield { 유형: "단계시작", 단계: i + 1, 총단계, 이름: 분석단계이름[유형] };

      const 프롬프트 = 프롬프트맵[유형]!(로그);
      let 전체텍스트 = "";

      for await (const [token, done] of this._claude스트리밍(프롬프트)) {
        if (token) {
          전체텍스트 += token;
          yield { 유형: "토큰", 텍스트: token };
        }
        if (done) break;
      }

      try {
        const 결과 = JSON추출(전체텍스트);
        수집결과[유형] = 결과;
        yield { 유형: "단계완료", 단계: i + 1, 이름: 분석단계이름[유형], 결과 };
      } catch (e) {
        yield { 유형: "오류", 메시지: `${분석단계이름[유형]} 파싱 실패: ${String(e)}` };
        return;
      }
    }

    // 5단계: 리포트 서술
    yield { 유형: "단계시작", 단계: 5, 총단계, 이름: "리포트 서술 생성" };

    const 서술프롬프트 = 전체리포트_프롬프트(
      로그,
      수집결과["사건요약"] ?? {},
      수집결과["의도분석"] ?? {},
      수집결과["숙련도분석"] ?? {},
      수집결과["대응권고"] ?? {}
    );
    let 서술텍스트 = "";

    for await (const [token, done] of this._claude스트리밍(서술프롬프트)) {
      if (token) {
        서술텍스트 += token;
        yield { 유형: "토큰", 텍스트: token };
      }
      if (done) break;
    }

    let 서술결과: Record<string, unknown>;
    try {
      서술결과 = JSON추출(서술텍스트);
    } catch {
      서술결과 = { 리포트서술: 서술텍스트 };
    }

    yield {
      유형: "완료",
      분석유형: "전체리포트",
      결과: {
        사건요약: 수집결과["사건요약"] ?? {},
        의도분석: 수집결과["의도분석"] ?? {},
        숙련도분석: 수집결과["숙련도분석"] ?? {},
        대응권고: 수집결과["대응권고"] ?? {},
        리포트서술: 서술결과["리포트서술"] ?? "",
        생성시각: new Date().toISOString(),
        사용모델: this.모델,
      },
    };
  }

  // ─── 공개: 스트리밍 분석 진입점 ─────────────────────────────────────────

  async *스트리밍분석(
    로그: 공격로그입력,
    분석유형: string
  ): AsyncGenerator<Record<string, unknown>> {
    if (!(분석유형 in 프롬프트맵) && 분석유형 !== "전체리포트") {
      yield { 유형: "오류", 메시지: `알 수 없는 분석 유형: ${분석유형}` };
      return;
    }

    const 이름 = 분석단계이름[분석유형] ?? "전체 리포트";
    yield { 유형: "시작", 메시지: `${이름} 시작...` };

    if (분석유형 === "전체리포트") {
      yield* this._전체리포트스트리밍(로그);
    } else {
      yield* this._단일스트리밍(로그, 분석유형);
    }
  }

  // ─── 서버 상태 확인 ──────────────────────────────────────────────────────

  async 서버상태확인(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}

// 싱글톤 인스턴스
export const 분석서비스 = new LLM분석서비스();
