from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import asyncio
import time
import random
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from collections import defaultdict
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============= Rate Limiting Strategies =============

class RateLimitStrategy(str, Enum):
    NO_LIMIT = "no_limit"
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"

class RateLimiter:
    """Base rate limiter class"""
    def __init__(self, limit: int = 10, window_seconds: int = 1):
        self.limit = limit
        self.window_seconds = window_seconds
    
    def is_allowed(self, client_id: str) -> bool:
        return True
    
    def reset(self):
        pass

class NoLimitRateLimiter(RateLimiter):
    """No rate limiting - all requests allowed"""
    def is_allowed(self, client_id: str) -> bool:
        return True

class FixedWindowRateLimiter(RateLimiter):
    """Fixed window rate limiting"""
    def __init__(self, limit: int = 10, window_seconds: int = 1):
        super().__init__(limit, window_seconds)
        self.windows: Dict[str, Dict] = defaultdict(lambda: {"count": 0, "window_start": 0})
    
    def is_allowed(self, client_id: str) -> bool:
        current_time = time.time()
        window = self.windows[client_id]
        
        # Check if we're in a new window
        window_start = int(current_time / self.window_seconds) * self.window_seconds
        
        if window["window_start"] != window_start:
            window["count"] = 0
            window["window_start"] = window_start
        
        if window["count"] < self.limit:
            window["count"] += 1
            return True
        return False
    
    def reset(self):
        self.windows.clear()

class SlidingWindowRateLimiter(RateLimiter):
    """Sliding window rate limiting"""
    def __init__(self, limit: int = 10, window_seconds: int = 1):
        super().__init__(limit, window_seconds)
        self.requests: Dict[str, List[float]] = defaultdict(list)
    
    def is_allowed(self, client_id: str) -> bool:
        current_time = time.time()
        window_start = current_time - self.window_seconds
        
        # Remove old requests
        self.requests[client_id] = [
            t for t in self.requests[client_id] if t > window_start
        ]
        
        if len(self.requests[client_id]) < self.limit:
            self.requests[client_id].append(current_time)
            return True
        return False
    
    def reset(self):
        self.requests.clear()

# ============= Global State =============

class ExperimentState:
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.is_running = False
        self.current_strategy = RateLimitStrategy.NO_LIMIT
        self.num_clients = 10
        self.requests_per_second = 50
        self.rate_limit = 10  # requests per window
        self.window_seconds = 1
        
        # Metrics
        self.total_requests = 0
        self.accepted_requests = 0
        self.rejected_requests = 0
        self.response_times: List[float] = []
        self.time_series_data: List[Dict] = []
        self.start_time: Optional[float] = None
        
        # Rate limiters
        self.rate_limiters: Dict[str, RateLimiter] = {
            RateLimitStrategy.NO_LIMIT: NoLimitRateLimiter(),
            RateLimitStrategy.FIXED_WINDOW: FixedWindowRateLimiter(limit=10, window_seconds=1),
            RateLimitStrategy.SLIDING_WINDOW: SlidingWindowRateLimiter(limit=10, window_seconds=1),
        }
        
        # Comparison results
        self.comparison_results: List[Dict] = []
    
    def get_rate_limiter(self) -> RateLimiter:
        return self.rate_limiters[self.current_strategy]
    
    def update_rate_limits(self, limit: int, window_seconds: int = 1):
        self.rate_limit = limit
        self.window_seconds = window_seconds
        self.rate_limiters[RateLimitStrategy.FIXED_WINDOW] = FixedWindowRateLimiter(limit, window_seconds)
        self.rate_limiters[RateLimitStrategy.SLIDING_WINDOW] = SlidingWindowRateLimiter(limit, window_seconds)

experiment_state = ExperimentState()

# WebSocket connections
connected_clients: List[WebSocket] = []

# ============= Pydantic Models =============

class ExperimentConfig(BaseModel):
    strategy: RateLimitStrategy = RateLimitStrategy.NO_LIMIT
    num_clients: int = Field(default=10, ge=1, le=100)
    requests_per_second: int = Field(default=50, ge=1, le=500)
    rate_limit: int = Field(default=10, ge=1, le=100)
    duration_seconds: int = Field(default=5, ge=1, le=30)

