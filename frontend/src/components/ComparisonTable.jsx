import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle, XCircle, Clock, TrendingUp, Shield } from "lucide-react";

const strategyColors = {
  no_limit: "#00E5FF",
  fixed_window: "#00E676",
  sliding_window: "#FFB300"
};

const strategyLabels = {
  no_limit: "No Limit",
  fixed_window: "Fixed Window",
  sliding_window: "Sliding Window"
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label font-medium text-white mb-1">{strategyLabels[label] || label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="value text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toLocaleString() || 0}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function StabilityBadge({ score }) {
  let color = "text-emerald-400 bg-emerald-400/10";
  let label = "Excellent";
  
  if (score < 50) {
    color = "text-red-400 bg-red-400/10";
    label = "Poor";
  } else if (score < 70) {
    color = "text-amber-400 bg-amber-400/10";
    label = "Fair";
  } else if (score < 85) {
    color = "text-cyan-400 bg-cyan-400/10";
    label = "Good";
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label} ({score.toFixed(0)})
    </span>
  );
}

export default function ComparisonTable({ results }) {
  const hasResults = results && results.length > 0;

  // Prepare chart data
  const chartData = results.map(r => ({
    strategy: r.strategy,
    accepted: r.accepted_requests,
    rejected: r.rejected_requests,
    throughput: r.throughput
  }));

  return (
    <section className="space-y-6" data-testid="comparison-section">
      <h2 className="text-lg font-medium text-zinc-200">Strategy Comparison</h2>

      {hasResults ? (
        <>
          {/* Performance Comparison Chart */}
          <div className="chart-card" data-testid="chart-performance">
            <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500 mb-4">
              Performance Comparison
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#71717A" tick={{ fill: '#71717A', fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="strategy" 
                    stroke="#71717A" 
                    tick={{ fill: '#71717A', fontSize: 11 }}
                    tickFormatter={(value) => strategyLabels[value] || value}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="accepted" name="Accepted" stackId="a" animationDuration={800}>
                    {chartData.map((entry, index) => (
                      <Cell key={`accepted-${index}`} fill="#00E676" fillOpacity={0.8} />
                    ))}
                  </Bar>
                  <Bar dataKey="rejected" name="Rejected" stackId="a" animationDuration={800}>
                    {chartData.map((entry, index) => (
                      <Cell key={`rejected-${index}`} fill="#FF3B30" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="chart-card overflow-x-auto" data-testid="comparison-table">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>
                    <span className="flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      Strategy
                    </span>
                  </th>
                  <th>
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      Accepted
                    </span>
                  </th>
                  <th>
                    <span className="flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-red-400" />
                      Rejected
                    </span>
                  </th>
                  <th>
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Avg Latency
                    </span>
                  </th>
                  <th>
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-cyan-400" />
                      Throughput
                    </span>
                  </th>
                  <th>Stability</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                    <td>
                      <span 
                        className="strategy-badge"
                        style={{ 
                          backgroundColor: `${strategyColors[result.strategy]}15`,
                          color: strategyColors[result.strategy]
                        }}
                      >
                        {strategyLabels[result.strategy] || result.strategy}
                      </span>
                    </td>
                    <td className="text-emerald-400">{result.accepted_requests.toLocaleString()}</td>
                    <td className="text-red-400">{result.rejected_requests.toLocaleString()}</td>
                    <td>{result.avg_response_time.toFixed(2)} ms</td>
                    <td className="text-cyan-400">{result.throughput.toFixed(1)} req/s</td>
                    <td><StabilityBadge score={result.stability_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="chart-card">
          <div className="py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">No Comparison Data</h3>
            <p className="text-zinc-500 text-sm max-w-md mx-auto">
              Click "Run All" to execute experiments with all rate limiting strategies and generate a comparison.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
