# KHT AI VISION — Product Requirements Document

## Original Problem Statement
"buatkan aplikasi rating alat Komatsu hot tube tester dengan feature AI VISION yang canggih dan otomatis dengan feature seperti pada gambar sehingga memudahkan hasil data analisa dan report hasil uji test."
(Build a mobile rating app for the Komatsu Hot Tube Tester with an advanced automatic AI Vision feature — like the reference dashboard image — to ease data analysis and reporting of test results.)

## User Choices
- AI Vision: REAL AI using **Gemini 3.1 Pro Vision** (`gemini-3.1-pro-preview`) via Emergent LLM key.
- Image input: **Camera + Gallery**.
- Auth: **None** (opens directly to app).
- Storage: **MongoDB** for records + **Emergent Managed Object Storage** for tube photos.
- Reporting: **In-app summary + PDF export**.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB (motor). Object storage handshake (`init/put/get`). Gemini vision via `emergentintegrations`. All routes prefixed `/api`.
- **Frontend**: Expo Router (file-based), React Query for data, dark industrial theme in `src/theme.ts`, Barlow Condensed + JetBrains Mono fonts, phosphor icons, react-native-svg gauges/charts, expo-image-picker, expo-print/sharing.
- Navigation: bottom tabs — Dashboard, New Test, History, Trend + Settings modal + Result stack screen.

## User Personas
- **Lab operator / technician**: runs hot-tube deposit tests, needs quick objective rating and a shareable report.
- **QA / lubricant engineer**: reviews history and rating trends across batches.

## Core Requirements (static)
1. Capture/upload a glass tube photo and get an automatic 0–10 KHT deposit rating with PASS/FAIL.
2. Show AI parameters (deposit area %, length mm, coverage %, L*/a*/b*, max intensity, thickness index).
3. KHT standard rating reference scale (10→0-1 color bands).
4. History with search + Pass/Fail filter; per-test detail with heatmap/original tube viewer.
5. Rating trend chart over time.
6. Export a formatted PDF report and share.

## Implemented (2026-06-09)
- Backend endpoints: `/api/dashboard`, `/api/tests` (+search), `/api/tests/{id}`, `/api/analyze`, `/api/upload`, `/api/files/{path}`, `/api/trend`, `DELETE /api/tests/{id}` (soft delete). 13/13 backend tests passing.
- Real Gemini 3.1 Pro vision analysis pipeline (upload → object storage → base64 → structured JSON → persist).
- 4 auto-seeded demo records (ratings 8.7, 6.2, 9.4, 4.1).
- Dashboard (rating gauge, PASS badge, KHT scale, stats, parameter table, test info, full reference).
- New Test (camera/gallery with permission handling, metadata form, sticky analyze CTA, keyboard-aware).
- Result screen (heatmap/original tube viewer w/ mm ruler, gauge, parameters, PDF export, delete).
- History (search + Pass/Fail chips + record rows).
- Trend (SVG line chart with PASS threshold + data-point list).
- Settings modal (default conditions, model info, KHT reference detail).

## Backlog / Remaining
- **P1**: Live camera preview / IP-webcam capture mode; auto-crop tube ROI before analysis.
- **P1**: Side-by-side Original vs Heatmap comparison view.
- **P2**: Export raw data as CSV/Excel; batch export of multiple reports.
- **P2**: Per-operator dashboards and multi-device sync; calibration reference-sample workflow.
- **P2**: Filter/sort history by oil type, date range, rating band.

## Next Tasks
- Gather user feedback on rating accuracy vs their standard reference samples.
- Consider a "reference calibration" flow so the AI can be tuned to a lab's known-good tubes.