class MetricsResponse(BaseModel):
    total_requests: int
    accepted_requests: int
    rejected_requests: int
    avg_response_time: float
    requests_per_second: float
    rejection_rate: float
    is_running: bool
    current_strategy: str
    time_series_data: List[Dict]

class ComparisonResult(BaseModel):
    strategy: str
    total_requests: int
    accepted_requests: int
    rejected_requests: int
    avg_response_time: float
    rejection_rate: float
    throughput: float
    stability_score: float

# ============= Helper Functions =============

async def broadcast_metrics():
    """Broadcast current metrics to all connected WebSocket clients"""
    if not connected_clients:
        return
    
    metrics = get_current_metrics()
    message = json.dumps({
        "type": "metrics_update",
        "data": metrics
    })
    
    disconnected = []
    for client in connected_clients:
        try:
            await client.send_text(message)
        except Exception:
            disconnected.append(client)
    
    for client in disconnected:
        if client in connected_clients:
            connected_clients.remove(client)

def get_current_metrics() -> Dict:
    """Get current experiment metrics"""
    state = experiment_state
    
    avg_response_time = 0.0
    if state.response_times:
        avg_response_time = sum(state.response_times) / len(state.response_times)
    
    elapsed_time = 0.0
    if state.start_time:
        elapsed_time = time.time() - state.start_time
    
    rps = state.total_requests / elapsed_time if elapsed_time > 0 else 0
    rejection_rate = (state.rejected_requests / state.total_requests * 100) if state.total_requests > 0 else 0
    
    return {
        "total_requests": state.total_requests,
        "accepted_requests": state.accepted_requests,
        "rejected_requests": state.rejected_requests,
        "avg_response_time": round(avg_response_time, 2),
        "requests_per_second": round(rps, 2),
        "rejection_rate": round(rejection_rate, 2),
        "is_running": state.is_running,
        "current_strategy": state.current_strategy.value,
        "time_series_data": state.time_series_data[-60:],  # Last 60 data points
        "comparison_results": state.comparison_results
    }

def calculate_stability_score(response_times: List[float], rejection_rate: float) -> float:
    """Calculate stability score based on response time variance and rejection rate"""
    if not response_times:
        return 0.0
    
    avg = sum(response_times) / len(response_times)
    variance = sum((t - avg) ** 2 for t in response_times) / len(response_times)
    std_dev = variance ** 0.5
    
    # Lower variance and lower rejection rate = higher stability
    variance_score = max(0, 100 - (std_dev * 10))
    rejection_score = max(0, 100 - rejection_rate)
    
    return round((variance_score + rejection_score) / 2, 2)

def generate_analysis_text(results: List[Dict]) -> str:
    """Generate dynamic analysis based on experiment results"""
    if not results:
        return "Run experiments to generate analysis."
    
    analysis_parts = []
    
    # Find strategy with highest throughput
    max_throughput = max(r.get("throughput", 0) for r in results)
    best_throughput = [r for r in results if r.get("throughput", 0) == max_throughput]
    
    # Find strategy with best stability
    max_stability = max(r.get("stability_score", 0) for r in results)
    best_stability = [r for r in results if r.get("stability_score", 0) == max_stability]
    
    # Find strategy with lowest rejection rate
    min_rejection = min(r.get("rejection_rate", 100) for r in results)
    lowest_rejection = [r for r in results if r.get("rejection_rate", 100) == min_rejection]
    
    # No limit analysis
    no_limit = next((r for r in results if r["strategy"] == "no_limit"), None)
    if no_limit:
        if no_limit["rejection_rate"] == 0:
            analysis_parts.append(
                f"Without rate limiting, all {no_limit['total_requests']} requests were accepted, "
                f"achieving maximum throughput of {no_limit['throughput']:.1f} req/s. "
                f"However, this approach can lead to server overload under sustained high traffic."
            )
    
    # Fixed window analysis
    fixed = next((r for r in results if r["strategy"] == "fixed_window"), None)
    if fixed:
        analysis_parts.append(
            f"Fixed Window limiting rejected {fixed['rejected_requests']} requests ({fixed['rejection_rate']:.1f}% rejection rate). "
            f"This strategy provides protection but may allow bursts at window boundaries, "
            f"with a stability score of {fixed['stability_score']:.1f}."
        )
    
    # Sliding window analysis
    sliding = next((r for r in results if r["strategy"] == "sliding_window"), None)
    if sliding:
        analysis_parts.append(
            f"Sliding Window limiting achieved the most precise control with {sliding['rejection_rate']:.1f}% rejection rate. "
            f"It provides smoother rate enforcement with stability score of {sliding['stability_score']:.1f}, "
            f"making it ideal for scenarios requiring consistent throughput."
        )
    
    # Comparative conclusion
    if len(results) >= 2:
        if best_stability and best_stability[0]["strategy"] != "no_limit":
            analysis_parts.append(
                f"\nConclusion: For production systems requiring stability, "
                f"'{best_stability[0]['strategy'].replace('_', ' ').title()}' provides the best balance "
                f"with {best_stability[0]['stability_score']:.1f} stability score while maintaining "
                f"{best_stability[0]['throughput']:.1f} req/s throughput."
            )
    
    return " ".join(analysis_parts) if analysis_parts else "Insufficient data for analysis."

