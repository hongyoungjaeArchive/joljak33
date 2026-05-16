"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldData from "world-atlas/countries-110m.json";

const 국가좌표: Record<string, [number, number]> = {
  "중국":       [104.19,  35.86],
  "러시아":     [37.62,   55.76],
  "미국":       [-98.58,  39.83],
  "북한":       [127.51,  40.34],
  "일본":       [138.25,  36.20],
  "독일":       [10.45,   51.17],
  "영국":       [-3.44,   55.38],
  "프랑스":     [2.21,    46.23],
  "브라질":     [-51.93, -14.24],
  "인도":       [78.96,   20.59],
  "이란":       [53.69,   32.43],
  "우크라이나": [31.17,   48.38],
  "캐나다":     [-96.80,  56.13],
  "호주":       [133.77, -25.27],
};

const 타겟좌표: [number, number] = [126.978, 37.566];

const 위험색상: Record<string, string> = {
  CRITICAL: "#f87171",
  HIGH:     "#fb923c",
  MEDIUM:   "#fbbf24",
  LOW:      "#a3e635",
};

const 위험라벨: Record<string, string> = {
  CRITICAL: "치명",
  HIGH:     "높음",
  MEDIUM:   "보통",
  LOW:      "낮음",
};

const 위험배경: Record<string, string> = {
  CRITICAL: "rgba(248,113,113,0.12)",
  HIGH:     "rgba(251,146,60,0.12)",
  MEDIUM:   "rgba(251,191,36,0.12)",
  LOW:      "rgba(163,230,53,0.12)",
};

export interface 공격항목 {
  국가: string;
  ip: string;
  공격유형: string;
  위험등급: string;
}

interface Props {
  공격: 공격항목 | null;
  허니팟ID?: string;
}

