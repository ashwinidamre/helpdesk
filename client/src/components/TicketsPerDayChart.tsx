import { useState } from "react";

interface DailyCount {
  date: string;
  count: number;
}

interface Props {
  data: DailyCount[];
}

const CHART_HEIGHT = 180;
const GRIDLINE_STEPS = 4;
const BAR_MAX_WIDTH = 24;

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceNormalized * magnitude;
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function TicketsPerDayChart({ data }: Props) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const maxCount = niceMax(Math.max(...data.map((d) => d.count), 0));
  const gridlineValues = Array.from({ length: GRIDLINE_STEPS + 1 }, (_, i) =>
    Math.round((maxCount / GRIDLINE_STEPS) * i)
  ).reverse();

  const hovered = hoverIndex != null ? data[hoverIndex] : null;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tickets created per day (last 30 days)
      </h2>

      <div className="relative">
        {hovered && (
          <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-3 py-2 text-xs shadow-popover motion-safe:animate-fade-up">
            <p className="font-semibold text-foreground">{hovered.count.toLocaleString()} tickets</p>
            <p className="text-muted-foreground">
              {new Date(hovered.date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        )}

        <div className="flex">
          <div
            className="mr-2 flex flex-col justify-between text-right text-[10px] leading-none text-muted-foreground"
            style={{ height: CHART_HEIGHT }}
          >
            {gridlineValues.map((v, i) => (
              <span key={i}>{v}</span>
            ))}
          </div>

          <div className="relative flex-1">
            <div
              className="pointer-events-none absolute inset-0 flex flex-col justify-between"
              style={{ height: CHART_HEIGHT }}
            >
              {gridlineValues.map((v, i) => (
                <div key={i} className="border-t border-border/60" />
              ))}
            </div>

            <div className="relative flex items-end gap-[2px]" style={{ height: CHART_HEIGHT }}>
              {data.map((d, i) => {
                const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                const isHovered = hoverIndex === i;
                return (
                  <div
                    key={d.date}
                    className="relative flex-1 self-stretch"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onFocus={() => setHoverIndex(i)}
                    onBlur={() => setHoverIndex(null)}
                    tabIndex={0}
                    aria-label={`${d.count} tickets on ${d.date}`}
                  >
                    <div
                      className="absolute bottom-0 left-1/2 rounded-t transition-[height,filter] duration-200"
                      style={{
                        height: `${heightPct}%`,
                        width: `min(100%, ${BAR_MAX_WIDTH}px)`,
                        transform: "translateX(-50%)",
                        backgroundImage: "linear-gradient(180deg, #2E8A73 0%, #1F6F5C 100%)",
                        filter: isHovered ? "brightness(0.85)" : "brightness(1)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ml-8 mt-2 flex">
          {data.map((d, i) => (
            <div key={d.date} className="flex-1 text-center text-[10px] text-muted-foreground">
              {i === 0 || i === data.length - 1 || i % 5 === 0 ? formatDateLabel(d.date) : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
