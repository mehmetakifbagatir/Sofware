import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Play, Square, Zap, Activity, Users, Gauge, Timer, Shield } from "lucide-react";

const strategies = [
  { value: "no_limit", label: "No Rate Limiting", description: "All requests accepted" },
  { value: "fixed_window", label: "Fixed Window", description: "Reset counter each window" },
  { value: "sliding_window", label: "Sliding Window", description: "Moving time window" }
];

export default function ControlPanel({
  config,
  onConfigChange,
  isRunning,
  isRunningAll,
  onStart,
  onStop,
  onRunAll
}) {
  const isDisabled = isRunning || isRunningAll;

  return (
    <header className="control-panel px-6 md:px-8 lg:px-12 py-4" data-testid="control-panel">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Rate Limit Analyzer</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`status-dot ${isRunning ? 'running' : 'stopped'}`} />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                {isRunning ? 'Running' : 'Idle'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          {/* Strategy Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Strategy
            </label>
            <Select
              value={config.strategy}
              onValueChange={(value) => onConfigChange("strategy", value)}
              disabled={isDisabled}
            >
              <SelectTrigger 
                className="w-[180px] bg-[#0A0A0A] border-white/10 text-white focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]"
                data-testid="strategy-select"
              >
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10">
                {strategies.map((s) => (
                  <SelectItem 
                    key={s.value} 
                    value={s.value}
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                  >
                    <span>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clients Slider */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Clients: <span className="text-cyan-400 font-mono">{config.num_clients}</span>
            </label>
            <Slider
              value={[config.num_clients]}
              onValueChange={([value]) => onConfigChange("num_clients", value)}
              min={1}
              max={100}
              step={1}
              disabled={isDisabled}
              className="w-[120px]"
              data-testid="client-slider"
            />
          </div>

          {/* Request Rate Slider */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Gauge className="w-3 h-3" />
              Rate: <span className="text-cyan-400 font-mono">{config.requests_per_second}/s</span>
            </label>
            <Slider
              value={[config.requests_per_second]}
              onValueChange={([value]) => onConfigChange("requests_per_second", value)}
              min={10}
              max={500}
              step={10}
              disabled={isDisabled}
              className="w-[120px]"
              data-testid="rate-slider"
            />
          </div>

          {/* Rate Limit Slider */}
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <Timer className="w-3 h-3" />
              Limit: <span className="text-cyan-400 font-mono">{config.rate_limit}/s</span>
            </label>
            <Slider
              value={[config.rate_limit]}
              onValueChange={([value]) => onConfigChange("rate_limit", value)}
              min={1}
              max={100}
              step={1}
              disabled={isDisabled}
              className="w-[120px]"
            />
          </div>

          {/* Duration Slider */}
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              Duration: <span className="text-cyan-400 font-mono">{config.duration_seconds}s</span>
            </label>
            <Slider
              value={[config.duration_seconds]}
              onValueChange={([value]) => onConfigChange("duration_seconds", value)}
              min={1}
              max={30}
              step={1}
              disabled={isDisabled}
              className="w-[100px]"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {!isRunning ? (
            <Button
              onClick={onStart}
              disabled={isRunningAll}
              className="bg-[#00E5FF] text-black font-semibold hover:bg-[#00BFA5] shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all"
              data-testid="start-experiment-btn"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          ) : (
            <Button
              onClick={onStop}
              variant="destructive"
              className="bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20"
              data-testid="stop-experiment-btn"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          
          <Button
            onClick={onRunAll}
            disabled={isRunning || isRunningAll}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/5 hover:border-white/40"
            data-testid="run-all-btn"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isRunningAll ? "Running..." : "Run All"}
          </Button>
        </div>
      </div>
    </header>
  );
}
