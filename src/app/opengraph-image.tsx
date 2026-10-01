import { ImageResponse } from "next/og";

export const alt = "PipeFlow CRM — organize suas vendas sem complicação";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static: rendered once at build time. Colors are the theme's (slate-950 / indigo-500).
const STAGES = [
  { label: "Novo Lead", color: "#94a3b8" },
  { label: "Contato", color: "#38bdf8" },
  { label: "Proposta", color: "#818cf8" },
  { label: "Negociação", color: "#fbbf24" },
  { label: "Ganho", color: "#34d399" },
];

/** Preview image when a link to the site is shared (WhatsApp, LinkedIn, Slack...). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#020617",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#6366f1", display: "flex" }} />
          <div style={{ fontSize: 44, fontWeight: 700 }}>PipeFlow CRM</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Organize suas vendas sem complicação</div>
          <div style={{ fontSize: 32, color: "#94a3b8" }}>Leads, pipeline Kanban e métricas em um só lugar. Grátis para começar.</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {STAGES.map((stage) => (
            <div
              key={stage.label}
              style={{
                display: "flex",
                flex: 1,
                padding: "16px 20px",
                borderRadius: 12,
                background: "#0f172a",
                borderTop: `6px solid ${stage.color}`,
                fontSize: 24,
                color: "#cbd5e1",
              }}
            >
              {stage.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
