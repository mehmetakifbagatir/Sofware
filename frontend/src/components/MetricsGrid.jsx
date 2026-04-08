import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle, Clock, Activity } from "lucide-react";

function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  color = "cyan", 
  suffix = "", 
  testId,
  isRunning 
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current && isRunning) {
      setIsUpdating(true);
      const timeout = setTimeout(() => setIsUpdating(false), 200);
      prevValue.current = value;
      return () => clearTimeout(timeout);
    }
  }, [value, isRunning]);

  const colorClasses = {
    cyan: "text-cyan-400",
    green: "text-emerald-400",
    red: "text-red-400",
    yellow: "text-amber-400"
  };

  const bgGradient = {
    cyan: "from-cyan-500/10 to-transparent",
    green: "from-emerald-500/10 to-transparent",
    red: "from-red-500/10 to-transparent",
    yellow: "from-amber-500/10 to-transparent"
  };

  return (
    <div 
      className="metric-card group"
      data-testid={testId}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {label}
          </span>
          <Icon className={`w-5 h-5 ${colorClasses[color]} opacity-60`} />
        </div>
        
        <div className={`metric-value ${isUpdating ? 'animate-count-up text-cyan-400' : ''}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-lg text-zinc-500 ml-1">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

export default function MetricsGrid({ metrics, isRunning }) {
  const {
    total_requests = 0,
    accepted_requests = 0,
    rejected_requests = 0,
    avg_response_time = 0,
    requests_per_second = 0,
    rejection_rate = 0
  } = metrics;

  return (
    <section data-testid="metrics-section">
      <h2 className="text-lg font-medium text-zinc-200 mb-6">Real-time Metrics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <MetricCard
          label="Total Requests"
          value={total_requests}
          icon={Activity}
          color="cyan"
          testId="metric-total-req"
          isRunning={isRunning}
        />
        
        <MetricCard
          label="Accepted"
          value={accepted_requests}
          icon={CheckCircle}
          color="green"
          testId="metric-accepted"
          isRunning={isRunning}
        />
        
        <MetricCard
          label="Rejected"
          value={rejected_requests}
          icon={XCircle}
          color="red"
          testId="metric-rejected"
          isRunning={isRunning}
        />
        
        <MetricCard
          label="Avg Latency"
          value={avg_response_time.toFixed(2)}
          suffix="ms"
          icon={Clock}
          color="yellow"
          testId="metric-latency"
          isRunning={isRunning}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 block mb-2">
                Throughput
              </span>
              <span className="text-3xl font-mono font-light text-white">
                {requests_per_second.toFixed(1)}
                <span className="text-sm text-zinc-500 ml-1">req/s</span>
              </span>
            </div>
            <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                style={{ width: `${Math.min(requests_per_second / 5, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 block mb-2">
                Rejection Rate
              </span>
              <span className={`text-3xl font-mono font-light ${rejection_rate > 50 ? 'text-red-400' : rejection_rate > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {rejection_rate.toFixed(1)}
                <span className="text-sm text-zinc-500 ml-1">%</span>
              </span>
            </div>
            <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${rejection_rate > 50 ? 'bg-red-500' : rejection_rate > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(rejection_rate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