# ============= API Endpoints =============

@api_router.get("/")
async def root():
    return {"message": "Rate Limiting Strategy Analyzer API"}

@api_router.get("/data")
async def get_data(client_id: str = Query(default="default")):
    """
    Main data endpoint with rate limiting applied based on current strategy
    """
    state = experiment_state
    start_time = time.time()
    
    # Simulate some processing time (5-20ms)
    await asyncio.sleep(random.uniform(0.005, 0.020))
    
    rate_limiter = state.get_rate_limiter()
    is_allowed = rate_limiter.is_allowed(client_id)
    
    response_time = (time.time() - start_time) * 1000  # Convert to ms
    
    # Update metrics
    state.total_requests += 1
    state.response_times.append(response_time)
    
    if is_allowed:
        state.accepted_requests += 1
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Request accepted",
                "client_id": client_id,
                "response_time_ms": round(response_time, 2),
                "strategy": state.current_strategy.value
            }
        )
    else:
        state.rejected_requests += 1
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "message": "Rate limit exceeded",
                "client_id": client_id,
                "response_time_ms": round(response_time, 2),
                "strategy": state.current_strategy.value
            }
        )

@api_router.get("/metrics")
async def get_metrics():
    """Get current experiment metrics"""
    return get_current_metrics()

@api_router.post("/experiment/start")
async def start_experiment(config: ExperimentConfig):
    """Start a new experiment with the given configuration"""
    state = experiment_state
    
    if state.is_running:
        return {"error": "Experiment already running"}
    
    # Reset state
    state.reset()
    state.current_strategy = config.strategy
    state.num_clients = config.num_clients
    state.requests_per_second = config.requests_per_second
    state.update_rate_limits(config.rate_limit)
    state.is_running = True
    state.start_time = time.time()
    
    # Start the load simulation in background
    asyncio.create_task(run_load_simulation(config.duration_seconds))
    
    return {
        "status": "started",
        "config": {
            "strategy": config.strategy.value,
            "num_clients": config.num_clients,
            "requests_per_second": config.requests_per_second,
            "rate_limit": config.rate_limit,
            "duration_seconds": config.duration_seconds
        }
    }

@api_router.post("/experiment/stop")
async def stop_experiment():
    """Stop the current experiment"""
    experiment_state.is_running = False
    return {"status": "stopped", "metrics": get_current_metrics()}

