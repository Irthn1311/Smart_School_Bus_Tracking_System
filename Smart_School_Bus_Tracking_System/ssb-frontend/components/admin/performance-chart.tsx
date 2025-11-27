"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { day: "T2", onTime: 92, late: 8, total: 100 },
  { day: "T3", onTime: 88, late: 12, total: 100 },
  { day: "T4", onTime: 95, late: 5, total: 100 },
  { day: "T5", onTime: 91, late: 9, total: 100 },
  { day: "T6", onTime: 94, late: 6, total: 100 },
  { day: "T7", onTime: 96, late: 4, total: 100 },
  { day: "CN", onTime: 93, late: 7, total: 100 },
]

export function PerformanceChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Area
            type="monotone"
            dataKey="onTime"
            stroke="hsl(var(--success))"
            fillOpacity={1}
            fill="url(#colorOnTime)"
            strokeWidth={2}
            name="Đúng giờ (%)"
          />
          <Area
            type="monotone"
            dataKey="late"
            stroke="hsl(var(--warning))"
            fillOpacity={1}
            fill="url(#colorLate)"
            strokeWidth={2}
            name="Trễ (%)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
