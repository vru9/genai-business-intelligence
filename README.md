# Insight BI · Group 8 · Division B · Batch B3

## GenAI Powered Business Intelligence and Strategic Insight Generation System

A college mini project that turns CSV sales data into business dashboards, grounded explanations, and strategic what-if scenarios.

**Group 8 · Division B · Batch B3 · K.J Somaiya School of Engineering · IT (AI & DS) · 2026–2027**

| Team member | Roll number |
|---|---|
| Vruddhi Mule | 16014223099 |
| Rajdeep Pandey | 16014223064 |
| Sagar Jadhav | 16014223070 |

![Insight BI dashboard](docs/screenshots/dashboard.jpg)

## What works

- Revenue, gross profit, gross margin, orders, and average order value.
- Monthly revenue/profit chart and revenue share by product category.
- Region and date filters; searchable, paginated data explorer.
- CSV upload with strict validation, sample download, and filtered export.
- Rule-based insight cards and a conversational demo that works without a key.
- Real Gemini API integration through a server-side endpoint when configured.
- Price, volume, and unit-cost scenarios with transparent formulas.
- Downloadable business reports; editable academic project report and PDF.
- Responsive desktop and mobile layouts, labeled controls, keyboard support.

**Honest AI status:** the default application uses deterministic demo responses. Actual generative AI requires your own Gemini API key and an available model. Live provider calls were not tested without a key. Provider requests and failure handling are tested with mocks. This is not a trained custom ML model, RAG system, or predictive forecasting engine.

## Run locally

Install Node.js **22.13 or newer** (Node 22 LTS recommended) and npm.

```bash
git clone https://github.com/vru9/genai-business-intelligence.git
cd genai-business-intelligence
npm ci
npm run dev
```

Open the local address printed in the terminal (normally `http://127.0.0.1:5173`). No API key or database is needed for the sample demo. Uploads are held in memory and reset when you refresh.

### Enable Gemini optionally

