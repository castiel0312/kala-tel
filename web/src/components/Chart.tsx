import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";

export interface Series {
  label: string;
  /** Aligned with x. `null` renders as a gap, never as zero. */
  values: (number | null)[];
  stroke?: string;
  width?: number;
  dashed?: boolean;
}

/**
 * uPlot wrapper for the drilling and trajectory series.
 *
 * Nulls are passed through as null so uPlot breaks the line instead of
 * dropping to zero, which would misrepresent a channel that stopped being
 * reported as a channel that measured zero.
 */
export function Chart({
  x,
  xLabel,
  series,
  height = 260,
  yLabel,
}: {
  x: number[];
  xLabel: string;
  series: Series[];
  height?: number;
  yLabel?: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const plot = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const opts: uPlot.Options = {
      width: host.current.clientWidth || 800,
      height,
      title: yLabel ?? "",
      scales: { x: { time: false } },
      axes: [
        { stroke: "#5b6472", grid: { stroke: "#e3e7ec" }, label: xLabel },
        { stroke: "#5b6472", grid: { stroke: "#e3e7ec" }, label: yLabel ?? "" },
      ],
      series: [
        { label: xLabel },
        ...series.map((s) => ({
          label: s.label,
          stroke: s.stroke ?? "#1f6feb",
          width: s.width ?? 1.5,
          ...(s.dashed ? { dash: [6, 4] } : {}),
        })),
      ],
      cursor: { drag: { x: true, y: false } },
    };
    plot.current = new uPlot(opts, [x, ...series.map((s) => s.values)], host.current);
    return () => {
      plot.current?.destroy();
      plot.current = null;
    };
  }, [x, series, height, xLabel, yLabel]);

  useEffect(() => {
    const onResize = () => plot.current?.setSize({
      width: host.current?.clientWidth ?? 800,
      height,
    });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [height]);

  return <div className="chart" ref={host} />;
}