@api_router.post("/experiment/run-all")
async def run_all_strategies(config: ExperimentConfig):
    """Run experiment with all strategies and compare results"""
    state = experiment_state
    
    if state.is_running:
        return {"error": "Experiment already running"}
    
    state.comparison_results = []
    strategies = [
        RateLimitStrategy.NO_LIMIT,
        RateLimitStrategy.FIXED_WINDOW,
        RateLimitStrategy.SLIDING_WINDOW
    ]
    
    for strategy in strategies:
        # Reset for each strategy
        state.reset()
        state.current_strategy = strategy
        state.num_clients = config.num_clients
        state.requests_per_second = config.requests_per_second
        state.update_rate_limits(config.rate_limit)
        state.is_running = True
        state.start_time = time.time()
        
        # Run simulation
        await run_load_simulation(config.duration_seconds, broadcast=True)
        
        # Calculate metrics
        elapsed = time.time() - state.start_time if state.start_time else 1
        avg_response = sum(state.response_times) / len(state.response_times) if state.response_times else 0
        rejection_rate = (state.rejected_requests / state.total_requests * 100) if state.total_requests > 0 else 0
        throughput = state.accepted_requests / elapsed if elapsed > 0 else 0
        
        result = {
            "strategy": strategy.value,
            "total_requests": state.total_requests,
            "accepted_requests": state.accepted_requests,
            "rejected_requests": state.rejected_requests,
            "avg_response_time": round(avg_response, 2),
            "rejection_rate": round(rejection_rate, 2),
            "throughput": round(throughput, 2),
            "stability_score": calculate_stability_score(state.response_times, rejection_rate)
        }
        state.comparison_results.append(result)
        
        # Broadcast progress
        await broadcast_metrics()
        
        # Small delay between strategies
        await asyncio.sleep(0.5)
    
    state.is_running = False
    
    # Generate analysis
    analysis = generate_analysis_text(state.comparison_results)
    
    return {
        "status": "completed",
        "results": state.comparison_results,
        "analysis": analysis
    }

@api_router.get("/comparison")
async def get_comparison():
    """Get comparison results from last run-all experiment"""
    return {
        "results": experiment_state.comparison_results,
        "analysis": generate_analysis_text(experiment_state.comparison_results)
    }

async def run_load_simulation(duration_seconds: int, broadcast: bool = True):
    """Simulate load from multiple clients"""
    state = experiment_state
    end_time = time.time() + duration_seconds
    interval = 1.0 / state.requests_per_second if state.requests_per_second > 0 else 0.1
    
    last_broadcast = time.time()
    last_time_series = time.time()
    
    while time.time() < end_time and state.is_running:
        # Simulate requests from multiple clients
        tasks = []
        for i in range(min(state.num_clients, 10)):  # Batch requests
            client_id = f"client_{i % state.num_clients}"
            tasks.append(simulate_request(client_id))
        
        await asyncio.gather(*tasks)
        
        # Record time series data every 200ms
        current_time = time.time()
        if current_time - last_time_series >= 0.2:
            elapsed = current_time - state.start_time if state.start_time else 0
            rejection_rate = (state.rejected_requests / state.total_requests * 100) if state.total_requests > 0 else 0
            
            state.time_series_data.append({
                "time": round(elapsed, 1),
                "total": state.total_requests,
                "accepted": state.accepted_requests,
                "rejected": state.rejected_requests,
                "rejection_rate": round(rejection_rate, 2)
            })
            last_time_series = current_time
        
        # Broadcast metrics every 100ms
        if broadcast and current_time - last_broadcast >= 0.1:
            await broadcast_metrics()
            last_broadcast = current_time
        
        await asyncio.sleep(interval)
    
    state.is_running = False
    if broadcast:
        await broadcast_metrics()

async def simulate_request(client_id: str):
    """Simulate a single request"""
    state = experiment_state
    start_time = time.time()
    
    # Simulate network latency
    await asyncio.sleep(random.uniform(0.001, 0.005))
    
    rate_limiter = state.get_rate_limiter()
    is_allowed = rate_limiter.is_allowed(client_id)
    
    response_time = (time.time() - start_time) * 1000
    
    state.total_requests += 1
    state.response_times.append(response_time)
    
    if is_allowed:
        state.accepted_requests += 1
    else:
        state.rejected_requests += 1

# ============= WebSocket Endpoint =============

@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time metrics updates"""
    await websocket.accept()
    connected_clients.append(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(connected_clients)}")
    
    try:
        # Send initial metrics
        await websocket.send_text(json.dumps({
            "type": "connected",
            "data": get_current_metrics()
        }))
        
        while True:
            # Keep connection alive and handle incoming messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif message.get("type") == "get_metrics":
                    await websocket.send_text(json.dumps({
                        "type": "metrics_update",
                        "data": get_current_metrics()
                    }))
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        logger.info(f"WebSocket client removed. Total clients: {len(connected_clients)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    # Close all WebSocket connections
    for client in connected_clients:
        try:
            await client.close()
        except Exception:
            pass
    connected_clients.clear()
