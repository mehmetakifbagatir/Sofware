# Rate Limiting Strategy Analyzer - PRD

## Original Problem Statement
Build a full-stack experimental system to analyze rate limiting strategies in web applications. The system must focus on comparing different approaches and generating measurable insights.

## Architecture
- **Backend**: FastAPI (Python) with WebSocket support for real-time updates
- **Frontend**: React with Recharts for data visualization
- **Storage**: In-memory (no database required as per requirements)
- **Communication**: HTTP REST APIs + WebSocket for live metrics

## User Personas
1. **System Architect**: Needs to understand which rate limiting strategy is best for their use case
2. **DevOps Engineer**: Wants to measure system performance under different load conditions
3. **Security Engineer**: Evaluating protection mechanisms against request floods

## Core Requirements (Static)
- [x] No Rate Limiting mode
- [x] Fixed Window Rate Limiting
- [x] Sliding Window Rate Limiting
- [x] GET /api/data endpoint with simulated processing time
- [x] Load simulation (1-100 clients, configurable RPS)
- [x] Metrics: total, accepted, rejected requests, response time, RPS
- [x] Control panel with strategy selection, sliders, start/stop
- [x] Real-time metrics display
- [x] Charts: requests over time, rejection rate
- [x] Comparison table after Run All
- [x] Dynamic analysis text generation

## What's Been Implemented (Jan 8, 2026)

### Backend (server.py)
- Rate limiter classes: NoLimit, FixedWindow, SlidingWindow
- ExperimentState class for managing metrics
- WebSocket endpoint /api/ws for real-time updates
- API endpoints: /api/data, /api/metrics, /api/experiment/start, /api/experiment/stop, /api/experiment/run-all

### Frontend Components
- ControlPanel.jsx: Strategy select, sliders (clients, rate, limit, duration), Start/Stop/Run All buttons
- MetricsGrid.jsx: 4 metric cards + throughput/rejection rate displays
- ChartsSection.jsx: Requests over time + Rejection rate charts
- ComparisonTable.jsx: Strategy comparison with bar chart + data table
- AnalysisSection.jsx: Dynamic analysis text with key takeaways

### Design
- Dark professional theme (#0A0A0A background)
- Cyan/teal accent colors (#00E5FF)
- Fonts: Manrope, IBM Plex Sans, IBM Plex Mono
- Card-based layout with glassmorphism control panel

## Prioritized Backlog

### P0 (Completed)
- All core features implemented and tested

### P1 (Future Enhancements)
- [ ] Token Bucket rate limiting algorithm (mentioned as optional advanced feature)
- [ ] Export comparison results to CSV/JSON
- [ ] Historical experiment storage (localStorage or database)

### P2 (Nice to Have)
- [ ] Add more detailed latency distribution charts (percentiles)
- [ ] Visual burst detection in charts
- [ ] Customizable rate limit windows (5s, 10s, 30s)
- [ ] API documentation page

## Test Status
- Backend: 100% (10/10 tests passed)
- Frontend: 95% (minor chart console warnings fixed)

## Next Tasks
1. Consider adding Token Bucket algorithm
2. Add export functionality for analysis results
3. Add persistent storage for historical experiments
