"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  FlaskConical,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet,
  X,
  ShoppingBag,
  CircleDollarSign,
  Target,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  currency,
  filterRows,
  insights,
  parseCSV,
  percent,
  sampleData,
  scenario,
  summarize,
  toCSV,
  type Sale,
  type Summary,
} from "@/lib/analytics";

type Page =
  | "Overview"
  | "Data explorer"
  | "AI insights"
  | "Strategy lab"
  | "Project guide";
const nav = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Data explorer", icon: Database },
  { name: "AI insights", icon: Sparkles },
  { name: "Strategy lab", icon: FlaskConical },
] as const;
const colors = ["#287b60", "#75a88a", "#b8cd9a", "#e8c98b", "#9ba7b8"];
function download(name: string, content: string, type = "text/plain") {
  const a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const monthLabel = (s: string) =>
  new Date(s + "-01T00:00:00Z").toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
function TrendChart({ summary: s }: { summary: Summary }) {
  const values = s.months;
  if (!values.length)
    return <div className="empty">No data for this selection.</div>;
  const max = Math.max(...values.map((m) => m.revenue), 1) * 1.15,
    min = Math.min(0, ...values.map((m) => m.profit));
  const x = (i: number) => 65 + (i * 575) / Math.max(1, values.length - 1),
    y = (v: number) => 210 - ((v - min) / (max - min)) * 175;
  const line = (key: "revenue" | "profit") =>
    values.map((m, i) => `${i ? "L" : "M"}${x(i)},${y(m[key])}`).join(" ");
  return (
    <svg
      className="trend-svg"
      viewBox="0 0 680 250"
      role="img"
      aria-label="Monthly revenue and gross profit in Indian rupees"
    >
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f9273" stopOpacity=".17" />
          <stop offset="100%" stopColor="#3f9273" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = min + ((max - min) * i) / 4;
        return (
          <g key={i}>
            <line
              x1="65"
              x2="650"
              y1={y(v)}
              y2={y(v)}
              stroke="#edf0ec"
              strokeDasharray="3 5"
            />
            <text x="54" y={y(v) + 4} textAnchor="end" className="chart-label">
              {currency(v, true)}
            </text>
          </g>
        );
      })}
      <path
        d={`${line("revenue")} L${x(values.length - 1)},${y(0)} L65,${y(0)} Z`}
        fill="url(#area)"
      />
      <path
        d={line("revenue")}
        fill="none"
        stroke="#287b60"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d={line("profit")}
        fill="none"
        stroke="#b3c59d"
        strokeWidth="2.5"
        strokeDasharray="5 5"
      />
      {values.map((m, i) => (
        <g key={m.name}>
          <circle
            cx={x(i)}
            cy={y(m.revenue)}
            r="4"
            fill="#fff"
            stroke="#287b60"
            strokeWidth="2"
          >
            <title>{`${m.name}: revenue ${currency(m.revenue)}, gross profit ${currency(m.profit)}`}</title>
          </circle>
          {(values.length <= 12 || i % Math.ceil(values.length / 12) === 0) && (
            <text x={x(i)} y="238" textAnchor="middle" className="chart-label">
              {monthLabel(m.name)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
function MixChart({ summary: s }: { summary: Summary }) {
  let offset = 0;
  const stops = s.categories.map((c, i) => {
    const start = offset;
    offset += s.revenue ? (c.revenue / s.revenue) * 100 : 0;
    return `${colors[i % colors.length]} ${start}% ${offset}%`;
  });
  return (
    <>
      <div className="donut-wrap">
        <div
          className="donut"
          style={{
            background: s.revenue
              ? `conic-gradient(${stops.join(",")})`
              : "#e8ece7",
          }}
          role="img"
          aria-label="Revenue share by category"
        >
          <div>
            <span>Total revenue</span>
            <strong>{currency(s.revenue, true)}</strong>
            <small>{s.categories.length} categories</small>
          </div>
        </div>
      </div>
      <div className="mix-legend">
        {s.categories.map((c, i) => (
          <div key={c.name}>
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {c.name}
            </span>
            <strong>
              {percent(s.revenue ? (c.revenue / s.revenue) * 100 : 0)}
            </strong>
          </div>
        ))}
      </div>
    </>
  );
}
export default function Home() {
  const [page, setPage] = useState<Page>("Overview"),
    [rows, setRows] = useState<Sale[]>(sampleData),
    [dataset, setDataset] = useState("Retail performance 2025");
  const [region, setRegion] = useState("All regions"),
    [period, setPeriod] = useState("all"),
    [search, setSearch] = useState(""),
    [tablePage, setTablePage] = useState(0);
  const [mobile, setMobile] = useState(false),
    [settings, setSettings] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [mode, setMode] = useState("demo"),
    [model, setModel] = useState(""),
    [statusKnown, setStatusKnown] = useState(false),
    [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(""),
    [answerMode, setAnswerMode] = useState("demo"),
    [asked, setAsked] = useState(""),
    [busy, setBusy] = useState(false);
  const [price, setPrice] = useState(5),
    [volume, setVolume] = useState(10),
    [costs, setCosts] = useState(0);
  const input = useRef<HTMLInputElement>(null),
    requestId = useRef(0),
    dialog = useRef<HTMLDialogElement>(null);
  const filtered = useMemo(
    () => filterRows(rows, region, period),
    [rows, region, period],
  );
  const s = useMemo(() => summarize(filtered), [filtered]),
    findings = useMemo(() => insights(s), [s]);
  const projection = scenario(s, price, volume, costs);
  const searched = useMemo(
    () =>
      filtered.filter((r) =>
        `${r.date} ${r.category} ${r.region} ${r.channel}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [filtered, search],
  );
  const pages = Math.max(1, Math.ceil(searched.length / 10));
  useEffect(() => {
    fetch("/api/insights")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<{ mode: string; model?: string }>;
      })
      .then((d) => {
        setMode(d.mode);
        setModel(d.model || "");
        setStatusKnown(true);
      })
      .catch(() =>
        setNotice(
          "AI service status is unavailable. Dashboard analytics still work.",
        ),
      );
  }, []);
  useEffect(() => {
    requestId.current++;
    setAnswer("");
    setAsked("");
    setBusy(false);
    setTablePage(0);
  }, [rows, region, period]);
  useEffect(() => {
    setTablePage(0);
  }, [search]);
  useEffect(() => {
    if (settings) dialog.current?.showModal();
    else dialog.current?.close();
  }, [settings]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  function go(p: Page) {
    setPage(p);
    setMobile(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 2_000_000)
        throw new Error("Please upload a CSV smaller than 2 MB.");
      const parsed = parseCSV(await file.text());
      setRows(parsed);
      setDataset(file.name.replace(/\.csv$/i, ""));
      setRegion("All regions");
      setPeriod("all");
      setNotice(`${parsed.length.toLocaleString()} valid records loaded.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file.");
    }
    if (input.current) input.current.value = "";
  }
  async function ask(q: string) {
    if (!q.trim() || busy || !filtered.length) return;
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    setAsked(q);
    setPage("AI insights");
    setAnswer("");
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, rows: filtered }),
        signal: AbortSignal.timeout(40000),
      });
      const data = (await res.json()) as {
        answer: string;
        mode: string;
        error?: string;
      };
      if (!res.ok)
        throw new Error(data.error || "Could not generate insights.");
      if (id === requestId.current) {
        setAnswer(data.answer);
        setAnswerMode(data.mode);
        setQuestion("");
      }
    } catch (e) {
      if (id === requestId.current)
        setError(
          e instanceof Error
            ? e.message
            : "Could not connect to the insight service.",
        );
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  function exportReport() {
    const text = `INSIGHT BI — GROUP 8 · DIVISION B · BATCH B3 BUSINESS PERFORMANCE REPORT\nDataset: ${dataset}\nPeriod: ${s.from || "No data"} to ${s.to || "No data"}\nRegion: ${region}\nCurrency: INR\n\nRevenue: ${currency(s.revenue)}\nRecorded cost: ${currency(s.cost)}\nGross profit: ${currency(s.profit)}\nGross margin: ${percent(s.margin)}\nOrders: ${s.orders}\nAverage order value: ${currency(s.aov)}\n\nRULE-BASED INSIGHTS\n${findings.map((i) => i.title + "\n" + i.text + " " + i.action).join("\n\n")}\n\nSCENARIO (ASSUMPTIONS, NOT A FORECAST)\nPrice ${price}%, volume ${volume}%, unit cost ${costs}%\nProjected revenue: ${currency(projection.revenue)}\nProjected gross profit: ${currency(projection.profit)}\nAll recorded costs scale with volume. Operating costs outside the dataset are excluded.\n${answer ? "\n" + answerMode.toUpperCase() + " RESPONSE\nQuestion: " + asked + "\n" + answer : ""}\n\nMonthly comparisons may include partial months. Validate source data and recommendations before making decisions.`;
    download("insight-bi-business-report.txt", text);
    setNotice("Business report exported.");
  }
  const pageTitles: Record<Page, string> = {
    Overview: "Business overview",
    "Data explorer": "Your data, in focus",
    "AI insights": "Turn questions into clarity",
    "Strategy lab": "Explore your next move",
    "Project guide": "Behind the insights",
  };
  return (
    <div className="app-shell">
      <input
        type="file"
        accept=".csv,text/csv"
        ref={input}
        className="sr-only"
        aria-label="Upload business CSV"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
        >
          <span className="brand-icon">
            <BarChart3 size={22} />
          </span>
          insight<span className="brand-bi">BI</span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">N</span>
          <div>
            <strong>Nova Retail</strong>
            <small>Business workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <button
              key={n.name}
              onClick={() => go(n.name)}
              className={page === n.name ? "active" : ""}
              aria-current={page === n.name ? "page" : undefined}
            >
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.name === "AI insights" && <span className="nav-new">AI</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-orbit">
            <Sparkles size={19} />
          </span>
          <h3>From data to direction.</h3>
          <p>Find the story behind your numbers. Decide what comes next.</p>
          <button
            onClick={() =>
              ask("Summarize performance and recommend three strategic actions")
            }
            disabled={busy || !s.records}
          >
            Explore insights <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={page === "Project guide" ? "selected" : ""}
            onClick={() => go("Project guide")}
          >
            <BookOpen size={18} />
            Project guide
          </button>
          <button onClick={() => setSettings(true)}>
            <Settings2 size={18} />
            Model settings
          </button>
          <div className="student">
            <span>VM</span>
            <div>
              <strong>Group 8 · Mini project</strong>
              <small>Division B · Batch B3</small>
              <small>IT (AI & DS)</small>
            </div>
            <span className="student-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div>
            <span className="mode-indicator">
              <i />
              {statusKnown
                ? mode === "gemini"
                  ? "Gemini connected"
                  : "Demo workspace"
                : "Checking AI service"}
            </span>
            <button
              className="icon-button help-button"
              aria-label="Project information"
              onClick={() => go("Project guide")}
            >
              <CircleHelp size={19} />
            </button>
            <span className="top-avatar">VM</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> GROUP 8 · DIVISION B · BATCH B3
              </div>
              <h1>{pageTitles[page]}</h1>
              <p>
                {page === "Overview"
                  ? "Your performance at a glance. Your next opportunity, uncovered."
                  : page === "Data explorer"
                    ? "A reliable starting point for every business decision."
                    : page === "AI insights"
                      ? "Ask about performance, discover patterns, and build a plan."
                      : page === "Strategy lab"
                        ? "Test your assumptions before making your next decision."
                        : "A practical GenAI mini project, from raw data to strategic insight."}
              </p>
            </div>
            <div className="heading-actions">
              <button className="button secondary" onClick={exportReport}>
                <ArrowDownToLine size={16} />
                Export report
              </button>
              <button
                className="button primary"
                onClick={() => input.current?.click()}
              >
                <Plus size={17} />
                Upload data
              </button>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {page !== "Project guide" && (
            <div className="filterbar">
              <div className="dataset-pill">
                <span className="data-icon">
                  <Database size={15} />
                </span>
                <strong title={dataset}>{dataset}</strong>
                <span className="sample-badge">
                  {dataset === "Retail performance 2025" ? "SAMPLE" : "CSV"}
                </span>
                <span className="record-count">
                  {s.records.toLocaleString()} records
                </span>
              </div>
              <div className="filters">
                <label>
                  <CalendarDays size={15} />
                  <select
                    aria-label="Date range"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="all">All available dates</option>
                    <option value="3">Latest 3 months</option>
                    <option value="1">Latest month</option>
                  </select>
                  <ChevronDown size={12} />
                </label>
                <label>
                  <select
                    aria-label="Region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option>All regions</option>
                    {[...new Set(rows.map((r) => r.region))].sort().map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} />
                </label>
              </div>
            </div>
          )}
          {page === "Overview" && (
            <>
              <section
                className="metrics"
                aria-label="Key performance indicators"
              >
                {[
                  {
                    label: "Total revenue",
                    value: currency(s.revenue),
                    icon: Wallet,
                    detail:
                      s.growth === null
                        ? "Latest month change unavailable"
                        : `${s.growth >= 0 ? "+" : ""}${percent(s.growth)} latest month`,
                    trend: true,
                  },
                  {
                    label: "Gross profit",
                    value: currency(s.profit),
                    icon: TrendingUp,
                    detail: `${percent(s.margin)} gross margin`,
                  },
                  {
                    label: "Total orders",
                    value: s.orders.toLocaleString("en-IN"),
                    icon: ShoppingBag,
                    detail: `Across ${s.regions.length} regions`,
                  },
                  {
                    label: "Average order value",
                    value: currency(s.aov),
                    icon: CircleDollarSign,
                    detail: "Revenue per recorded order",
                  },
                ].map((m, i) => (
                  <article className="metric-card" key={m.label}>
                    <div>
                      <span>{m.label}</span>
                      <m.icon size={18} />
                    </div>
                    <strong>{m.value}</strong>
                    <p>
                      <span
                        className={
                          m.trend && s.growth !== null
                            ? s.growth >= 0
                              ? "positive"
                              : "negative"
                            : ""
                        }
                      >
                        {m.trend && s.growth !== null && (
                          <ArrowUpRight size={13} />
                        )}{" "}
                        {m.detail}
                      </span>
                      {i === 0 && (
                        <svg viewBox="0 0 70 23" aria-hidden="true">
                          <path
                            d={s.months
                              .map(
                                (m, j) =>
                                  `${j ? "L" : "M"}${1 + (j * 68) / Math.max(1, s.months.length - 1)},${22 - (m.revenue / Math.max(1, ...s.months.map((v) => v.revenue))) * 21}`,
                              )
                              .join(" ")}
                            fill="none"
                            stroke="#4d9776"
                            strokeWidth="1.5"
                          />
                        </svg>
                      )}
                    </p>
                  </article>
                ))}
              </section>
              <section className="charts-grid">
                <article className="panel revenue-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Revenue performance</h2>
                      <p>Track the bigger picture over time</p>
                    </div>
                    <span className="subtle-label">INR</span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i style={{ background: "#287b60" }} />
                      Revenue
                    </span>
                    <span>
                      <i style={{ background: "#b3c59d" }} />
                      Gross profit
                    </span>
                    <span className="period-caption">
                      {s.from &&
                        `${monthLabel(s.from.slice(0, 7))} – ${monthLabel(s.to.slice(0, 7))}`}
                    </span>
                  </div>
                  <TrendChart summary={s} />
                  <div className="chart-footnote">
                    <span>
                      <i />
                      Based on the current selection
                    </span>
                    <span>Monthly totals · partial months may vary</span>
                  </div>
                </article>
                <article className="panel category-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Revenue by category</h2>
                      <p>Where your business grows</p>
                    </div>
                  </div>
                  <MixChart summary={s} />
                </article>
              </section>
              <section className="insights-section">
                <div className="section-heading">
                  <div>
                    <span className="section-icon">
                      <Sparkles size={17} />
                    </span>
                    <h2>Signals worth your attention</h2>
                    <span className="mini-badge">DATA INSIGHTS</span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => go("AI insights")}
                  >
                    Open insight studio <ArrowRight size={15} />
                  </button>
                </div>
                <div className="insight-grid">
                  {findings.map((f, i) => (
                    <article className="insight-card" key={f.title}>
                      <div className={`insight-type ${f.type}`}>
                        <span />
                        {
                          [
                            "GROWTH OPPORTUNITY",
                            "MARGIN WATCH",
                            "PERFORMANCE TREND",
                          ][i]
                        }
                      </div>
                      <h3>{f.title}</h3>
                      <p>{f.text}</p>
                      <button
                        onClick={() =>
                          ask(
                            i === 0
                              ? "Which product categories perform best?"
                              : i === 1
                                ? "How can we improve our profit margins?"
                                : "Explain the monthly revenue trend",
                          )
                        }
                        disabled={busy}
                      >
                        Explore this insight <ArrowUpRight size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
              <section className="ask-banner">
                <div className="banner-spark">
                  <Sparkles size={25} />
                </div>
                <div>
                  <h2>Your data has more to say.</h2>
                  <p>
                    Ask a question. Get an explanation grounded in your numbers.
                  </p>
                </div>
                <button onClick={() => go("AI insights")}>
                  Ask your data <ArrowRight size={16} />
                </button>
              </section>
            </>
          )}
          {page === "Data explorer" && (
            <>
              <section
                className="upload-panel"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  upload(e.dataTransfer.files[0]);
                }}
              >
                <div className="upload-symbol">
                  <Upload size={25} />
                </div>
                <div>
                  <h2>Bring your business data</h2>
                  <p>
                    Drop a CSV here, or choose a file. Up to 2 MB and 10,000
                    rows.
                  </p>
                  <small>
                    Required: date, category, region, revenue, cost, orders.
                    Optional: channel.
                  </small>
                </div>
                <button
                  className="button secondary"
                  onClick={() => input.current?.click()}
                >
                  Choose CSV
                </button>
              </section>
              <div className="data-tools">
                <div>
                  <ShieldCheck size={16} />
                  <span>
                    Data stays in memory. Refreshing restores the sample.
                  </span>
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    download(
                      "sample-retail-data.csv",
                      toCSV(sampleData()),
                      "text/csv",
                    )
                  }
                >
                  Download sample CSV <ArrowDownToLine size={14} />
                </button>
              </div>
              <section className="panel data-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Dataset explorer{" "}
                      <span className="count-badge">{searched.length}</span>
                    </h2>
                    <p>
                      One row is one sales record or aggregate; orders are
                      summed.
                    </p>
                  </div>
                  <div className="table-controls">
                    <label className="search-box">
                      <Search size={16} />
                      <input
                        placeholder="Search records…"
                        aria-label="Search records"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <button
                      className="icon-button"
                      aria-label="Export filtered CSV"
                      title="Export filtered CSV"
                      onClick={() =>
                        download(
                          "filtered-sales.csv",
                          toCSV(searched),
                          "text/csv",
                        )
                      }
                    >
                      <ArrowDownToLine size={17} />
                    </button>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Date",
                          "Category",
                          "Region",
                          "Channel",
                          "Revenue",
                          "Cost",
                          "Orders",
                          "Margin",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {searched
                        .slice(tablePage * 10, tablePage * 10 + 10)
                        .map((r, i) => (
                          <tr key={tablePage * 10 + i}>
                            <td>{r.date}</td>
                            <td>
                              <span className="table-category">
                                {r.category}
                              </span>
                            </td>
                            <td>{r.region}</td>
                            <td>{r.channel}</td>
                            <td>{currency(r.revenue)}</td>
                            <td>{currency(r.cost)}</td>
                            <td>{r.orders}</td>
                            <td>
                              <span
                                className={
                                  r.revenue - r.cost >= 0
                                    ? "positive"
                                    : "negative"
                                }
                              >
                                {percent(
                                  r.revenue
                                    ? ((r.revenue - r.cost) / r.revenue) * 100
                                    : 0,
                                )}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!searched.length && (
                    <div className="empty">No records match your search.</div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Showing {searched.length ? tablePage * 10 + 1 : 0}–
                    {Math.min((tablePage + 1) * 10, searched.length)} of{" "}
                    {searched.length} records
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      disabled={tablePage === 0}
                      aria-label="Previous page"
                      onClick={() => setTablePage((n) => n - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <span>
                      {tablePage + 1} / {pages}
                    </span>
                    <button
                      className="icon-button"
                      disabled={tablePage + 1 >= pages}
                      aria-label="Next page"
                      onClick={() => setTablePage((n) => n + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </section>
              <button
                className="text-button restore-button"
                onClick={() => {
                  setRows(sampleData());
                  setDataset("Retail performance 2025");
                  setRegion("All regions");
                  setPeriod("all");
                  setSearch("");
                  setNotice("Sample dataset restored.");
                }}
              >
                <RotateCcw size={14} />
                Restore sample dataset
              </button>
            </>
          )}
          {page === "AI insights" && (
            <div className="ai-grid">
              <section className="panel ai-studio">
                <div className="studio-intro">
                  <span className="studio-icon">
                    <Sparkles size={26} />
                  </span>
                  <h2>A conversation with your business.</h2>
                  <p>Start with a question about the selected data.</p>
                </div>
                <div className="prompt-grid">
                  {[
                    "Summarize business performance",
                    "Which product categories perform best?",
                    "Compare revenue across regions",
                    "How can we improve profit margins?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      disabled={busy || !s.records}
                    >
                      {q}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
                {(busy || answer) && (
                  <div className="answer-block" aria-live="polite">
                    <div className="asked">
                      <span>YOU ASKED</span>
                      <p>{asked}</p>
                    </div>
                    <div className="answer-label">
                      <Sparkles size={16} />
                      <strong>
                        {busy
                          ? "Analyzing your data…"
                          : answerMode === "gemini"
                            ? "Gemini response"
                            : "Rule-based demo response"}
                      </strong>
                      {busy && <LoaderCircle className="spin" size={16} />}
                    </div>
                    {answer && <div className="answer-text">{answer}</div>}
                  </div>
                )}
                <form
                  className="ask-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    ask(question);
                  }}
                >
                  <label className="sr-only" htmlFor="question">
                    Ask a business question
                  </label>
                  <textarea
                    id="question"
                    placeholder="What should we focus on next quarter?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={1500}
                    rows={2}
                  />
                  <div>
                    <span>
                      {question.length}/1500 · {s.records} records in context
                    </span>
                    <button
                      className="button primary"
                      type="submit"
                      disabled={busy || !question.trim() || !s.records}
                    >
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <Send size={15} />
                      )}
                      Ask Insight
                    </button>
                  </div>
                </form>
              </section>
              <aside className="ai-aside">
                <article className="panel context-card">
                  <h3>
                    <Database size={17} />
                    Your data context
                  </h3>
                  <dl>
                    <div>
                      <dt>Dataset</dt>
                      <dd>{dataset}</dd>
                    </div>
                    <div>
                      <dt>Records</dt>
                      <dd>{s.records}</dd>
                    </div>
                    <div>
                      <dt>Region</dt>
                      <dd>{region}</dd>
                    </div>
                    <div>
                      <dt>Revenue</dt>
                      <dd>{currency(s.revenue)}</dd>
                    </div>
                    <div>
                      <dt>Gross margin</dt>
                      <dd>{percent(s.margin)}</dd>
                    </div>
                  </dl>
                </article>
                <article className="model-note">
                  <Sparkles size={20} />
                  <h3>
                    {mode === "gemini"
                      ? "Gemini is connected"
                      : "You’re in demo mode"}
                  </h3>
                  <p>
                    {mode === "gemini"
                      ? `Answers are generated by ${model} using calculated metrics from your data.`
                      : "Explore the workflow with rule-based answers. Connect Gemini to enable open-ended generative AI."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setSettings(true)}
                  >
                    Model configuration <ArrowUpRight size={14} />
                  </button>
                </article>
                <p className="privacy-note">
                  <ShieldCheck size={15} />
                  When Gemini is enabled, calculated summaries and your question
                  are sent to Google. Raw sales rows are not sent to the model.
                  Verify generated advice.
                </p>
              </aside>
            </div>
          )}
          {page === "Strategy lab" && (
            <>
              <div className="scenario-grid">
                <section className="panel scenario-inputs">
                  <div className="panel-heading">
                    <div>
                      <h2>What if things changed?</h2>
                      <p>Adjust your assumptions for the selected period.</p>
                    </div>
                    <FlaskConical size={22} />
                  </div>
                  {[
                    {
                      label: "Average selling price",
                      value: price,
                      set: setPrice,
                      min: -30,
                      max: 30,
                      help: "A price change applied to the current revenue.",
                    },
                    {
                      label: "Sales volume",
                      value: volume,
                      set: setVolume,
                      min: -50,
                      max: 50,
                      help: "Orders and all recorded costs scale with volume.",
                    },
                    {
                      label: "Cost per unit",
                      value: costs,
                      set: setCosts,
                      min: -30,
                      max: 30,
                      help: "The change in the cost of each unit sold.",
                    },
                  ].map((c) => (
                    <div className="slider-field" key={c.label}>
                      <label>
                        <span>{c.label}</span>
                        <strong>
                          {c.value > 0 ? "+" : ""}
                          {c.value}%
                        </strong>
                        <input
                          aria-label={c.label}
                          type="range"
                          min={c.min}
                          max={c.max}
                          value={c.value}
                          onChange={(e) => c.set(Number(e.target.value))}
                        />
                      </label>
                      <div className="range-labels">
                        <span>{c.min}%</span>
                        <span>+{c.max}%</span>
                      </div>
                      <p>{c.help}</p>
                    </div>
                  ))}
                  <button
                    className="text-button"
                    onClick={() => {
                      setPrice(0);
                      setVolume(0);
                      setCosts(0);
                    }}
                  >
                    <RotateCcw size={14} />
                    Reset assumptions
                  </button>
                </section>
                <section className="projection-panel">
                  <span className="eyebrow">YOUR SCENARIO</span>
                  <h2>A possible new picture.</h2>
                  <p>Illustrative results, based on your assumptions.</p>
                  <div className="projection-main">
                    <span>Projected gross profit</span>
                    <strong>{currency(projection.profit)}</strong>
                    <span className="projection-delta">
                      {projection.delta >= 0 ? "+" : ""}
                      {currency(projection.delta)} versus the selected period
                    </span>
                  </div>
                  <div className="projection-details">
                    <div>
                      <span>Projected revenue</span>
                      <strong>{currency(projection.revenue)}</strong>
                    </div>
                    <div>
                      <span>Projected cost</span>
                      <strong>{currency(projection.cost)}</strong>
                    </div>
                    <div>
                      <span>Gross margin</span>
                      <strong>{percent(projection.margin)}</strong>
                    </div>
                  </div>
                  <button onClick={exportReport}>
                    Export this scenario <ArrowDownToLine size={16} />
                  </button>
                </section>
              </div>
              <section className="panel methodology">
                <Target size={22} />
                <div>
                  <h3>Scenario planning, with transparent assumptions</h3>
                  <p>
                    This is a deterministic what-if calculation, not an AI
                    forecast. Revenue = current revenue × price factor × volume
                    factor. Cost = current cost × volume factor × unit cost
                    factor. All recorded costs are treated as variable. Price
                    elasticity, fixed costs, tax, and seasonality are not
                    modeled.
                  </p>
                </div>
              </section>
            </>
          )}
          {page === "Project guide" && (
            <div className="guide">
              <section className="guide-hero">
                <div className="eyebrow">
                  GROUP 8 · DIVISION B · BATCH B3 · 2026–2027
                </div>
                <h2>
                  GenAI-Powered Business Intelligence and Strategic Insight
                  Generation System
                </h2>
                <p>
                  Insight BI converts structured sales data into clear business
                  metrics, grounded explanations, and testable strategic
                  scenarios.
                </p>
                <div className="guide-tags">
                  <span>React + TypeScript</span>
                  <span>Next.js on Render · Vinext for Sites</span>
                  <span>Gemini API</span>
                </div>
              </section>
              <div className="guide-grid">
                <article className="panel">
                  <h3>How the system works</h3>
                  <ol className="steps">
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Upload and validate</strong>
                        <p>
                          CSV records are checked for valid dates, categories,
                          and non-negative numeric values.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Calculate business metrics</strong>
                        <p>
                          A shared analytics module aggregates revenue, cost,
                          orders, margins, and monthly trends.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Generate grounded insights</strong>
                        <p>
                          The backend recalculates metrics and sends only
                          summaries to Gemini when configured. Demo mode uses
                          explicit rules.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>04</span>
                      <div>
                        <strong>Explore and communicate</strong>
                        <p>
                          Test scenarios, filter datasets, and export a business
                          report or CSV.
                        </p>
                      </div>
                    </li>
                  </ol>
                </article>
                <article className="panel">
                  <h3>Scope and limitations</h3>
                  <p>
                    Amounts use Indian rupees. Gross profit is revenue minus
                    recorded cost; it does not imply net profit. Demo data is
                    synthetic and covers January–June 2025.
                  </p>
                  <p>
                    Uploads live in browser memory and reset on refresh. The
                    application does not store uploaded datasets in a database.
                  </p>
                  <p>
                    AI responses can be incorrect. Monthly trends may include
                    incomplete months. Scenarios illustrate assumptions and do
                    not predict demand.
                  </p>
                  <h3 className="guide-subhead">
                    Group 8 · Division B · Batch B3
                  </h3>
                  <p>
                    K.J Somaiya School of Engineering
                    <br />
                    IT (AI & DS) · Academic year 2026–2027
                  </p>
                  <p>
                    Vruddhi Mule · 16014223099
                    <br />
                    Rajdeep Pandey · 16014223064
                    <br />
                    Sagar Jadhav · 16014223070
                  </p>
                </article>
              </div>
              <section className="panel demo-guide">
                <h3>Quick demonstration</h3>
                <p>
                  1. Review the sample dashboard. &nbsp; 2. Filter by region.
                  &nbsp; 3. Download and upload the sample CSV. &nbsp; 4. Ask a
                  question in AI insights. &nbsp; 5. Test a price or volume
                  change in Strategy lab. &nbsp; 6. Export the business report.
                </p>
                <button
                  className="button primary"
                  onClick={() => go("Overview")}
                >
                  Start exploring <ArrowRight size={16} />
                </button>
              </section>
            </div>
          )}
          <footer className="app-footer">
            <span>
              <span className="footer-mark">✳</span> Insight BI{" "}
              <span className="footer-dot">·</span> Group 8 · Division B · Batch
              B3
            </span>
            <span>
              {page === "Project guide"
                ? "K.J Somaiya School of Engineering"
                : `INR currency · ${mode === "gemini" ? "Gemini enabled" : "Rule-based demo insights"}`}
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="settings-dialog"
        onCancel={() => setSettings(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setSettings(false);
        }}
      >
        <div className="dialog-header">
          <span className="studio-icon">
            <Sparkles size={22} />
          </span>
          <button
            className="icon-button"
            aria-label="Close settings"
            onClick={() => setSettings(false)}
          >
            <X size={20} />
          </button>
        </div>
        <h2>Connect your intelligence layer</h2>
        <p>
          The dashboard works without an API key. Open-ended generative answers
          require a Gemini API key configured on the server.
        </p>
        <div className="config-status">
          <span className="mode-indicator">
            <i />
            {mode === "gemini"
              ? `Connected · ${model}`
              : "Demo mode · rule-based answers"}
          </span>
        </div>
        <h3>For local development</h3>
        <p>
          Add these values to <code>.dev.vars</code> in the project folder, then
          restart the development server.
        </p>
        <pre>
          GEMINI_API_KEY=your_key_here{"\n"}GEMINI_MODEL=gemini-3.8-flash
        </pre>
        <h3>For the hosted app</h3>
        <p>
          Set <code>GEMINI_API_KEY</code> and <code>GEMINI_MODEL</code> as
          server environment variables in Render’s Environment settings (or
          Sites). Never place a key in frontend code or commit it to GitHub.
        </p>
        <p className="small-note">
          Model availability and API usage limits depend on your Google account.
          Only questions and calculated summaries are sent to the provider.
        </p>
        <button
          className="button primary dialog-done"
          onClick={() => setSettings(false)}
        >
          Got it
        </button>
      </dialog>
    </div>
  );
}
