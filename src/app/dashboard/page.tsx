"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as d3 from "d3";
import type { 공격로그입력, 공격유형코드, 위험등급코드 } from "@/types/input";

// ── 국가 목록 ─────────────────────────────────────────────────────────────────

const 국가목록 = ["중국", "러시아", "미국", "북한", "일본", "독일", "영국", "프랑스", "브라질", "인도", "이란", "우크라이나", "캐나다", "호주", "기타"];

// ── 분석 결과 타입 ────────────────────────────────────────────────────────────

type 분석결과타입 = { 결과: Record<string, unknown>; 분석유형: string } | null;
type 오류타입 = string | null;

type CSVRow = {
  timestamp: string;
  proto: string;
  src_ip: string;
  src_port: string;
  dst_ip: string;
  dst_port: string;
  hash1: string;
  hash2: string;
};

// ── 결과 React 컴포넌트 ───────────────────────────────────────────────────────

function 사건요약카드컴포넌트({ 데이터 }: { 데이터: Record<string, unknown> }) {
  const pts = (데이터.핵심포인트 as string[]) || [];
  return (
    <div className="요약카드">
      <p className="요약텍스트">{String(데이터.요약문 || "")}</p>
      <ul className="포인트목록">
        {pts.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
      <span className="공격명배지">🏷️ {String(데이터.공격명칭 || "")}</span>
    </div>
  );
}

function 의도분석카드컴포넌트({ 데이터 }: { 데이터: Record<string, unknown> }) {
  const pct = Math.round((Number(데이터.신뢰도) || 0) * 100);
  const 의도 = String(데이터.의도 || "알 수 없음");
  return (
    <div className="분석칩카드">
      <div className="분석칩섹션제목">공격 의도 분류</div>
      <span className={`큰배지 ${의도}`}>{의도}</span>
      <div className="신뢰도바컨테이너">
        <div className="라벨"><span>AI 분석 신뢰도</span><span>{pct}%</span></div>
        <div className="신뢰도바"><div className="채움" style={{ width: `${pct}%` }} /></div>
      </div>
      <p className="근거설명">{String(데이터.판단근거 || "")}</p>
    </div>
  );
}

function 숙련도카드컴포넌트({ 데이터 }: { 데이터: Record<string, unknown> }) {
  const 표시: Record<string, string> = { "Script Kiddie": "초보 해커", "Intermediate": "중급 해커", "Advanced": "고급 해커" };
  const 배지cls: Record<string, string> = { "Script Kiddie": "초보", "Intermediate": "중급", "Advanced": "고급" };
  const 등급 = String(데이터.등급 || "");
  const 근거 = (데이터.근거목록 as string[]) || [];
  return (
    <div className="분석칩카드">
      <div className="분석칩섹션제목">공격자 숙련도 평가</div>
      <span className={`큰배지 ${배지cls[등급] || ""}`}>{표시[등급] || 등급}</span>
      <ul className="포인트목록" style={{ margin: "8px 0" }}>
        {근거.map((g, i) => <li key={i}>{g}</li>)}
      </ul>
      <p className="근거설명">{String(데이터.종합설명 || "")}</p>
    </div>
  );
}

function 대응권고카드컴포넌트({ 데이터 }: { 데이터: Record<string, unknown> }) {
  const 즉각 = (데이터.즉각조치 as string[]) || [];
  const 장기 = (데이터.장기권고 as string[]) || [];
  const p = String(데이터.대응우선순위 || "");
  const 우선cls = p === "즉시" ? "즉시" : p.includes("24") ? "시간" : "주";
  return (
    <div className="권고카드">
      <div className="우선순위행">
        대응 우선순위: <span className={`우선순위배지 ${우선cls}`}>{p}</span>
      </div>
      <p className="권고섹션제목 즉각">🚨 지금 당장 해야 할 조치</p>
      <ul className="권고목록 즉각">{즉각.map((a, i) => <li key={i}>{a}</li>)}</ul>
      <p className="권고섹션제목 장기">🔵 장기적으로 해야 할 조치</p>
      <ul className="권고목록 장기">{장기.map((a, i) => <li key={i}>{a}</li>)}</ul>
    </div>
  );
}

function 전체리포트컴포넌트({ 결과 }: { 결과: Record<string, unknown> }) {
  return (
    <>
      {결과.사건요약 && (
        <>
          <div className="결과섹션라벨">📋 사건 요약</div>
          <사건요약카드컴포넌트 데이터={결과.사건요약 as Record<string, unknown>} />
        </>
      )}
      {(!!결과.의도분석 || !!결과.숙련도분석) && (
        <>
          <hr className="결과구분선" />
          <div className="결과그리드">
            {!!결과.의도분석 && (
              <div>
                <div className="결과섹션라벨" style={{ marginBottom: 8 }}>🎯 공격 의도</div>
                <의도분석카드컴포넌트 데이터={결과.의도분석 as Record<string, unknown>} />
              </div>
            )}
            {!!결과.숙련도분석 && (
              <div>
                <div className="결과섹션라벨" style={{ marginBottom: 8 }}>🧠 숙련도</div>
                <숙련도카드컴포넌트 데이터={결과.숙련도분석 as Record<string, unknown>} />
              </div>
            )}
          </div>
        </>
      )}
      {결과.대응권고 && (
        <>
          <hr className="결과구분선" />
          <div className="결과섹션라벨" style={{ marginBottom: 8 }}>🛡️ 대응 권고</div>
          <대응권고카드컴포넌트 데이터={결과.대응권고 as Record<string, unknown>} />
        </>
      )}
      {결과.리포트서술 && (
        <>
          <hr className="결과구분선" />
          <div className="결과섹션라벨" style={{ marginBottom: 8 }}>📝 종합 리포트</div>
          <div className="리포트서술박스">{String(결과.리포트서술)}</div>
        </>
      )}
    </>
  );
}

function 분석결과카드({ 분석결과, 오류 }: { 분석결과: 분석결과타입; 오류: 오류타입 }) {
  if (오류) return <div className="카드"><div className="오류박스">❌ {오류}</div></div>;
  if (!분석결과) return null;
  const 유형이름: Record<string, string> = {
    사건요약: "📋 사건 요약", 의도분석: "🎯 공격 의도 분석", 숙련도분석: "🧠 숙련도 분석",
    대응권고: "🛡️ 대응 권고", 전체리포트: "📄 전체 분석 리포트",
  };
  const { 결과, 분석유형 } = 분석결과;
  return (
    <div className="카드">
      <div className="결과카드헤더">
        <span className="결과카드제목">{유형이름[분석유형] || "분석 결과"}</span>
        <span className="결과카드부제">AI 분석 완료</span>
      </div>
      {분석유형 === "사건요약" && <사건요약카드컴포넌트 데이터={결과} />}
      {분석유형 === "의도분석" && <의도분석카드컴포넌트 데이터={결과} />}
      {분석유형 === "숙련도분석" && <숙련도카드컴포넌트 데이터={결과} />}
      {분석유형 === "대응권고" && <대응권고카드컴포넌트 데이터={결과} />}
      {분석유형 === "전체리포트" && <전체리포트컴포넌트 결과={결과} />}
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────

const 초기폼 = {
  사건ID: `INC-${new Date().getFullYear()}-001`,
  허니팟ID: "honeypot-01",
  발생시각: new Date().toISOString().slice(0, 16),
  공격자IP: "",
  공격자국가: "중국",
  공격자포트: "",
  공격유형: "UNKNOWN" as 공격유형코드,
  위험점수: 50,
  탐지신뢰도: 0.8,
  위험등급: "MEDIUM" as 위험등급코드,
  OWASP분류: "",
  MITRE전술: "",
  페이로드: "",
  대상URI: "",
  HTTP메서드: "POST",
  사용자에이전트: "",
  요청횟수: 1,
  세션지속시간: "",
};

export default function DashboardPage() {
  // ── 폼 상태 ─────────────────────────────────────────────────────────────
  const [폼, set폼] = useState(초기폼);
  const [행위시퀀스, set행위시퀀스] = useState<string[]>([]);
  const [새행위, set새행위] = useState("");
  const [폼오류, set폼오류] = useState("");
  const [고급열림, set고급열림] = useState(false);

  // ── 분석 상태 ────────────────────────────────────────────────────────────
  const [분석중, set분석중] = useState(false);
  const [서버상태, set서버상태] = useState<{ 연결됨: boolean; 모델: string }>({ 연결됨: false, 모델: "" });
  const [스트리밍텍스트, set스트리밍텍스트] = useState("");
  const [분석결과, set분석결과] = useState<분석결과타입>(null);
  const [분석오류, set분석오류] = useState<오류타입>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [단계칩, set단계칩] = useState<{ 이름: string; 상태: "pending" | "진행중" | "완료" }[]>([]);
  const [showStreaming, setShowStreaming] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [커서보임, set커서보임] = useState(false);

  const 게이지SVGRef = useRef<SVGSVGElement>(null);
  const 네트워크SVGRef = useRef<SVGSVGElement>(null);
  const 스트리밍본문Ref = useRef<HTMLDivElement>(null);
  const 시뮬레이션Ref = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const 레이더SVGRef = useRef<SVGSVGElement | null>(null);
  const 바차트SVGRef = useRef<SVGSVGElement | null>(null);
  const 결과HTML캐시Ref = useRef<string>("");
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // ── CSV 상태 ────────────────────────────────────────────────────────────
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [csvSelectedIdx, setCsvSelectedIdx] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [directInput, setDirectInput] = useState("");

  // ── 서버 상태 확인 ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: { Claude연결: boolean; 사용모델: string }) => {
        set서버상태({ 연결됨: data.Claude연결, 모델: data.사용모델 });
      })
      .catch(() => {});
  }, []);

  // ── 시각화 헬퍼 ─────────────────────────────────────────────────────────────
  function detectCloud(ip: string): { name: string; icon: string } {
    const [a, b] = ip.split(".").map(Number);
    if (a === 8 && (b === 216 || b === 218)) return { name: "Alibaba Cloud", icon: "🇨🇳" };
    if ([3, 18, 52, 54].includes(a)) return { name: "AWS EC2", icon: "🟠" };
    if ([35, 34].includes(a)) return { name: "Google Cloud", icon: "🔵" };
    if ([13, 20, 40].includes(a)) return { name: "Azure", icon: "🔷" };
    if (a === 51 && (b === 159 || b === 158)) return { name: "Scaleway", icon: "🇫🇷" };
    if ([138, 159, 162, 167].includes(a)) return { name: "DigitalOcean", icon: "💧" };
    if ([185, 93, 194, 178].includes(a)) return { name: "European VPS", icon: "🇪🇺" };
    return { name: "Unknown", icon: "🌐" };
  }



  function riskColor(grade: string): string {
    return ({ CRITICAL: "#f87171", HIGH: "#fb923c", MEDIUM: "#fbbf24", LOW: "#a3e635" } as Record<string, string>)[grade] ?? "#64748b";
  }



  // ── D3 게이지 ────────────────────────────────────────────────────────────
  const 게이지그리기 = useCallback((위험점수: number) => {
    if (!게이지SVGRef.current) return;
    const 건강점수 = Math.round(100 - 위험점수);
    const svg = d3.select(게이지SVGRef.current);
    svg.selectAll("*").remove();
    const W = 220, H = 115, cx = W / 2, cy = 102, R외 = 88, R내 = 58;
    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);
    const 각도 = (p: number) => -Math.PI / 2 + (p / 100) * Math.PI;
    const arc = d3.arc<{ startAngle: number; endAngle: number }>().innerRadius(R내).outerRadius(R외).cornerRadius(4);

    g.append("path").attr("d", arc({ startAngle: 각도(0), endAngle: 각도(100) }) ?? "").attr("fill", "#1e3a5f");
    ([{ s: 0, e: 34, c: "#ef4444" }, { s: 34, e: 67, c: "#f59e0b" }, { s: 67, e: 100, c: "#22c55e" }] as const).forEach(({ s, e, c }) => {
      g.append("path").attr("d", arc({ startAngle: 각도(s), endAngle: 각도(e) }) ?? "").attr("fill", c).attr("opacity", 0.28);
    });

    const 활성색 = 건강점수 < 34 ? "#ef4444" : 건강점수 < 67 ? "#f59e0b" : "#22c55e";
    const 활성arc = g.append("path").attr("fill", 활성색).attr("filter", `drop-shadow(0 0 8px ${활성색}aa)`);
    const d = { startAngle: 각도(0), endAngle: 각도(0) };
    활성arc.datum(d).attr("d", arc(d) ?? "")
      .transition().duration(600).ease(d3.easeCubicOut)
      .attrTween("d", () => {
        const i = d3.interpolate(d.endAngle, 각도(건강점수));
        return (t) => { d.endAngle = i(t); return arc(d) ?? ""; };
      });

    [0, 25, 50, 75, 100].forEach((p) => {
      const θ = 각도(p);
      g.append("line").attr("x1", (R외 + 5) * Math.sin(θ)).attr("y1", -(R외 + 5) * Math.cos(θ))
        .attr("x2", (R외 + 11) * Math.sin(θ)).attr("y2", -(R외 + 11) * Math.cos(θ))
        .attr("stroke", "#334155").attr("stroke-width", 1.5).attr("stroke-linecap", "round");
      g.append("text").attr("x", (R외 + 20) * Math.sin(θ)).attr("y", -(R외 + 20) * Math.cos(θ))
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-size", "9px").attr("fill", "#64748b").text(p);
    });

    const 바늘 = g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 0)
      .attr("stroke", "#e2e8f0").attr("stroke-width", 2.5).attr("stroke-linecap", "round");
    const L = R내 - 6;
    바늘.transition().duration(600).ease(d3.easeCubicOut)
      .attrTween("x2", () => { const i = d3.interpolate(0, L * Math.sin(각도(건강점수))); return (t) => String(i(t)); })
      .attrTween("y2", () => { const i = d3.interpolate(0, -L * Math.cos(각도(건강점수))); return (t) => String(i(t)); });

    g.append("circle").attr("r", 6).attr("fill", "#e2e8f0");
    g.append("text").attr("text-anchor", "middle").attr("y", -16)
      .attr("font-size", "28px").attr("font-weight", "800").attr("fill", 활성색).text(건강점수);
    g.append("text").attr("text-anchor", "middle").attr("y", 0)
      .attr("font-size", "10px").attr("fill", "#64748b").text("/ 100");
  }, []);

  // 슬라이더 변경 시 게이지 실시간 업데이트
  useEffect(() => {
    게이지그리기(폼.위험점수);
  }, [폼.위험점수, 게이지그리기]);

  // ── D3 공격 흐름 그래프 ───────────────────────────────────────────────────
  const 네트워크그래프그리기 = useCallback((로그: 공격로그입력) => {
    if (!네트워크SVGRef.current) return;
    const svgEl = 네트워크SVGRef.current;
    const W = svgEl.getBoundingClientRect().width || 560;
    const H = 210;
    if (시뮬레이션Ref.current) { 시뮬레이션Ref.current.stop(); 시뮬레이션Ref.current = null; }

    const svg = d3.select(svgEl).attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H);
    svg.selectAll("*").remove();

    type NodeDef = { label: string; sub?: string; type: "attacker" | "action" | "honeypot"; step?: number };
    const nodes: NodeDef[] = [
      { label: 로그.공격자IP, sub: 로그.공격자국가 ?? "", type: "attacker" },
      ...로그.행위시퀀스.map((행위, i) => ({ label: 행위, type: "action" as const, step: i + 1 })),
      { label: "허니팟", sub: 로그.허니팟ID, type: "honeypot" },
    ];

    const N = nodes.length;
    const PAD = 52;
    const cy = H / 2 - 12;
    const R_MAIN = 26, R_ACT = 20;
    const nx = (i: number) => PAD + (i / (N - 1)) * (W - PAD * 2);

    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#0b1120").attr("rx", 10);

    const defs = svg.append("defs");
    defs.append("marker").attr("id", "arr2").attr("viewBox", "0 -4 8 8")
      .attr("refX", 7).attr("refY", 0).attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto")
      .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "#334155");
    const gf = defs.append("filter").attr("id", "glow2").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
    gf.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    gf.append("feMerge").selectAll("feMergeNode").data(["blur", "SourceGraphic"]).join("feMergeNode").attr("in", (d) => d);

    nodes.forEach((_, i) => {
      if (i >= N - 1) return;
      const r1 = nodes[i].type === "action" ? R_ACT : R_MAIN;
      const r2 = nodes[i + 1].type === "action" ? R_ACT : R_MAIN;
      svg.append("line")
        .attr("x1", nx(i) + r1 + 3).attr("y1", cy)
        .attr("x2", nx(i + 1) - r2 - 3).attr("y2", cy)
        .attr("stroke", "#1e3a5f").attr("stroke-width", 2)
        .attr("marker-end", "url(#arr2)");
    });

    nodes.forEach((node, i) => {
      const x = nx(i);
      const R = node.type === "action" ? R_ACT : R_MAIN;
      const fill   = node.type === "attacker" ? "#3f0f0f" : node.type === "honeypot" ? "#1e1b4b" : "#1e293b";
      const stroke = node.type === "attacker" ? "#ef4444" : node.type === "honeypot" ? "#6366f1" : "#334155";
      const tcolor = node.type === "attacker" ? "#ef4444" : node.type === "honeypot" ? "#6366f1" : "#94a3b8";

      svg.append("circle").attr("cx", x).attr("cy", cy).attr("r", R)
        .attr("fill", fill).attr("stroke", stroke).attr("stroke-width", 2)
        .attr("filter", node.type === "attacker" ? "url(#glow2)" : null!);

      if (node.type === "attacker" || node.type === "honeypot") {
        svg.append("text").attr("x", x).attr("y", cy + 6)
          .attr("text-anchor", "middle").attr("font-size", "17px")
          .text(node.type === "attacker" ? "⚠️" : "🍯");
      } else {
        svg.append("text").attr("x", x).attr("y", cy + 5)
          .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
          .attr("font-size", "14px").attr("font-weight", "800").attr("fill", "#64748b")
          .text(String(node.step));
      }

      const lY = cy + R + 14;
      const label = node.label;
      const maxLen = 5;
      if (node.type === "action" && label.length > maxLen) {
        svg.append("text").attr("x", x).attr("y", lY)
          .attr("text-anchor", "middle").attr("font-size", "9.5px").attr("font-weight", "600").attr("fill", tcolor)
          .text(label.slice(0, maxLen));
        svg.append("text").attr("x", x).attr("y", lY + 12)
          .attr("text-anchor", "middle").attr("font-size", "9.5px").attr("font-weight", "600").attr("fill", tcolor)
          .text(label.slice(maxLen));
      } else {
        svg.append("text").attr("x", x).attr("y", lY)
          .attr("text-anchor", "middle").attr("font-size", "10px").attr("font-weight", "600").attr("fill", tcolor)
          .text(label);
      }
      if (node.sub) {
        svg.append("text").attr("x", x).attr("y", lY + (node.type === "action" && label.length > maxLen ? 25 : 13))
          .attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "#475569")
          .text(node.sub.length > 11 ? node.sub.slice(0, 11) + "…" : node.sub);
      }
    });

    const bullet = svg.append("circle").attr("r", 5).attr("fill", "#ef4444").attr("opacity", 0)
      .style("filter", "drop-shadow(0 0 6px #ef4444)");
    function moveBullet(step: number) {
      if (step >= N - 1) { setTimeout(() => moveBullet(0), 900); return; }
      bullet.attr("cx", nx(step)).attr("cy", cy).attr("opacity", 1)
        .transition().duration(550).ease(d3.easeLinear)
        .attr("cx", nx(step + 1))
        .on("end", () => moveBullet(step + 1));
    }
    setTimeout(() => moveBullet(0), 300);
  }, []);

  // IP + 시퀀스 입력 시 그래프 실시간 미리보기
  const 미리보기로그 = useMemo<공격로그입력 | null>(() => {
    if (!폼.공격자IP.trim() || 행위시퀀스.length === 0) return null;
    return {
      사건ID: 폼.사건ID || "PREVIEW",
      허니팟ID: 폼.허니팟ID || "honeypot-01",
      발생시각: 폼.발생시각 || new Date().toISOString(),
      공격자IP: 폼.공격자IP.trim(),
      공격자국가: 폼.공격자국가 || undefined,
      공격자포트: 폼.공격자포트 ? Number(폼.공격자포트) : undefined,
      공격유형: 폼.공격유형,
      위험점수: 폼.위험점수,
      탐지신뢰도: 폼.탐지신뢰도,
      위험등급: 폼.위험등급,
      행위시퀀스,
      요청횟수: 폼.요청횟수,
    };
  }, [폼.공격자IP, 폼.공격자국가, 폼.허니팟ID, 폼.발생시각, 폼.사건ID, 폼.공격자포트, 폼.공격유형, 폼.위험점수, 폼.탐지신뢰도, 폼.위험등급, 행위시퀀스, 폼.요청횟수]);

  useEffect(() => {
    if (미리보기로그) {
      setShowGraph(true);
      setTimeout(() => { 네트워크그래프그리기(미리보기로그!); }, 50);
    } else {
      setShowGraph(false);
    }
  }, [미리보기로그, 네트워크그래프그리기]);

  // ── CSV 헬퍼 함수 ─────────────────────────────────────────────────────────
  function portToInfo(dstPort: number, emptyPayload: boolean): { 공격유형: 공격유형코드; 위험점수: number; 위험등급: 위험등급코드; 행위: string[] } {
    if ([22, 2222, 22227].includes(dstPort))
      return { 공격유형: "BRUTE_FORCE", 위험점수: 72, 위험등급: "HIGH", 행위: ["TCP 연결", "SSH 배너 수집", "자격증명 대입 시도"] };
    if ([9200, 9300].includes(dstPort))
      return { 공격유형: "COMMAND_INJECTION", 위험점수: 88, 위험등급: "CRITICAL", 행위: ["TCP 연결", "Elasticsearch API 탐색", "스크립트 실행 시도"] };
    if ([50070, 50075, 8020, 9000].includes(dstPort))
      return { 공격유형: "PATH_TRAVERSAL", 위험점수: 82, 위험등급: "CRITICAL", 행위: ["TCP 연결", "Hadoop NameNode 탐색", "HDFS 파일시스템 접근 시도"] };
    if (dstPort === 25565)
      return { 공격유형: "UNKNOWN", 위험점수: 52, 위험등급: "MEDIUM", 행위: ["TCP 연결", "Minecraft 서버 핑", "버전 정보 수집"] };
    if ([5222, 5223].includes(dstPort))
      return { 공격유형: "UNKNOWN", 위험점수: 55, 위험등급: "MEDIUM", 행위: ["TCP 연결", "XMPP 핸드셰이크", "서비스 탐색"] };
    if ([3306, 5432, 1433, 27017, 6379].includes(dstPort))
      return { 공격유형: "SQL_INJECTION", 위험점수: 78, 위험등급: "HIGH", 행위: ["TCP 연결", "DB 서비스 탐색", "인증 우회 시도"] };
    if ([80, 8080, 8000, 8008, 8100, 8888, 8820, 8882, 8443, 3000, 9793].includes(dstPort))
      return { 공격유형: "COMMAND_INJECTION", 위험점수: 62, 위험등급: "HIGH", 행위: ["TCP 연결", "HTTP 요청 전송", "취약점 탐색"] };
    return emptyPayload
      ? { 공격유형: "PORT_SCAN", 위험점수: 38, 위험등급: "LOW", 행위: ["TCP 연결", "포트 스캔", "서비스 식별"] }
      : { 공격유형: "PORT_SCAN", 위험점수: 48, 위험등급: "MEDIUM", 행위: ["TCP 연결", `포트 ${dstPort} 탐색`, "서비스 정보 수집"] };
  }

  function ipToCountry(ip: string): string {
    const [a, b] = ip.split(".").map(Number);
    if (a === 8 && (b === 216 || b === 218)) return "중국";
    if (a === 51 && (b === 159 || b === 158)) return "프랑스";
    if ([3, 13, 18, 23, 34, 35, 52, 54, 100, 138, 162, 135].includes(a)) return "미국";
    if ([185, 93, 178, 194, 5, 45].includes(a)) return "독일";
    return "미국";
  }

  function parseCsv(text: string): CSVRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    return lines.slice(1).map((line) => {
      const c = line.split("\t");
      return {
        timestamp: c[0]?.trim() ?? "",
        proto: c[1]?.trim() ?? "tcp",
        src_ip: c[2]?.trim() ?? "",
        src_port: c[3]?.trim() ?? "",
        dst_ip: c[4]?.trim() ?? "",
        dst_port: c[5]?.trim() ?? "",
        hash1: c[6]?.trim() ?? "",
        hash2: c[7]?.trim() ?? "",
      };
    }).filter((r) => r.src_ip);
  }

  function csvRowSelect(row: CSVRow, allRows: CSVRow[]) {
    const dstPort = parseInt(row.dst_port) || 0;
    const emptyPayload = row.hash1 === "d41d8cd98f00b204e9800998ecf8427e";
    const sameIPRows = allRows.filter((r) => r.src_ip === row.src_ip);
    const info = portToInfo(dstPort, emptyPayload);
    const country = ipToCountry(row.src_ip);

    const behaviors = [...info.행위];
    if (sameIPRows.length > 1) behaviors.push(`반복 연결 ${sameIPRows.length}회`);
    if (emptyPayload) behaviors.push("빈 페이로드 (정찰)");

    const repeatedScore = sameIPRows.length > 2 ? Math.min(info.위험점수 + 10, 99) : info.위험점수;
    const finalGrade: 위험등급코드 = repeatedScore >= 80 ? "CRITICAL" : repeatedScore >= 65 ? "HIGH" : repeatedScore >= 40 ? "MEDIUM" : "LOW";

    const tsMatch = row.timestamp.match(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/);
    const parsedTs = tsMatch ? `${tsMatch[1]}T${tsMatch[2]}` : new Date().toISOString().slice(0, 16);

    set폼((p) => ({
      ...p,
      공격자IP: row.src_ip,
      공격자포트: row.src_port,
      공격자국가: country,
      공격유형: info.공격유형,
      위험점수: repeatedScore,
      위험등급: finalGrade,
      발생시각: parsedTs,
      페이로드: emptyPayload ? "(빈 페이로드 — 정찰)" : `MD5: ${row.hash1}`,
      대상URI: `${row.dst_ip}:${row.dst_port}`,
      HTTP메서드: "POST",
    }));
    set행위시퀀스(behaviors);
    set폼오류("");
  }

  function parseDirectLine(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const c = trimmed.split("\t");
    if (c.length < 6) { set폼오류("형식 오류: 탭으로 구분된 컬럼이 6개 이상 필요합니다."); return; }
    const row: CSVRow = {
      timestamp: c[0]?.trim() ?? "",
      proto: c[1]?.trim() ?? "tcp",
      src_ip: c[2]?.trim() ?? "",
      src_port: c[3]?.trim() ?? "",
      dst_ip: c[4]?.trim() ?? "",
      dst_port: c[5]?.trim() ?? "",
      hash1: c[6]?.trim() ?? "",
      hash2: c[7]?.trim() ?? "",
    };
    if (!row.src_ip) { set폼오류("src_ip를 찾을 수 없습니다."); return; }
    setCsvRows([row]);
    setCsvSelectedIdx(0);
    csvRowSelect(row, [row]);
    set폼오류("");
  }

  // ── 분석 시작 ────────────────────────────────────────────────────────────
  async function 분석시작() {
    if (!폼.공격자IP.trim()) { set폼오류("공격자 IP 주소를 입력해주세요."); return; }
    if (행위시퀀스.length === 0) { set폼오류("행위 시퀀스를 최소 1개 이상 추가해주세요."); return; }
    if (분석중) return;
    set폼오류("");

    const 로그: 공격로그입력 = {
      사건ID: 폼.사건ID || `INC-${Date.now()}`,
      허니팟ID: 폼.허니팟ID || "honeypot-01",
      발생시각: 폼.발생시각 || new Date().toISOString(),
      공격자IP: 폼.공격자IP.trim(),
      공격자국가: 폼.공격자국가 || undefined,
      공격자포트: 폼.공격자포트 ? Number(폼.공격자포트) : undefined,
      공격유형: 폼.공격유형,
      위험점수: 폼.위험점수,
      탐지신뢰도: 폼.탐지신뢰도,
      위험등급: 폼.위험등급,
      OWASP분류: 폼.OWASP분류 || undefined,
      MITRE전술: 폼.MITRE전술 || undefined,
      페이로드: 폼.페이로드 || undefined,
      대상URI: 폼.대상URI || undefined,
      HTTP메서드: 폼.HTTP메서드 || undefined,
      사용자에이전트: 폼.사용자에이전트 || undefined,
      행위시퀀스,
      요청횟수: 폼.요청횟수,
      세션지속시간: 폼.세션지속시간 ? Number(폼.세션지속시간) : undefined,
    };

    set분석중(true);
    set분석결과(null);
    set분석오류(null);
    setShowCharts(false);
    set스트리밍텍스트("");
    setShowPDF(false);
    setShowStreaming(true);
    setShowSteps(true);
    set커서보임(true);
    결과HTML캐시Ref.current = "";
    set단계칩([
      { 이름: "사건 요약", 상태: "pending" },
      { 이름: "공격 의도", 상태: "pending" },
      { 이름: "숙련도 분석", 상태: "pending" },
      { 이름: "대응 권고", 상태: "pending" },
      { 이름: "리포트 서술", 상태: "pending" },
    ]);

    try {
      const res = await fetch("/api/analyze/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 분석유형: "전체리포트", 로그 }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try { 이벤트처리(JSON.parse(line.slice(6)) as Record<string, unknown>, 로그); } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      set분석오류(`연결 오류: ${String(e)} — 서버가 실행 중인지 확인해주세요.`);
    }

    set분석중(false);
    set커서보임(false);
  }

  function 이벤트처리(ev: Record<string, unknown>, 로그: 공격로그입력) {
    switch (ev.유형) {
      case "시작":
        set스트리밍텍스트((p) => p + `▶ ${ev.메시지}\n\n`);
        break;
      case "단계시작":
        set단계칩((prev) => prev.map((c, i) => i === (Number(ev.단계) - 1) ? { ...c, 상태: "진행중" } : c));
        set스트리밍텍스트((p) => p + `\n\n── [${ev.단계}/${ev.총단계}] ${ev.이름} ──\n`);
        break;
      case "단계완료":
        set단계칩((prev) => prev.map((c, i) => i === (Number(ev.단계) - 1) ? { ...c, 상태: "완료" } : c));
        break;
      case "토큰":
        set스트리밍텍스트((p) => p + String(ev.텍스트));
        setTimeout(() => {
          if (스트리밍본문Ref.current) 스트리밍본문Ref.current.scrollTop = 스트리밍본문Ref.current.scrollHeight;
        }, 10);
        break;
      case "완료": {
        set스트리밍텍스트((p) => p + "\n\n✅ 분석 완료");
        const 결과 = ev.결과 as Record<string, unknown>;
        const 유형 = String(ev.분석유형);
        set분석결과({ 결과, 분석유형: 유형 });

        if (유형 === "전체리포트") {
          setShowPDF(true);
          setShowCharts(true);
          setTimeout(() => {
            if (레이더SVGRef.current && 바차트SVGRef.current) {
              const 숙련도점수: Record<string, number> = { "Script Kiddie": 25, "Intermediate": 60, "Advanced": 92 };
              const 의도점수: Record<string, number> = { 정보수집: 22, 취약점탐색: 48, 침투시도: 72, 데이터탈취: 88, 서비스방해: 65 };
              const 의도r = 결과.의도분석 as Record<string, unknown> | undefined;
              const 숙련도r = 결과.숙련도분석 as Record<string, unknown> | undefined;
              const 권고r = 결과.대응권고 as Record<string, unknown> | undefined;
              const 숙련도점수값 = 숙련도점수[String(숙련도r?.등급 ?? "")] ?? 50;
              const 의도점수값 = 의도점수[String(의도r?.의도 ?? "")] ?? 50;
              const p = String(권고r?.대응우선순위 ?? "");
              const 긴급도 = p.includes("즉시") ? 95 : p.includes("24") ? 65 : 40;
              레이더차트그리기([
                { 축: "위험도", 값: 로그.위험점수 },
                { 축: "정교함", 값: 숙련도점수값 },
                { 축: "파급력", 값: 의도점수값 },
                { 축: "탐지신뢰도", 값: (로그.탐지신뢰도 || 0.8) * 100 },
                { 축: "긴급도", 값: 긴급도 },
              ]);
              바차트그리기([
                { 항목: "위험 점수", 값: 로그.위험점수, 색: "#ef4444" },
                { 항목: "탐지 신뢰도", 값: (로그.탐지신뢰도 || 0.8) * 100, 색: "#6366f1" },
                { 항목: "공격자 정교함", 값: 숙련도점수값, 색: "#f59e0b" },
                { 항목: "파급력 점수", 값: 의도점수값, 색: "#8b5cf6" },
                { 항목: "대응 긴급도", 값: 긴급도, 색: "#dc2626" },
              ]);
            }
          }, 100);
        }
        break;
      }
      case "오류":
        set분석오류(String(ev.메시지));
        break;
    }
  }

  // ── D3 레이더 차트 ───────────────────────────────────────────────────────
  function 레이더차트그리기(데이터목록: { 축: string; 값: number }[]) {
    if (!레이더SVGRef.current) return;
    const svg = d3.select(레이더SVGRef.current);
    svg.selectAll("*").remove();
    const W = 280, H = 260, cx = W / 2, cy = H / 2 + 10, R = 90;
    const N = 데이터목록.length;
    const 각도fn = (i: number) => (Math.PI * 2 * i / N) - Math.PI / 2;
    const 값to좌표 = (i: number, 값: number): [number, number] => {
      const r = (값 / 100) * R;
      return [cx + r * Math.cos(각도fn(i)), cy + r * Math.sin(각도fn(i))];
    };
    const g = svg.append("g");
    [20, 40, 60, 80, 100].forEach((p) => {
      const pts = d3.range(N).map((i) => 값to좌표(i, p));
      g.append("polygon").attr("points", pts.map((d) => d.join(",")).join(" "))
        .attr("fill", p === 100 ? "#f8fafc" : "none").attr("stroke", "#e2e8f0").attr("stroke-width", p === 100 ? 1.5 : 1);
    });
    d3.range(N).forEach((i) => {
      const [x, y] = 값to좌표(i, 100);
      g.append("line").attr("x1", cx).attr("y1", cy).attr("x2", x).attr("y2", y).attr("stroke", "#e2e8f0").attr("stroke-width", 1);
    });
    const pts = 데이터목록.map((d, i) => 값to좌표(i, d.값));
    g.append("polygon").attr("points", pts.map((d) => d.join(",")).join(" ")).attr("fill", "#6366f130").attr("stroke", "#6366f1").attr("stroke-width", 2);
    pts.forEach(([x, y]) => {
      g.append("circle").attr("cx", x).attr("cy", y).attr("r", 4).attr("fill", "#6366f1").attr("stroke", "white").attr("stroke-width", 1.5);
    });
    데이터목록.forEach((d, i) => {
      const [x, y] = 값to좌표(i, 118);
      const 정렬 = x < cx - 5 ? "end" : x > cx + 5 ? "start" : "middle";
      g.append("text").attr("x", x).attr("y", y).attr("text-anchor", 정렬).attr("dominant-baseline", "middle").attr("font-size", "11px").attr("font-weight", "700").attr("fill", "#374151").text(d.축);
      g.append("text").attr("x", x).attr("y", y + 13).attr("text-anchor", 정렬).attr("dominant-baseline", "middle").attr("font-size", "10px").attr("fill", "#6366f1").attr("font-weight", "800").text(Math.round(d.값));
    });
  }

  // ── D3 바 차트 ───────────────────────────────────────────────────────────
  function 바차트그리기(데이터목록: { 항목: string; 값: number; 색: string }[]) {
    if (!바차트SVGRef.current) return;
    const svg = d3.select(바차트SVGRef.current);
    svg.selectAll("*").remove();
    const W = 280, 여백L = 80, 여백R = 45, 여백T = 15;
    const 바높이 = 24, 바간격 = 20;
    const 바영역W = W - 여백L - 여백R;
    const g = svg.append("g").attr("transform", `translate(${여백L},${여백T})`);
    데이터목록.forEach((d, i) => {
      const y = i * (바높이 + 바간격);
      const barW = (d.값 / 100) * 바영역W;
      g.append("rect").attr("x", 0).attr("y", y).attr("width", 바영역W).attr("height", 바높이).attr("rx", 6).attr("fill", "#f1f5f9");
      g.append("rect").attr("x", 0).attr("y", y).attr("width", 0).attr("height", 바높이).attr("rx", 6).attr("fill", d.색).attr("opacity", 0.85)
        .transition().duration(800).delay(i * 100).ease(d3.easeCubicOut).attr("width", barW);
      g.append("text").attr("x", -8).attr("y", y + 바높이 / 2).attr("text-anchor", "end").attr("dominant-baseline", "middle").attr("font-size", "11px").attr("font-weight", "600").attr("fill", "#374151").text(d.항목);
      g.append("text").attr("x", 바영역W + 6).attr("y", y + 바높이 / 2).attr("dominant-baseline", "middle").attr("font-size", "11px").attr("font-weight", "800").attr("fill", d.색).text(Math.round(d.값));
    });
  }

  // ── PDF 저장 ─────────────────────────────────────────────────────────────
  async function PDF저장() {
    const { default: html2canvas } = await import("html2canvas");
    const { jsPDF } = await import("jspdf");
    const 시각 = new Date().toLocaleString("ko-KR");
    const 임시div = document.createElement("div");
    임시div.style.cssText = "position:absolute;top:0;left:0;width:794px;background:#ffffff;padding:40px 44px;z-index:9999;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#1a1a2e;box-sizing:border-box;";
    임시div.innerHTML = `
      <div style="padding-bottom:16px;border-bottom:3px solid #0f172a;margin-bottom:24px;">
        <div style="font-size:1.3rem;font-weight:800;color:#0f172a;">🍯 정사평 — 허니팟 공격 분석 리포트</div>
        <div style="font-size:0.8rem;color:#64748b;margin-top:5px;">IP: ${폼.공격자IP} · 유형: ${폼.공격유형} · 생성: ${시각}</div>
      </div>
      <div>${결과HTML캐시Ref.current}</div>
    `;
    document.body.appendChild(임시div);
    const 이전스크롤Y = window.scrollY;
    window.scrollTo(0, 0);
    try {
      const canvas = await html2canvas(임시div, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", scrollX: 0, scrollY: 0, windowWidth: 794 });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 12, contentW = 210 - margin * 2, contentH = 297 - margin * 2;
      const totalImgH = (canvas.height / canvas.width) * contentW;
      const totalPages = Math.ceil(totalImgH / contentH);
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();
        const srcY = Math.round((i * contentH / totalImgH) * canvas.height);
        const srcH = Math.round(Math.min((contentH / totalImgH) * canvas.height, canvas.height - srcY));
        const destH = (srcH / canvas.height) * totalImgH;
        const slice = document.createElement("canvas");
        slice.width = canvas.width; slice.height = Math.max(srcH, 1);
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, contentW, destH);
      }
      pdf.save(`정사평_공격분석_${폼.공격자IP}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      document.body.removeChild(임시div);
      window.scrollTo(0, 이전스크롤Y);
    }
  }

  // ── 파생값 ──────────────────────────────────────────────────────────────
  const 건강점수 = Math.round(100 - 폼.위험점수);
  const 활성색 = 건강점수 < 34 ? "#ef4444" : 건강점수 < 67 ? "#f59e0b" : "#22c55e";
  const 건강라벨 = 건강점수 < 34 ? "위험" : 건강점수 < 67 ? "주의" : "양호";
  const 단계이름 = ["사건 요약", "공격 의도", "숙련도 분석", "대응 권고", "리포트 서술"];

  const 행위추가 = () => {
    if (새행위.trim()) { set행위시퀀스((p) => [...p, 새행위.trim()]); set새행위(""); }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { background: #0d1526; color: #e2e8f0; min-height: 100vh; }
        header { background: #080d17; color: white; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; height: 60px; box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.5); border-bottom: 1px solid rgba(99,102,241,0.2); }
        .헤더왼쪽 { display: flex; align-items: center; gap: 12px; }
        .헤더로고 { font-size: 1.5rem; }
        .헤더제목 { font-size: 1.05rem; font-weight: 700; color: #f1f5f9; }
        .헤더제목 span { color: #fbbf24; }
        .헤더부제 { font-size: 0.72rem; color: #475569; margin-top: 1px; letter-spacing: 0.02em; }
        .서버상태칩 { display: flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 5px 12px; font-size: 0.78rem; color: #64748b; }
        .레이아웃 { display: grid; grid-template-columns: 360px 1fr; gap: 20px; padding: 20px 28px; max-width: 1440px; margin: 0 auto; }
        .카드 { background: #ffffff; border-radius: 14px; padding: 18px 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.08); }
        .섹션헤더 { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
        .섹션번호 { width: 22px; height: 22px; border-radius: 50%; background: #6366f1; color: white; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 10px rgba(99,102,241,0.5); }
        .섹션제목 { font-size: 0.88rem; font-weight: 700; color: #cbd5e1; }
        .섹션설명 { font-size: 0.75rem; color: #475569; margin-left: auto; }
        .왼쪽패널 { display: flex; flex-direction: column; gap: 12px; max-height: calc(100vh - 80px); overflow-y: auto; padding-right: 2px; }
        .왼쪽패널::-webkit-scrollbar { width: 4px; }
        .왼쪽패널::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .사이드카드 { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 16px 18px; }

        /* ── 입력 폼 ── */
        .폼섹션 { margin-bottom: 14px; }
        .폼섹션:last-child { margin-bottom: 0; }
        .폼섹션제목 { font-size: 0.67rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .폼그룹 { margin-bottom: 8px; }
        .폼그룹:last-child { margin-bottom: 0; }
        .폼라벨 { font-size: 0.7rem; font-weight: 600; color: #64748b; margin-bottom: 4px; display: block; }
        .폼입력 { width: 100%; padding: 7px 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; background: rgba(255,255,255,0.05); color: #e2e8f0; font-size: 0.83rem; outline: none; font-family: inherit; transition: border-color 0.15s, background 0.15s; }
        .폼입력:focus { border-color: #6366f1; background: rgba(99,102,241,0.1); }
        .폼입력::placeholder { color: #2d3f52; }
        select.폼입력 option { background: #0f172a; color: #e2e8f0; }
        .폼행 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .폼행3 { display: grid; grid-template-columns: 1fr 80px; gap: 8px; }
        textarea.폼입력 { resize: vertical; min-height: 56px; line-height: 1.5; }
        .슬라이더래퍼 { display: flex; align-items: center; gap: 8px; }
        .슬라이더 { flex: 1; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); outline: none; cursor: pointer; }
        .슬라이더::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #6366f1; cursor: pointer; box-shadow: 0 0 6px rgba(99,102,241,0.6); }
        .슬라이더값 { font-size: 0.8rem; font-weight: 700; color: #e2e8f0; width: 36px; text-align: right; flex-shrink: 0; }
        .위험등급그룹 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
        .위험등급버튼 { padding: 5px 2px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04); color: #475569; font-size: 0.7rem; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .위험등급버튼.선택됨.low { border-color: #a3e635; color: #a3e635; background: rgba(163,230,53,0.1); }
        .위험등급버튼.선택됨.medium { border-color: #fbbf24; color: #fbbf24; background: rgba(251,191,36,0.1); }
        .위험등급버튼.선택됨.high { border-color: #fb923c; color: #fb923c; background: rgba(251,146,60,0.1); }
        .위험등급버튼.선택됨.critical { border-color: #f87171; color: #f87171; background: rgba(248,113,113,0.1); }
        .태그컨테이너 { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; min-height: 20px; }
        .태그 { display: inline-flex; align-items: center; gap: 4px; background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); border-radius: 20px; padding: 2px 9px; font-size: 0.74rem; color: #a5b4fc; }
        .태그제거버튼 { background: none; border: none; cursor: pointer; color: #6366f1; font-size: 1rem; line-height: 1; padding: 0; margin-left: 1px; opacity: 0.7; }
        .태그제거버튼:hover { opacity: 1; }
        .입력행 { display: flex; gap: 6px; }
        .추가버튼 { padding: 7px 12px; border-radius: 7px; border: none; background: rgba(99,102,241,0.2); color: #a5b4fc; font-size: 1rem; cursor: pointer; transition: background 0.15s; flex-shrink: 0; font-weight: 700; }
        .추가버튼:hover { background: rgba(99,102,241,0.35); }
        .폼오류박스 { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 7px; padding: 8px 10px; font-size: 0.78rem; color: #f87171; margin-top: 10px; }
        .고급토글 { display: flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; color: #475569; font-size: 0.72rem; font-weight: 600; padding: 4px 0; font-family: inherit; }
        .고급토글:hover { color: #94a3b8; }

        /* ── 게이지 ── */
        .게이지카드제목 { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 0.88rem; font-weight: 700; color: #cbd5e1; }
        .게이지레이블 { text-align: center; font-size: 0.77rem; color: #64748b; margin-top: 6px; }

        /* ── 버튼 ── */
        #분석시작버튼 { width: 100%; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 20px rgba(99,102,241,0.4); letter-spacing: 0.02em; }
        #분석시작버튼:hover:not(:disabled) { background: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,0.55); }
        #분석시작버튼:disabled { background: #1e293b; color: #475569; cursor: not-allowed; transform: none; box-shadow: none; border: 1px solid rgba(255,255,255,0.06); }
        #PDF버튼 { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.1); color: #a5b4fc; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        #PDF버튼:hover { background: rgba(99,102,241,0.2); border-color: #6366f1; box-shadow: 0 4px 16px rgba(99,102,241,0.25); transform: translateY(-1px); }

        /* ── 오른쪽 패널 ── */
        .오른쪽패널 { display: flex; flex-direction: column; gap: 14px; }
        .그래프카드헤더 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .그래프카드헤더 .제목 { font-size: 0.88rem; font-weight: 700; color: #1e293b; }
        #네트워크SVG { width: 100%; height: 210px; border-radius: 10px; }
        .그래프범례 { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; align-items: center; }
        .범례항목 { display: flex; align-items: center; gap: 5px; font-size: 0.74rem; color: #64748b; }
        .범례점 { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

        /* ── 단계 칩 ── */
        .단계목록 { display: flex; gap: 8px; flex-wrap: wrap; }
        .단계칩 { padding: 6px 14px; border-radius: 20px; font-size: 0.76rem; font-weight: 700; background: #f1f5f9; color: #94a3b8; transition: all 0.3s; border: 1.5px solid transparent; }
        .단계칩.진행중 { background: #fffbeb; color: #92400e; border-color: #fcd34d; animation: pulse 1.5s infinite; box-shadow: 0 0 12px rgba(251,191,36,0.3); }
        .단계칩.완료 { background: #f0fdf4; color: #166534; border-color: #86efac; box-shadow: 0 0 8px rgba(34,197,94,0.2); }

        /* ── 스트리밍 ── */
        .스트리밍헤더 { background: #080d17; border-radius: 12px 12px 0 0; padding: 11px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(99,102,241,0.2); }
        .스트리밍헤더왼쪽 { display: flex; align-items: center; gap: 10px; }
        .터미널버튼그룹 { display: flex; gap: 5px; }
        .터미널버튼 { width: 11px; height: 11px; border-radius: 50%; }
        .스트리밍점 { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: pulse 1.5s infinite; margin-left: 8px; }
        .스트리밍제목 { color: #64748b; font-size: 0.78rem; font-family: "SF Mono","Fira Code",monospace; }
        .스트리밍배지 { background: rgba(99,102,241,0.25); color: #818cf8; font-size: 0.68rem; font-weight: 800; padding: 3px 10px; border-radius: 10px; border: 1px solid rgba(99,102,241,0.3); letter-spacing: 0.08em; }
        .스트리밍본문 { background: #020817; border-radius: 0 0 12px 12px; padding: 16px 20px; height: 260px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.04); border-top: none; }
        .스트리밍본문::-webkit-scrollbar { width: 4px; }
        .스트리밍본문::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        #스트리밍텍스트 { font-family: "SF Mono","Fira Code","JetBrains Mono",monospace; font-size: 0.82rem; color: #7dd3fc; line-height: 1.8; white-space: pre-wrap; word-break: break-all; }
        .커서 { display: inline-block; width: 7px; height: 14px; background: #7dd3fc; animation: 깜빡 0.8s infinite; vertical-align: text-bottom; border-radius: 1px; }
        @keyframes 깜빡 { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

        /* ── 결과 카드 ── */
        .결과카드헤더 { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9; }
        .결과카드제목 { font-size: 1.05rem; font-weight: 800; color: #0f172a; }
        .결과카드부제 { font-size: 0.75rem; background: #f0fdf4; color: #166534; padding: 3px 10px; border-radius: 20px; font-weight: 600; margin-left: auto; }
        .결과섹션라벨 { font-size: 0.78rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
        .요약카드 { background: linear-gradient(135deg,#f8fafc,#f0f4ff); border-radius: 12px; padding: 18px; border: 1px solid #e2e8f0; }
        .요약텍스트 { font-size: 0.96rem; line-height: 1.85; color: #1e293b; margin-bottom: 16px; }
        .포인트목록 { list-style: none; display: flex; flex-direction: column; gap: 7px; }
        .포인트목록 li { display: flex; align-items: flex-start; gap: 8px; font-size: 0.86rem; color: #374151; line-height: 1.6; }
        .포인트목록 li::before { content: "▸"; color: #6366f1; flex-shrink: 0; margin-top: 2px; font-size: 0.78rem; }
        .공격명배지 { display: inline-flex; align-items: center; gap: 5px; margin-top: 14px; background: #eef2ff; color: #3730a3; padding: 5px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; border: 1px solid #c7d2fe; }
        .결과그리드 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .분석칩카드 { background: linear-gradient(135deg,#f8fafc,#f4f6ff); border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; }
        .분석칩섹션제목 { font-size: 0.72rem; font-weight: 800; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
        .큰배지 { font-size: 0.9rem; font-weight: 800; padding: 6px 16px; border-radius: 8px; display: inline-block; margin-bottom: 12px; }
        .큰배지.정보수집,.큰배지.취약점탐색 { background: #dbeafe; color: #1d4ed8; }
        .큰배지.침투시도,.큰배지.데이터탈취 { background: #fee2e2; color: #dc2626; }
        .큰배지.서비스방해 { background: #ffedd5; color: #c2410c; }
        .큰배지.불명 { background: #f1f5f9; color: #64748b; }
        .큰배지.초보 { background: #dcfce7; color: #166534; }
        .큰배지.중급 { background: #fef9c3; color: #92400e; }
        .큰배지.고급 { background: #fee2e2; color: #dc2626; }
        .신뢰도바컨테이너 { margin: 10px 0 8px; }
        .라벨 { font-size: 0.74rem; color: #64748b; margin-bottom: 5px; display: flex; justify-content: space-between; font-weight: 500; }
        .신뢰도바 { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .채움 { height: 100%; background: linear-gradient(90deg,#6366f1,#8b5cf6); border-radius: 4px; transition: width 0.9s cubic-bezier(0.4,0,0.2,1); }
        .근거설명 { font-size: 0.81rem; color: #475569; line-height: 1.65; margin-top: 6px; }
        .권고카드 { background: #f8fafc; border-radius: 12px; padding: 16px; }
        .우선순위행 { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 0.8rem; color: #64748b; font-weight: 500; }
        .권고섹션제목 { font-size: 0.76rem; font-weight: 700; margin-bottom: 7px; }
        .권고섹션제목.즉각 { color: #dc2626; }
        .권고섹션제목.장기 { color: #2563eb; }
        .권고목록 { list-style: none; display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .권고목록 li { font-size: 0.81rem; color: #374151; padding: 8px 11px; border-radius: 8px; line-height: 1.55; }
        .권고목록.즉각 li { background: #fff1f2; border-left: 3px solid #f87171; }
        .권고목록.장기 li { background: #eff6ff; border-left: 3px solid #60a5fa; }
        .우선순위배지 { font-size: 0.74rem; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
        .우선순위배지.즉시 { background: #fee2e2; color: #b91c1c; }
        .우선순위배지.시간 { background: #fef9c3; color: #92400e; }
        .우선순위배지.주 { background: #dbeafe; color: #1d4ed8; }
        .리포트서술박스 { background: linear-gradient(135deg,#f0f9ff,#f8f4ff); border-left: 4px solid #6366f1; padding: 16px; border-radius: 0 12px 12px 0; font-size: 0.87rem; line-height: 1.85; color: #1e293b; }
        .결과구분선 { border: none; border-top: 2px solid #f1f5f9; margin: 16px 0; }
        .오류박스 { background: #fff1f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 14px 16px; color: #dc2626; font-size: 0.85rem; line-height: 1.6; }

        /* ── 빈 상태 ── */
        .빈상태 { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; color: #94a3b8; text-align: center; min-height: 260px; }
        .빈상태아이콘 { font-size: 3.5rem; margin-bottom: 16px; opacity: 0.5; }
        .빈상태제목 { font-size: 1rem; font-weight: 700; color: #64748b; margin-bottom: 8px; }
        .빈상태설명 { font-size: 0.82rem; line-height: 1.7; }
        .빈상태힌트 { margin-top: 20px; display: flex; flex-direction: column; gap: 7px; background: #f8fafc; border-radius: 10px; padding: 12px 18px; text-align: left; width: 100%; max-width: 300px; }
        .힌트행 { display: flex; align-items: center; gap: 8px; font-size: 0.78rem; color: #64748b; }
        .힌트번호 { width: 18px; height: 18px; border-radius: 50%; background: #6366f1; color: white; font-size: 0.65rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* ── CSV 테이블 ── */
        .csv업로드구역 { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px dashed rgba(99,102,241,0.25); border-radius: 10px; padding: 14px 12px; cursor: pointer; transition: all 0.2s; gap: 5px; }
        .csv업로드구역:hover { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.05); }
        .csv업로드아이콘 { font-size: 1.5rem; }
        .csv업로드텍스트 { font-size: 0.75rem; color: #475569; text-align: center; }
        .csv업로드서브 { font-size: 0.67rem; color: #334155; }
        .csv테이블래퍼 { overflow-y: auto; max-height: 230px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); margin-top: 10px; }
        .csv테이블래퍼::-webkit-scrollbar { width: 3px; }
        .csv테이블래퍼::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .csv테이블 { width: 100%; border-collapse: collapse; font-size: 0.71rem; table-layout: fixed; }
        .csv테이블 th { position: sticky; top: 0; background: #0b1120; color: #475569; font-weight: 700; padding: 6px 7px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; overflow: hidden; }
        .csv테이블 td { padding: 5px 7px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; transition: background 0.1s; }
        .csv테이블 tr:hover td { background: rgba(255,255,255,0.04); }
        .csv테이블 tr.csv선택됨 td { background: rgba(99,102,241,0.15); color: #a5b4fc; }
        .csv초기화버튼 { background: none; border: none; cursor: pointer; color: #475569; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-family: inherit; }
        .csv초기화버튼:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
        .csv위험배지 { display: inline-block; font-size: 0.62rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
        .csv위험배지.LOW { background: rgba(163,230,53,0.15); color: #a3e635; }
        .csv위험배지.MEDIUM { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .csv위험배지.HIGH { background: rgba(251,146,60,0.15); color: #fb923c; }
        .csv위험배지.CRITICAL { background: rgba(248,113,113,0.15); color: #f87171; }

        /* ── 프로파일 카드 ── */
        .프로파일그리드 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
        .프로파일항목 { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px 10px; }
        .프로파일항목라벨 { font-size: 0.64rem; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
        .프로파일항목값 { font-size: 0.82rem; font-weight: 700; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .프로파일IP { font-family: "SF Mono","Fira Code",monospace; font-size: 1rem; font-weight: 800; color: #e2e8f0; margin-bottom: 10px; }
        .프로파일위험배지 { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 800; margin-bottom: 12px; }
        .프로파일시퀀스 { display: flex; flex-wrap: wrap; gap: 5px; }
        .프로파일시퀀스태그 { font-size: 0.7rem; padding: 3px 9px; border-radius: 12px; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); color: #818cf8; }
        .차트섹션제목 { font-size: 0.75rem; font-weight: 700; color: #475569; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .입력모드탭 { display: flex; gap: 0; margin-bottom: 10px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
        .입력모드탭버튼 { flex: 1; padding: 6px; border: none; background: rgba(255,255,255,0.03); color: #475569; font-size: 0.72rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .입력모드탭버튼.활성 { background: rgba(99,102,241,0.18); color: #a5b4fc; }
        .직접입력구역 { display: flex; flex-direction: column; gap: 7px; }
        .직접입력텍스트 { width: 100%; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; background: rgba(255,255,255,0.04); color: #e2e8f0; font-size: 0.75rem; font-family: "SF Mono","Fira Code",monospace; outline: none; resize: vertical; min-height: 72px; line-height: 1.6; transition: border-color 0.15s; }
        .직접입력텍스트:focus { border-color: #6366f1; background: rgba(99,102,241,0.08); }
        .직접입력텍스트::placeholder { color: #2d3f52; font-size: 0.68rem; }
        .직접입력버튼 { padding: 7px 14px; border-radius: 7px; border: none; background: rgba(99,102,241,0.2); color: #a5b4fc; font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; align-self: flex-end; }
        .직접입력버튼:hover { background: rgba(99,102,241,0.35); }
      `}</style>

      <header>
        <div className="헤더왼쪽">
          <span className="헤더로고">🍯</span>
          <div>
            <div className="헤더제목"><span>허니팟</span> 공격 분석 시스템</div>
            <div className="헤더부제">AI 기반 사이버 공격 자동 분석 · Powered by Claude API</div>
          </div>
        </div>
        <div className="서버상태칩">
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: 서버상태.연결됨 ? "#22c55e" : "#ef4444", boxShadow: 서버상태.연결됨 ? "0 0 6px #22c55e80" : undefined, flexShrink: 0 }} />
          <span>{서버상태.연결됨 ? `AI 서버 연결됨 · ${서버상태.모델}` : "서버 연결 안됨"}</span>
        </div>
      </header>

      <div className="레이아웃">
        {/* ── 왼쪽 패널: 입력 폼 ── */}
        {/* 히든 파일 인풋 */}
        <input
          ref={csvFileInputRef} type="file" accept=".csv,.tsv,.txt"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              const rows = parseCsv(String(ev.target?.result ?? ""));
              setCsvRows(rows);
              setCsvSelectedIdx(null);
            };
            reader.readAsText(file);
            e.target.value = "";
          }}
        />

        <div className="왼쪽패널">
          {/* CSV 로그 불러오기 */}
          <div className="사이드카드">
            <div className="섹션헤더">
              <div className="섹션번호">📂</div>
              <span className="섹션제목">로그 입력</span>
              {csvRows.length > 0 && (
                <button className="csv초기화버튼" onClick={() => { setCsvRows([]); setCsvSelectedIdx(null); setDirectInput(""); }}>✕ 초기화</button>
              )}
            </div>

            {/* 입력 모드 탭 */}
            <div className="입력모드탭">
              <button className={`입력모드탭버튼 ${inputMode === "file" ? "활성" : ""}`} onClick={() => setInputMode("file")}>
                📂 파일 업로드
              </button>
              <button className={`입력모드탭버튼 ${inputMode === "text" ? "활성" : ""}`} onClick={() => setInputMode("text")}>
                ✏️ 직접 입력
              </button>
            </div>

            {inputMode === "text" ? (
              <div className="직접입력구역">
                <textarea
                  className="직접입력텍스트"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  placeholder={"탭 구분 로그 한 줄 붙여넣기\n예: timestamp\ttcp\tsrc_ip\tsrc_port\tdst_ip\tdst_port\thash1\thash2"}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); parseDirectLine(directInput); } }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.67rem", color: "#334155" }}>Ctrl+Enter 또는 버튼으로 파싱</span>
                  <button className="직접입력버튼" onClick={() => parseDirectLine(directInput)}>파싱 →</button>
                </div>
                {csvRows.length > 0 && csvSelectedIdx !== null && (
                  <div style={{ fontSize: "0.72rem", color: "#475569", background: "rgba(99,102,241,0.08)", borderRadius: 6, padding: "5px 8px" }}>
                    ✅ <strong style={{ color: "#a5b4fc" }}>{csvRows[0].src_ip}</strong> 파싱 완료 — 아래 분석 시작
                  </div>
                )}
              </div>
            ) : csvRows.length === 0 ? (
              <div className="csv업로드구역" onClick={() => csvFileInputRef.current?.click()}>
                <div className="csv업로드아이콘">📋</div>
                <div className="csv업로드텍스트">CSV / TSV 파일을 클릭하여 불러오기</div>
                <div className="csv업로드서브">timestamp · proto · src_ip · dst_port · hash 컬럼</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "0.72rem", color: "#475569", marginBottom: 4 }}>
                  총 <strong style={{ color: "#a5b4fc" }}>{csvRows.length}</strong>건 · 행을 클릭하면 폼이 자동 채워집니다
                </div>
                <div className="csv테이블래퍼">
                  <table className="csv테이블">
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>src_ip</th>
                        <th style={{ width: "15%" }}>→포트</th>
                        <th style={{ width: "20%" }}>시각</th>
                        <th style={{ width: "15%" }}>위험</th>
                        <th style={{ width: "20%" }}>src_port</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row, i) => {
                        const dstPort = parseInt(row.dst_port) || 0;
                        const emptyHash = row.hash1 === "d41d8cd98f00b204e9800998ecf8427e";
                        const info = portToInfo(dstPort, emptyHash);
                        const timeStr = row.timestamp.match(/(\d{2}:\d{2}:\d{2})/)?.[1] ?? "";
                        return (
                          <tr key={i} className={csvSelectedIdx === i ? "csv선택됨" : ""} onClick={() => { setCsvSelectedIdx(i); csvRowSelect(row, csvRows); }}>
                            <td title={row.src_ip}>{row.src_ip}</td>
                            <td>{row.dst_port}</td>
                            <td>{timeStr}</td>
                            <td><span className={`csv위험배지 ${info.위험등급}`}>{info.위험등급}</span></td>
                            <td>{row.src_port}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {폼오류 && <div className="폼오류박스" style={{ margin: "0 0 4px" }}>⚠️ {폼오류}</div>}

          {/* 보안 건강 점수 게이지 */}
          <div className="사이드카드" style={{ padding: "14px 18px 10px" }}>
            <div className="게이지카드제목">🛡️ 보안 건강 점수</div>
            <svg ref={게이지SVGRef} viewBox="0 0 220 115" style={{ display: "block", width: "100%", overflow: "visible" }} />
            <div className="게이지레이블">
              보안 상태: <strong style={{ color: 활성색 }}>{건강라벨}</strong> &nbsp;·&nbsp; 위험 점수 {폼.위험점수}/100
            </div>
          </div>

          <button id="분석시작버튼" onClick={분석시작} disabled={분석중}>
            <span>{분석중 ? "⏳" : "🔍"}</span>
            <span>{분석중 ? "AI가 분석하는 중..." : "AI 분석 시작"}</span>
          </button>

          {showPDF && (
            <button id="PDF버튼" onClick={PDF저장}>
              <span>📄</span><span>리포트 PDF 저장</span>
            </button>
          )}
        </div>

        {/* ── 오른쪽 패널 ── */}
        <div className="오른쪽패널">
          {/* ── 공격자 IP 프로파일 ── */}
          {폼.공격자IP && (
            <div className="카드" style={{ padding: "16px 20px 16px" }}>
              {(() => {
                const cloud = detectCloud(폼.공격자IP);
                const repeatCount = csvRows.filter(r => r.src_ip === 폼.공격자IP).length;
                const rc = riskColor(폼.위험등급);
                const isRecon = 폼.페이로드?.includes("빈 페이로드");
                return (
                  <>
                    <div className="그래프카드헤더" style={{ marginBottom: 12 }}>
                      <span className="제목">🔍 공격자 프로파일</span>
                      <span style={{ fontSize: "0.7rem", color: "#475569" }}>
                        {cloud.icon} {cloud.name}
                      </span>
                    </div>
                    <div className="프로파일IP">{폼.공격자IP}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <span className="프로파일위험배지" style={{ background: rc + "18", border: `1px solid ${rc}40`, color: rc }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: rc, flexShrink: 0, display: "inline-block" }} />
                        {폼.위험등급}
                      </span>
                      {isRecon && <span style={{ fontSize: "0.7rem", background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)", color: "#94a3b8", padding: "3px 9px", borderRadius: 12 }}>정찰 (빈 페이로드)</span>}
                    </div>
                    <div className="프로파일그리드">
                      <div className="프로파일항목">
                        <div className="프로파일항목라벨">국가</div>
                        <div className="프로파일항목값">{폼.공격자국가}</div>
                      </div>
                      <div className="프로파일항목">
                        <div className="프로파일항목라벨">위험 점수</div>
                        <div className="프로파일항목값" style={{ color: rc }}>{폼.위험점수} / 100</div>
                      </div>
                      <div className="프로파일항목">
                        <div className="프로파일항목라벨">포트</div>
                        <div className="프로파일항목값">{폼.공격자포트 || "—"}</div>
                      </div>
                      <div className="프로파일항목">
                        <div className="프로파일항목라벨">반복 접속</div>
                        <div className="프로파일항목값" style={{ color: repeatCount > 2 ? "#f87171" : "#cbd5e1" }}>
                          {repeatCount}회 {repeatCount > 2 ? "⚠️" : ""}
                        </div>
                      </div>
                      <div className="프로파일항목">
                        <div className="프로파일항목라벨">공격 유형</div>
                        <div className="프로파일항목값" style={{ fontSize: "0.74rem" }}>{폼.공격유형.replace(/_/g, " ")}</div>
                      </div>
                      <div className="프로파일항목">
                        <div className="프로파일항목라벨">대상</div>
                        <div className="프로파일항목값" style={{ fontSize: "0.74rem", fontFamily: "monospace" }}>{폼.대상URI || "—"}</div>
                      </div>
                    </div>
                    {행위시퀀스.length > 0 && (
                      <>
                        <div style={{ fontSize: "0.67rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>행위 시퀀스</div>
                        <div className="프로파일시퀀스">
                          {행위시퀀스.map((h, i) => (
                            <span key={i} className="프로파일시퀀스태그">{i + 1}. {h}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}


          {/* 공격 흐름 그래프 (IP + 시퀀스 입력 시 실시간 표시) */}
          {showGraph && (
            <div className="카드" style={{ padding: "16px 20px 14px" }}>
              <div className="그래프카드헤더">
                <span className="제목">🕸️ 공격 흐름 시각화</span>
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>실시간 미리보기</span>
              </div>
              <svg ref={네트워크SVGRef} id="네트워크SVG" />
              <div className="그래프범례">
                <div className="범례항목"><div className="범례점" style={{ background: "#3f0f0f", border: "2px solid #ef4444" }} />공격자</div>
                <div className="범례항목"><div className="범례점" style={{ background: "#1e293b", border: "2px solid #334155" }} />공격 단계</div>
                <div className="범례항목"><div className="범례점" style={{ background: "#1e1b4b", border: "2px solid #6366f1" }} />허니팟</div>
                <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#94a3b8" }}>● 빨간 점: 공격 진행 흐름</div>
              </div>
            </div>
          )}

          {/* 분석 진행 단계 */}
          {showSteps && (
            <div className="카드">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>⏳ 분석 진행 단계</span>
              </div>
              <div className="단계목록">
                {단계이름.map((n, i) => (
                  <div key={n} className={`단계칩 ${단계칩[i]?.상태 ?? "pending"}`}>{i + 1}. {n}</div>
                ))}
              </div>
            </div>
          )}

          {/* 스트리밍 */}
          {showStreaming && (
            <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <div className="스트리밍헤더">
                <div className="스트리밍헤더왼쪽">
                  <div className="터미널버튼그룹">
                    <div className="터미널버튼" style={{ background: "#ef4444" }} />
                    <div className="터미널버튼" style={{ background: "#f59e0b" }} />
                    <div className="터미널버튼" style={{ background: "#22c55e" }} />
                  </div>
                  <div className="스트리밍점" />
                  <span className="스트리밍제목">AI 실시간 추론 중...</span>
                </div>
                <span className="스트리밍배지">LIVE</span>
              </div>
              <div className="스트리밍본문" ref={스트리밍본문Ref}>
                <span id="스트리밍텍스트">{스트리밍텍스트}</span>
                {커서보임 && <span className="커서" />}
              </div>
            </div>
          )}

          {/* 분석 결과 */}
          <분석결과카드 분석결과={분석결과} 오류={분석오류} />

          {/* 위협 분석 차트 */}
          {showCharts && (
            <div className="카드" style={{ marginBottom: 0 }}>
              <div className="결과카드헤더" style={{ marginBottom: 12 }}>
                <span className="결과카드제목">📊 위협 분석 차트</span>
                <span className="결과카드부제">AI 분석 지표 시각화</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 10, textAlign: "center" }}>🕸️ 위협 레이더</div>
                  <svg ref={레이더SVGRef} viewBox="0 0 280 260" style={{ width: "100%", display: "block" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", marginBottom: 10, textAlign: "center" }}>📈 분석 지표</div>
                  <svg ref={바차트SVGRef} viewBox="0 0 280 230" style={{ width: "100%", display: "block" }} />
                </div>
              </div>
            </div>
          )}

          {/* 빈 상태 */}
          {!폼.공격자IP && !showStreaming && !분석결과 && (
            <div className="카드 빈상태">
              <div className="빈상태아이콘">🛡️</div>
              <div className="빈상태제목">공격 로그를 입력하고 분석을 시작하세요</div>
              <p className="빈상태설명">왼쪽 폼에 공격 데이터를 입력하면<br />지도와 그래프가 실시간으로 업데이트됩니다.</p>
              <div className="빈상태힌트">
                <div className="힌트행"><div className="힌트번호">1</div>공격자 IP와 발원 국가를 입력</div>
                <div className="힌트행"><div className="힌트번호">2</div>공격 유형과 위험도를 설정</div>
                <div className="힌트행"><div className="힌트번호">3</div>행위 시퀀스를 추가 (그래프 자동 생성)</div>
                <div className="힌트행"><div className="힌트번호">4</div>AI 분석 시작 → 전체 리포트 생성</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
