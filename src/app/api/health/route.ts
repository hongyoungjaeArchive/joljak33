// GET /api/health — 서버 상태 확인

import { NextResponse } from "next/server";
import { 분석서비스 } from "@/lib/llm-service";

export async function GET() {
  const claude연결 = await 분석서비스.서버상태확인();
  return NextResponse.json({
    서비스상태: claude연결 ? "정상" : "Claude API 키 없음",
    Claude연결: claude연결,
    사용모델: 분석서비스.모델,
  });
}
