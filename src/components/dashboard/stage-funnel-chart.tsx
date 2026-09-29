"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { DEAL_STAGE_STYLES } from "@/lib/deal-stages";
import type { StageTotal } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/utils";

const ROW_HEIGHT = 44;

type Row = StageTotal & { label: string };

/**
 * Deals per stage as horizontal bars, in board order. One series, so one color
 * (primary): the stage name on the axis identifies each bar. Count is labeled on
 * every bar, zero included; the value in R$ is in the tooltip and in the
 * screen-reader table.
 */
export function StageFunnelChart({ stages }: { stages: StageTotal[] }) {
  const rows: Row[] = stages.map((s) => ({ ...s, label: DEAL_STAGE_STYLES[s.stage].label }));

  return (
    <>
      <div aria-hidden className="w-full" style={{ height: rows.length * ROW_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={10}>
            <XAxis type="number" hide allowDecimals={false} domain={[0, (max: number) => Math.max(max, 1)]} />
            <YAxis
              type="category"
              dataKey="label"
              width={128}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }}
              isAnimationActive={false}
              content={({ active, payload }) => {
                const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
                if (!row) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-sm">
                    <p className="font-medium">{row.label}</p>
                    <p className="tabular-nums text-muted-foreground">
                      {row.count} {row.count === 1 ? "negócio" : "negócios"} · {formatCurrency(row.valueCents)}
                    </p>
                  </div>
                );
              }}
            />
            {/* minPointSize: an empty stage gets a stub at the baseline and its "0" label,
                so it reads as zero instead of missing. */}
            <Bar
              dataKey="count"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
              minPointSize={3}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="count"
                position="right"
                className="tabular-nums"
                style={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Negócios por etapa</caption>
        <thead>
          <tr>
            <th scope="col">Etapa</th>
            <th scope="col">Negócios</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.stage}>
              <th scope="row">{row.label}</th>
              <td>{row.count}</td>
              <td>{formatCurrency(row.valueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
