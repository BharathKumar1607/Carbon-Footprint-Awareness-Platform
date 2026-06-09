import { Footprint } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell
} from "recharts";

interface DashboardChartsProps {
  footprints: Footprint[];
}

export default function DashboardCharts({ footprints }: DashboardChartsProps) {
  if (footprints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center glass-card h-64">
        <p className="text-slate-400 text-sm">No calculations recorded yet.</p>
        <p className="text-eco font-medium text-xs mt-2">Log your initial entry above to unlock analytical insights!</p>
      </div>
    );
  }

  // Prep Line Chart Data: sort by date ascending, take latest 7
  const trendData = footprints
    .map(f => {
      const date = new Date(f.timestamp);
      return {
        dateStr: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        "Total CO2 (Tons)": f.total_co2,
        Transport: f.transport_co2,
        Energy: f.energy_co2,
        Food: f.food_co2,
        Lifestyle: f.lifestyle_co2
      };
    })
    .slice(-7);

  // Get latest entry for categorization breakdown
  const latest = footprints[footprints.length - 1];

  const breakdownData = [
    { category: "Transport", "CO2 (Tons)": latest.transport_co2, color: "#3498db" },
    { category: "Energy", "CO2 (Tons)": latest.energy_co2, color: "#f1c40f" },
    { category: "Food", "CO2 (Tons)": latest.food_co2, color: "#2ecc71" },
    { category: "Lifestyle", "CO2 (Tons)": latest.lifestyle_co2, color: "#9b59b6" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Carbon Trend Line */}
      <div className="glass-card p-4 md:p-6 shadow-xl flex flex-col justify-between">
        <div>
          <h4 className="text-base font-semibold text-white tracking-tight">CO₂ Emissions Trend</h4>
          <p className="text-slate-400 text-xs mb-4">Historical trajectory of your carbon footprint (Tons CO₂ equivalents)</p>
        </div>
        <div className="w-full h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dateStr" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px"
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }} />
              <Line
                type="monotone"
                dataKey="Total CO2 (Tons)"
                stroke="#2ecc71"
                strokeWidth={3}
                activeDot={{ r: 8 }}
                dot={{ r: 4, stroke: "#1e293b", strokeWidth: 1.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Bar Chart */}
      <div className="glass-card p-4 md:p-6 shadow-xl flex flex-col justify-between">
        <div>
          <h4 className="text-base font-semibold text-white tracking-tight">Active Footprint Breakdown</h4>
          <p className="text-slate-400 text-xs mb-4">Emissions distribution by category based on your latest entry</p>
        </div>
        <div className="w-full h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="category" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px"
                }}
              />
              <Bar dataKey="CO2 (Tons)" radius={[6, 6, 0, 0]}>
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
