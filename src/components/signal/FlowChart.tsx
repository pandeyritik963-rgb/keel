// Daily ETF net-flow bars, rendered server-side as SVG from the real SoSoValue series.
// Inflows plot up in the up-tint, outflows down in the down-tint, around a zero baseline.
// No client JS, no interpolation: one bar per real datapoint, nothing else.
import type { FlowPoint } from "@/lib/core";
import { formatCompactUsd } from "@/lib/format";

const W = 720;
const H = 180;
const PAD = { top: 12, right: 8, bottom: 22, left: 52 };

export function FlowChart({ series, days = 60 }: { series: FlowPoint[]; days?: number }) {
  const pts = series.slice(-days);
  if (pts.length < 2) return null;

  const maxAbs = Math.max(...pts.map((p) => Math.abs(p.netInflowUsd)), 1);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const zeroY = PAD.top + innerH / 2;
  const scaleY = innerH / 2 / maxAbs;
  const step = innerW / pts.length;
  const barW = Math.max(1.5, step * 0.62);

  const first = pts[0];
  const last = pts[pts.length - 1];

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Daily ETF net flows, ${first.date} to ${last.date}`}
      >
        {/* zero baseline + extreme gridlines */}
        <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY} className="stroke-border-strong" strokeWidth="1" />
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} className="stroke-border" strokeWidth="1" strokeDasharray="2 4" />
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="stroke-border" strokeWidth="1" strokeDasharray="2 4" />

        {/* y labels at +max / 0 / -max */}
        <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" className="fill-faint font-mono" fontSize="10">
          {formatCompactUsd(maxAbs)}
        </text>
        <text x={PAD.left - 6} y={zeroY + 4} textAnchor="end" className="fill-faint font-mono" fontSize="10">
          $0
        </text>
        <text x={PAD.left - 6} y={PAD.top + innerH + 4} textAnchor="end" className="fill-faint font-mono" fontSize="10">
          {formatCompactUsd(-maxAbs)}
        </text>

        {/* one bar per real datapoint */}
        {pts.map((p, i) => {
          const x = PAD.left + i * step + (step - barW) / 2;
          const h = Math.abs(p.netInflowUsd) * scaleY;
          const y = p.netInflowUsd >= 0 ? zeroY - h : zeroY;
          return (
            <rect
              key={p.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 0.5)}
              className={p.netInflowUsd >= 0 ? "fill-up" : "fill-down"}
              opacity={0.85}
            >
              <title>{`${p.date}: ${formatCompactUsd(p.netInflowUsd, { signed: true })} net flow`}</title>
            </rect>
          );
        })}

        {/* x labels: first and last date */}
        <text x={PAD.left} y={H - 6} className="fill-faint font-mono" fontSize="10">
          {first.date}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-faint font-mono" fontSize="10">
          {last.date}
        </text>
      </svg>
      <figcaption className="mt-1 text-micro text-faint">
        Daily US spot-ETF net flow, USD. Source: SoSoValue /etfs/summary-history · {pts.length} days shown.
      </figcaption>
    </figure>
  );
}
