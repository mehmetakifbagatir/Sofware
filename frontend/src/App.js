import React, { useState, useEffect, useCallback, useRef } from "react";
import "@/App.css";
import { Toaster, toast } from "sonner";
import ControlPanel from "./components/ControlPanel";
import MetricsGrid from "./components/MetricsGrid";
import ChartsSection from "./components/ChartsSection";
import ComparisonTable from "./components/ComparisonTable";
import AnalysisSection from "./components/AnalysisSection";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace(/^http/, 'ws') + '/api/ws';

const initialMetrics = {
  total_requests: 0,
  accepted_requests: 0,
  rejected_requests: 0,
  avg_response_time: 0,
  requests_per_second: 0,
  rejection_rate: 0,
  is_running: false,
  current_strategy: "no_limit",
  time_series_data: [],
  comparison_results: []
};

function App() {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [config, setConfig] = useState({
    strategy: "no_limit",
    num_clients: 20,
    requests_per_second: 100,
    rate_limit: 10,
    duration_seconds: 5
  });
  const [comparisonResults, setComparisonResults] = useState([]);
  const [analysisText, setAnalysisText] = useState("");
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      wsRef.current = new WebSocket(WS_URL);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "metrics_update" || message.type === "connected") {
            const data = message.data;
            setMetrics(prev => ({
              ...prev,
              ...data
            }));
            setIsRunning(data.is_running);
            
            if (data.comparison_results?.length > 0) {
              setComparisonResults(data.comparison_results);
            }
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        // Reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (e) {
      console.error("Failed to connect WebSocket:", e);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // API calls
  const startExperiment = async () => {
    try {
      const response = await fetch(`${API}/experiment/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }
      
      setIsRunning(true);
      toast.success(`Experiment started with ${config.strategy.replace('_', ' ')} strategy`);
    } catch (e) {
      console.error("Failed to start experiment:", e);
      toast.error("Failed to start experiment");
    }
  };

  const stopExperiment = async () => {
    try {
      await fetch(`${API}/experiment/stop`, {
        method: "POST"
      });
      setIsRunning(false);
      toast.info("Experiment stopped");
    } catch (e) {
      console.error("Failed to stop experiment:", e);
      toast.error("Failed to stop experiment");
    }
  };

  const runAllStrategies = async () => {
    try {
      setIsRunningAll(true);
      setComparisonResults([]);
      setAnalysisText("");
      toast.info("Running all strategies...");
      
      const response = await fetch(`${API}/experiment/run-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      
      if (data.error) {
        toast.error(data.error);
        return;
      }
      
      setComparisonResults(data.results || []);
      setAnalysisText(data.analysis || "");
      toast.success("All experiments completed!");
    } catch (e) {
      console.error("Failed to run all strategies:", e);
      toast.error("Failed to run all strategies");
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app-container min-h-screen" data-testid="app-container">
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      />
      
      {/* Control Panel */}
      <ControlPanel
        config={config}
        onConfigChange={handleConfigChange}
        isRunning={isRunning}
        isRunningAll={isRunningAll}
        onStart={startExperiment}
        onStop={stopExperiment}
        onRunAll={runAllStrategies}
      />

      {/* Main Content */}
      <main className="p-6 md:p-8 lg:p-12 space-y-8 lg:space-y-12">
        {/* Metrics Grid */}
        <MetricsGrid metrics={metrics} isRunning={isRunning} />

        {/* Charts Section */}
        <ChartsSection 
          timeSeriesData={metrics.time_series_data} 
          isRunning={isRunning}
        />

        {/* Comparison Table */}
        <ComparisonTable results={comparisonResults} />

        {/* Analysis Section */}
        <AnalysisSection text={analysisText} />
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-zinc-600 text-sm border-t border-white/5">
        <p>Rate Limiting Strategy Analyzer - Experimental Analysis Platform</p>
      </footer>
    </div>
  );
}

export default App;
