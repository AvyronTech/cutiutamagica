import { useWorkspaceActive } from "@/admin/workspace-activity";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/analytics-report";
export default function AnalyticsSalesChart({
  rows,
  currency,
}: {
  rows: Array<{ label: string; value: number }>;
  currency: string;
}) {
  const active = useWorkspaceActive();
  if (!active) return null;
  return (
    <div className="mt-4 h-52 min-w-0" aria-label={`Evoluția valorii comenzilor în ${currency}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: 0, right: 14, top: 8, bottom: 0 }}>
          <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#94a3b8" minTickGap={28} fontSize={11} />
          <YAxis stroke="#94a3b8" width={52} fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "#101b2c",
              border: "1px solid #475569",
              borderRadius: 10,
              color: "#f8fafc",
            }}
            formatter={(v) => [formatMoney(Number(v), currency), "Valoare netă"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            name="Valoare netă"
            stroke="#f4ce9f"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