export default function AttackMap({ 공격, 허니팟ID }: Props) {
  const svgRef  = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return;

    const W = wrapRef.current.getBoundingClientRect().width || 560;
    const H = 260;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("height", H)
      .style("width", "100%")
      .style("height", "auto");
    svg.selectAll("*").remove();

    const src좌표 = 공격 ? (국가좌표[공격.국가] ?? null) : null;
    const color   = 공격 ? (위험색상[공격.위험등급] ?? "#fb923c") : "#fb923c";

    // ── 프로젝션 ─────────────────────────────────────────────────────────
    let projection: d3.GeoProjection;
    if (src좌표) {
      const midPt = d3.geoInterpolate(src좌표, 타겟좌표)(0.5) as [number, number];
      const angDist = d3.geoDistance(src좌표, 타겟좌표);
      const scale = Math.min(
        (W * 0.36) / Math.sin(Math.min(angDist / 2, 1.2)),
        W / 1.5,
      );
      projection = d3.geoNaturalEarth1()
        .scale(scale)
        .center(midPt)
        .translate([W / 2, H / 2]);
    } else {
      projection = d3.geoNaturalEarth1()
        .scale(W / 6.5)
        .translate([W / 2, H / 2]);
    }

    const geoPath = d3.geoPath().projection(projection);

    // ── 배경 ─────────────────────────────────────────────────────────────
    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#0b1120").attr("rx", 10);
    svg.append("path")
      .datum({ type: "Sphere" } as d3.GeoPermissibleObjects)
      .attr("d", geoPath)
      .attr("fill", "#111827");

    // ── 국가 ─────────────────────────────────────────────────────────────
    const topo     = worldData as unknown as Topology;
    const countries = feature(topo, topo.objects.countries as GeometryCollection);
    const g = svg.append("g");

    g.selectAll("path.country")
      .data(countries.features)
      .join("path")
      .classed("country", true)
      .attr("d", geoPath)
      .attr("fill", "#1e293b")
      .attr("stroke", "#334155")
      .attr("stroke-width", 0.4);

    // ── 허니팟 위치 (서울) ───────────────────────────────────────────────
    const 타겟px = projection(타겟좌표);
    if (타겟px) {
      (function 펄스() {
        g.append("circle")
          .attr("cx", 타겟px[0]).attr("cy", 타겟px[1])
          .attr("r", 8).attr("fill", "none")
          .attr("stroke", "#818cf8").attr("stroke-width", 2).attr("opacity", 0.9)
          .transition().duration(1600).ease(d3.easeQuadOut)
          .attr("r", 28).attr("opacity", 0)
          .remove().on("end", 펄스);
      })();
      g.append("circle")
        .attr("cx", 타겟px[0]).attr("cy", 타겟px[1]).attr("r", 7)
        .attr("fill", "#6366f1").attr("stroke", "white").attr("stroke-width", 1.5)
        .style("filter", "drop-shadow(0 0 8px #6366f1aa)");
      g.append("text")
        .attr("x", 타겟px[0]).attr("y", 타겟px[1] - 12)
        .attr("text-anchor", "middle").attr("font-size", "10px").attr("font-weight", "800")
        .attr("fill", "#c7d2fe").attr("stroke", "#0b1120").attr("stroke-width", 3).attr("paint-order", "stroke")
        .text("🍯 서울");
    }

    // ── 공격 호 & 마커 ────────────────────────────────────────────────────
    if (공격 && src좌표) {
      const srcPx = projection(src좌표);
      if (!srcPx || !타겟px) return;

      const interpolate = d3.geoInterpolate(src좌표, 타겟좌표);
      const points = d3.range(0, 1.01, 0.012)
        .map((t) => projection(interpolate(t)))
        .filter((p): p is [number, number] => p !== null);
      if (points.length < 2) return;

      const pathD = `M ${points.map((p) => p.join(",")).join(" L ")}`;

      // 글로우
      g.append("path").attr("d", pathD).attr("fill", "none")
        .attr("stroke", color).attr("stroke-width", 6).attr("opacity", 0.08);

      // 메인 아크
      const arcEl = g.append("path").attr("d", pathD).attr("fill", "none")
        .attr("stroke", color).attr("stroke-width", 1.8).attr("opacity", 0.9)
        .style("filter", `drop-shadow(0 0 4px ${color}88)`);
      const 길이 = (arcEl.node() as SVGPathElement).getTotalLength();
      arcEl.attr("stroke-dasharray", String(길이)).attr("stroke-dashoffset", String(길이))
        .transition().duration(1300).ease(d3.easeLinear).attr("stroke-dashoffset", "0");

      // 이동 탄환
      const dot = g.append("circle").attr("r", 4.5).attr("fill", color).attr("opacity", 0)
        .style("filter", `drop-shadow(0 0 6px ${color})`);
      function animateBullet() {
        dot.attr("cx", srcPx![0]).attr("cy", srcPx![1]).attr("opacity", 1)
          .transition().delay(1300).duration(2200).ease(d3.easeLinear)
          .attrTween("cx", () => (t) => String(projection(interpolate(t))?.[0] ?? srcPx![0]))
          .attrTween("cy", () => (t) => String(projection(interpolate(t))?.[1] ?? srcPx![1]))
          .attr("opacity", 0.15)
          .on("end", () => setTimeout(animateBullet, 500));
      }
      animateBullet();

      // 발원지 마커
      g.append("circle").attr("cx", srcPx[0]).attr("cy", srcPx[1]).attr("r", 8)
        .attr("fill", color).attr("stroke", "white").attr("stroke-width", 1.5)
        .style("filter", `drop-shadow(0 0 8px ${color})`);
      g.append("text")
        .attr("x", srcPx[0]).attr("y", srcPx[1] - 13)
        .attr("text-anchor", "middle").attr("font-size", "10px").attr("font-weight", "800")
        .attr("fill", color).attr("stroke", "#0b1120").attr("stroke-width", 3).attr("paint-order", "stroke")
        .text(공격.국가);
      g.append("text")
        .attr("x", srcPx[0]).attr("y", srcPx[1] + 20)
        .attr("text-anchor", "middle").attr("font-size", "9px").attr("font-family", "monospace")
        .attr("fill", color).attr("stroke", "#0b1120").attr("stroke-width", 3).attr("paint-order", "stroke")
        .text(공격.ip);
    }

    if (!공격) {
      svg.append("text")
        .attr("x", W / 2).attr("y", H / 2 + 5)
        .attr("text-anchor", "middle").attr("font-size", "13px")
        .attr("fill", "#334155").attr("font-weight", "600")
        .text("공격자 IP를 입력하면 발원지가 표시됩니다");
    }
  }, [공격, 허니팟ID]);

  const color   = 공격 ? (위험색상[공격.위험등급] ?? "#fb923c") : "#fb923c";
  const 위험라벨값 = 공격 ? (위험라벨[공격.위험등급] ?? 공격.위험등급) : "";
  const bgColor = 공격 ? (위험배경[공격.위험등급] ?? "rgba(251,146,60,0.12)") : "";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 192px", gap: 14, alignItems: "stretch" }}>
      {/* 지도 */}
      <div ref={wrapRef} style={{ minWidth: 0 }}>
        <div style={{ borderRadius: 10, border: "1px solid #1e293b", overflow: "visible" }}>
          <svg ref={svgRef} style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      </div>

      {/* 정보 패널 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* 발원지 */}
        <div style={{
          flex: 1,
          background: 공격 ? bgColor : "rgba(255,255,255,0.03)",
          border: `1px solid ${공격 ? color + "33" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            🚨 공격 발원지
          </div>
          {공격 ? (
            <>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: color, marginBottom: 2 }}>{공격.국가}</div>
              <div style={{ fontSize: "0.78rem", fontFamily: "monospace", color: "#94a3b8", marginBottom: 10, wordBreak: "break-all" }}>{공격.ip}</div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: color + "20", border: `1px solid ${color}40`,
                borderRadius: 20, padding: "3px 9px",
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: color }}>{위험라벨값}</span>
              </div>
            </>
          ) : (
            <div style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.6 }}>IP 입력 후<br />표시됩니다</div>
          )}
        </div>

        {/* 타겟 */}
        <div style={{
          flex: 1,
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            🍯 공격 대상
          </div>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#818cf8", marginBottom: 2 }}>대한민국 · 서울</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>{허니팟ID ?? "허니팟 서버"}</div>
          <div style={{ fontSize: "0.7rem", color: "#334155" }}>37.57°N, 126.98°E</div>
        </div>

        {/* 공격 유형 */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            📍 공격 유형
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: 공격 ? "#e2e8f0" : "#334155" }}>
            {공격 ? 공격.공격유형.replace(/_/g, " ") : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
