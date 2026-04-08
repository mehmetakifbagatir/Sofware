import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">Time: {label}s</p>
        {payload.map((entry, index) => (
          <p key={index} className="value" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toLocaleString() || 0}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const chartConfig = {
  total: { label: "Total", color: "#00E5FF" },
  accepted: { label: "Accepted", color: "#00E676" },
  rejected: { label: "Rejected", color: "#FF3B30" },
  rejection_rate: { label: "Rejection Rate", color: "#FFB300" }
};

export default function ChartsSection({ timeSeriesData, isRunning }) {
  const hasData = timeSeriesData && timeSeriesData.length > 0;

  return (
    <section className="space-y-6" data-testid="charts-section">
      <h2 className="text-lg font-medium text-zinc-200">Performance Charts</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Over Time Chart */}
        <div className="chart-card" data-testid="chart-requests-time">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">
            Requests Over Time
          </h3>
          <div className="h-[280px]">
            {hasData ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timeSeriesData}>
                  <defs>
                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="acceptedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E676" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00E676" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="rejectedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF3B30" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#71717A" 
                    tick={{ fill: '#71717A', fontSize: 11 }}
                    tickFormatter={(value) => `${value}s`}
                  />
                  <YAxis 
                    stroke="#71717A" 
                    tick={{ fill: '#71717A', fontSize: 11 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px' }}
                    formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#00E5FF"
                    strokeWidth={2}
                    fill="url(#totalGradient)"
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="accepted"
                    name="Accepted"
                    stroke="#00E676"
                    strokeWidth={2}
                    fill="url(#acceptedGradient)"
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="rejected"
                    name="Rejected"
                    stroke="#FF3B30"
                    strokeWidth={2}
                    fill="url(#rejectedGradient)"
                    animationDuration={800}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <p className="text-sm">Start an experiment to see data</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rejection Rate Chart */}
        <div className="chart-card" data-testid="chart-rejection-rate">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">
            Rejection Rate Over Time
          </h3>
          <div className="h-[280px]">
            {hasData ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#71717A" 
                    tick={{ fill: '#71717A', fontSize: 11 }}
                    tickFormatter={(value) => `${value}s`}
                  />
                  <YAxis 
                    stroke="#71717A" 
                    tick={{ fill: '#71717A', fontSize: 11 }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="rejection_rate"
                    name="Rejection Rate %"
                    stroke="#FFB300"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#FFB300' }}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                    <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-sm">No rejection data yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
