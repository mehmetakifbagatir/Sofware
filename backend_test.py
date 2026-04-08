#!/usr/bin/env python3
"""
Backend API Testing for Rate Limiting Strategy Analyzer
Tests all API endpoints and WebSocket functionality
"""

import requests
import json
import time
import asyncio
import websockets
import sys
from datetime import datetime

# Use the public endpoint from frontend .env
BACKEND_URL = "https://throttle-analyzer.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"
WS_URL = f"wss://throttle-analyzer.preview.emergentagent.com/api/ws"

class RateLimitAPITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/")
            success = response.status_code == 200
            data = response.json() if success else {}
            details = f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}"
            return self.log_test("Root API Endpoint", success, details)
        except Exception as e:
            return self.log_test("Root API Endpoint", False, f"Error: {str(e)}")

    def test_data_endpoint(self):
        """Test the /api/data endpoint with different client IDs"""
        try:
            # Test with default client
            response = self.session.get(f"{API_BASE}/data")
            success = response.status_code in [200, 429]  # Both are valid responses
            
            if success:
                data = response.json()
                has_required_fields = all(key in data for key in ['success', 'message', 'client_id', 'response_time_ms', 'strategy'])
                success = has_required_fields
                details = f"Status: {response.status_code}, Strategy: {data.get('strategy', 'N/A')}"
            else:
                details = f"Status: {response.status_code}"
                
            return self.log_test("Data Endpoint", success, details)
        except Exception as e:
            return self.log_test("Data Endpoint", False, f"Error: {str(e)}")

    def test_data_endpoint_with_client_id(self):
        """Test the /api/data endpoint with specific client ID"""
        try:
            response = self.session.get(f"{API_BASE}/data?client_id=test_client_123")
            success = response.status_code in [200, 429]
            
            if success:
                data = response.json()
                client_id_correct = data.get('client_id') == 'test_client_123'
                success = client_id_correct
                details = f"Status: {response.status_code}, Client ID: {data.get('client_id', 'N/A')}"
            else:
                details = f"Status: {response.status_code}"
                
            return self.log_test("Data Endpoint with Client ID", success, details)
        except Exception as e:
            return self.log_test("Data Endpoint with Client ID", False, f"Error: {str(e)}")

    def test_metrics_endpoint(self):
        """Test the /api/metrics endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/metrics")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = [
                    'total_requests', 'accepted_requests', 'rejected_requests',
                    'avg_response_time', 'requests_per_second', 'rejection_rate',
                    'is_running', 'current_strategy', 'time_series_data'
                ]
                has_all_fields = all(field in data for field in required_fields)
                success = has_all_fields
                details = f"Status: {response.status_code}, Running: {data.get('is_running', 'N/A')}, Strategy: {data.get('current_strategy', 'N/A')}"
            else:
                details = f"Status: {response.status_code}"
                
            return self.log_test("Metrics Endpoint", success, details)
        except Exception as e:
            return self.log_test("Metrics Endpoint", False, f"Error: {str(e)}")

    def test_start_experiment(self):
        """Test starting an experiment"""
        try:
            config = {
                "strategy": "no_limit",
                "num_clients": 5,
                "requests_per_second": 20,
                "rate_limit": 10,
                "duration_seconds": 2
            }
            
            response = self.session.post(f"{API_BASE}/experiment/start", json=config)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_status = 'status' in data and data['status'] == 'started'
                has_config = 'config' in data
                success = has_status and has_config
                details = f"Status: {response.status_code}, Experiment Status: {data.get('status', 'N/A')}"
            else:
                details = f"Status: {response.status_code}"
                
            return self.log_test("Start Experiment", success, details)
        except Exception as e:
            return self.log_test("Start Experiment", False, f"Error: {str(e)}")

    def test_stop_experiment(self):
        """Test stopping an experiment"""
        try:
            # Wait a moment for experiment to run
            time.sleep(1)
            
            response = self.session.post(f"{API_BASE}/experiment/stop")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_status = 'status' in data and data['status'] == 'stopped'
                has_metrics = 'metrics' in data
                success = has_status and has_metrics
                details = f"Status: {response.status_code}, Experiment Status: {data.get('status', 'N/A')}"
            else:
                details = f"Status: {response.status_code}"
                
            return self.log_test("Stop Experiment", success, details)
        except Exception as e:
            return self.log_test("Stop Experiment", False, f"Error: {str(e)}")

    def test_run_all_strategies(self):
        """Test running all strategies experiment"""
        try:
            config = {
                "strategy": "no_limit",  # This will be ignored for run-all
                "num_clients": 3,
                "requests_per_second": 15,
                "rate_limit": 5,
                "duration_seconds": 1  # Short duration for testing
            }
            
            print("   Starting run-all experiment (this may take a few seconds)...")
            response = self.session.post(f"{API_BASE}/experiment/run-all", json=config)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_status = 'status' in data and data['status'] == 'completed'
                has_results = 'results' in data and isinstance(data['results'], list)
                has_analysis = 'analysis' in data
                
                # Check if we have results for all 3 strategies
                strategies_found = set()
                if has_results:
                    for result in data['results']:
                        if 'strategy' in result:
                            strategies_found.add(result['strategy'])
                
                expected_strategies = {'no_limit', 'fixed_window', 'sliding_window'}
                has_all_strategies = strategies_found == expected_strategies
                
                success = has_status and has_results and has_analysis and has_all_strategies
                details = f"Status: {response.status_code}, Results: {len(data.get('results', []))}, Strategies: {list(strategies_found)}"
            else:
                details = f"Status: {response.status_code}"
                
            return self.log_test("Run All Strategies", success, details)
        except Exception as e:
            return self.log_test("Run All Strategies", False, f"Error: {str(e)}")

    def test_comparison_endpoint(self):
        """Test the comparison endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/comparison")
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_results = 'results' in data
                has_analysis = 'analysis' in data
                success = has_results and has_analysis
                details = f"Status: {response.status_code}, Results: {len(data.get('results', []))}"
            else:
                details = f"Status: {response.status_code}"
                
            return self.log_test("Comparison Endpoint", success, details)
        except Exception as e:
            return self.log_test("Comparison Endpoint", False, f"Error: {str(e)}")

    async def test_websocket_connection(self):
        """Test WebSocket connection and message handling"""
        try:
            async with websockets.connect(WS_URL) as websocket:
                # Wait for initial connection message
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                # Check if it's a connection message with metrics
                is_connected = data.get('type') in ['connected', 'metrics_update']
                has_data = 'data' in data
                
                if is_connected and has_data:
                    # Send a ping message
                    await websocket.send(json.dumps({"type": "ping"}))
                    
                    # Wait for pong response
                    pong_message = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                    pong_data = json.loads(pong_message)
                    is_pong = pong_data.get('type') == 'pong'
                    
                    success = is_pong
                    details = f"Connected, received: {data.get('type')}, ping-pong: {is_pong}"
                else:
                    success = False
                    details = f"Invalid connection message: {data.get('type')}"
                    
                return self.log_test("WebSocket Connection", success, details)
                
        except Exception as e:
            return self.log_test("WebSocket Connection", False, f"Error: {str(e)}")

    def test_rate_limiting_behavior(self):
        """Test actual rate limiting behavior"""
        try:
            # First, start an experiment with fixed window rate limiting
            config = {
                "strategy": "fixed_window",
                "num_clients": 1,
                "requests_per_second": 50,
                "rate_limit": 2,  # Very low limit to trigger rate limiting
                "duration_seconds": 1
            }
            
            start_response = self.session.post(f"{API_BASE}/experiment/start", json=config)
            if start_response.status_code != 200:
                return self.log_test("Rate Limiting Behavior", False, "Failed to start experiment")
            
            # Wait for experiment to start
            time.sleep(0.5)
            
            # Make multiple rapid requests to trigger rate limiting
            responses = []
            for i in range(5):
                response = self.session.get(f"{API_BASE}/data?client_id=rate_test_client")
                responses.append(response.status_code)
                time.sleep(0.1)  # Small delay between requests
            
            # Stop the experiment
            self.session.post(f"{API_BASE}/experiment/stop")
            
            # Check if we got both 200 (accepted) and 429 (rate limited) responses
            has_accepted = 200 in responses
            has_rate_limited = 429 in responses
            
            success = has_accepted and has_rate_limited
            details = f"Response codes: {responses}, Has both accepted and rate-limited: {success}"
            
            return self.log_test("Rate Limiting Behavior", success, details)
            
        except Exception as e:
            return self.log_test("Rate Limiting Behavior", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Rate Limiting API Tests")
        print(f"📍 Testing endpoint: {API_BASE}")
        print(f"🔗 WebSocket endpoint: {WS_URL}")
        print("=" * 60)
        
        # Basic API tests
        self.test_root_endpoint()
        self.test_data_endpoint()
        self.test_data_endpoint_with_client_id()
        self.test_metrics_endpoint()
        
        # Experiment management tests
        self.test_start_experiment()
        self.test_stop_experiment()
        
        # Wait a moment before running comprehensive test
        time.sleep(1)
        
        # Comprehensive tests
        self.test_run_all_strategies()
        self.test_comparison_endpoint()
        
        # Rate limiting behavior test
        self.test_rate_limiting_behavior()
        
        # WebSocket test (async)
        try:
            asyncio.run(self.test_websocket_connection())
        except Exception as e:
            self.log_test("WebSocket Connection", False, f"Async error: {str(e)}")
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    """Main test function"""
    tester = RateLimitAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())