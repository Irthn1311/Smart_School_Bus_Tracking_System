"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

const data = [
  { status: "Đang chạy", count: 12, color: "hsl(var(--primary))" },
  { status: "Hoàn thành", count: 8, color: "hsl(var(--success))" },
  { status: "Trễ", count: 3, color: "hsl(var(--warning))" },
  { status: "Sự cố", count: 1, color: "hsl(var(--destructive))" },
]

export function BusStatusChart() {
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Số lượng xe" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