1. Obtain a Gemini API key through [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.dev.vars.example` to `.dev.vars` in the project root.
3. Set `GEMINI_API_KEY` and a model available to your Google account. `GEMINI_MODEL` defaults to `gemini-3.8-flash`, following the current [Generate Content documentation](https://ai.google.dev/api/generate-content). Override it if your account uses another supported model.
4. Restart the dev server. The interface should show **Gemini connected**.

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash
```

`.dev.vars` is ignored by Git. Never put a real key in `.dev.vars.example`, frontend code, screenshots, or commits. On hosted Sites, configure these names as server environment variables. API usage and billing depend on the provider account.

The browser sends the selected records to this app's backend on an explicit question. The backend validates them and recomputes the metrics. Only the question and calculated summaries go to Gemini. Responses are rendered as text, with no executable model-generated HTML. Dataset labels are treated as untrusted context in the prompt.

## CSV format

A complete example is [data/sample-retail-data.csv](data/sample-retail-data.csv).

```csv
date,category,region,channel,revenue,cost,orders
2025-01-10,Electronics,West,Online,100000,72000,50
2025-02-10,Furniture,East,Retail,80000,64000,20
```

| Column | Rule |
|---|---|
| `date` | Required, real `YYYY-MM-DD` date between 1900 and 2100 |
| `category` | Required, 1–80 characters |
| `region` | Required, 1–80 characters |
| `channel` | Optional; defaults to `Direct` when column is absent |
| `revenue` | Required, non-negative amount in INR |
| `cost` | Required, non-negative amount in INR |
| `orders` | Required, non-negative whole number |

Limit: 2 MB, 10,000 rows, 50 distinct values per grouping dimension, and at most 3,660 days of coverage. Numeric values are capped at 1 trillion per row. Quoted commas and escaped quotation marks are supported. Invalid rows reject the entire upload with an error; the previous dataset is preserved. Duplicate rows are not automatically removed, because identical aggregate records can be legitimate. Negative values and returns are outside this version's schema.

A row can represent a transaction or an aggregate. `orders` is summed, not inferred from row count. All rows must use a consistent currency and cost definition. Formula-like text labels are escaped when exporting CSV to reduce spreadsheet formula execution.

## Architecture

```mermaid
flowchart LR
  CSV[CSV or synthetic sample] --> Validate[Browser validation]
  Validate --> State[In-memory React state]
  State --> Filter[Region and month filters]
  Filter --> Metrics[Shared analytics module]
  Metrics --> Dashboard[Charts and KPI cards]
  Metrics --> Scenario[Deterministic scenario calculator]
  Filter --> API[POST /api/insights]
  API --> Recompute[Validate and recompute]
  Recompute --> Mode{API key configured}
  Mode -->|No| Rules[Rule-based demo answer]
  Mode -->|Yes| Gemini[Gemini Generate Content API]
  Rules --> UI[Plain text response]
  Gemini --> UI
```

The application uses React and TypeScript with Vinext's App Router compatibility, Vite, and Cloudflare Workers. The Sites build integration in `vite.config.ts` prepares hosted deployment. There is no application database or dataset persistence in this version. Unused storage/UI scaffolding comes from the hosting starter.

## Important files

| Path | Purpose |
|---|---|
| `app/page.tsx` | Dashboard, explorer, AI chat, scenarios, project guide |
| `app/globals.css` | Responsive layout and visual styling |
| `lib/analytics.ts` | CSV parsing, validation, sample data, KPIs, demo rules, scenarios |
| `lib/ai.ts` | Grounded provider request and demo mode routing |
| `app/api/insights/route.ts` | Same-origin API and runtime configuration |
| `tests/analytics.test.mjs` | Automated analytics and provider contract tests |
| `docs/project-report.docx` | Editable academic project report |
| `docs/project-report.pdf` | PDF academic project report |
| `scripts/build-report.py` | Reproducible report authoring source |

## Calculations

- Revenue = sum of revenue; cost = sum of cost.
- Gross profit = revenue − cost; gross margin = gross profit / revenue × 100.
- Average order value = revenue / orders.
- Latest month growth compares only consecutive calendar months; it is unavailable when the previous month is absent or has zero revenue.
- Scenario revenue = revenue × (1 + price change) × (1 + volume change).
- Scenario cost = cost × (1 + volume change) × (1 + unit cost change).
- Scenario gross profit = scenario revenue − scenario cost.

Percentage inputs are divided by 100. Zero revenue/order denominators display zero to keep the UI finite; interpret these cases as unavailable ratios. Gross profit is not net profit unless the supplied cost field includes all relevant expenses. In the scenario model all recorded costs scale with volume; fixed costs and price elasticity are not modeled. Monthly data can be incomplete. The default synthetic dataset has 288 records from January–June 2025; it is not evidence of real company performance.

## Verify and build

```bash
npm test
npm run typecheck
npm run build
npm start
```

The automated suite has 14 tests covering aggregations, date filtering, CSV parsing and validation, zero-data behavior, missing months, scenario math, export escaping, size limits, demo answers, mocked Gemini requests, and provider errors. Browser checks include upload, search, region filtering, AI demo responses, scenario adjustment/reset, export, and responsive layout. Live Gemini quality and load testing remain future validation tasks.

## Demonstration for faculty

1. Open Overview and explain the four KPIs.
2. Select West and show that every chart and insight uses the same filtered data.
3. Open Data explorer, upload the sample CSV, and search for Furniture.
4. Open AI insights and choose “Summarize business performance.” Explain demo mode versus the configured generative mode.
5. Open Strategy lab and change price/volume assumptions; reset to reproduce baseline values.
6. Export the business report and explain why a scenario is not a forecast.
7. Review the test suite and project report.

## Hosting and access

Hosted URL: https://insight-bi-vruddhi.rajdeepvp273.chatgpt.site

The hosted demo is public and can be opened by anyone with the website link. Faculty can also access this public GitHub repository, download the report, and run the app locally. The demo works without a provider key; no production API secret is included in the repository.

## Academic report

Read [the PDF report](docs/project-report.pdf) or edit [the Word report](docs/project-report.docx). The report distinguishes implemented features, verified results, assumptions, and future work. It does not claim live LLM validation or forecasting accuracy.

## References

- [Google Gemini Generate Content API](https://ai.google.dev/api/generate-content)
- [React documentation](https://react.dev/learn)
- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/)
- [Node.js test runner](https://nodejs.org/api/test.html)
