import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleData,
  summarize,
  parseCSV,
  toCSV,
  filterRows,
  scenario,
  validateRows,
  demoAnswer,
  insights,
} from "../lib/analytics.ts";
import { answerRequest } from "../lib/ai.ts";
const rows = [
  {
    date: "2025-01-10",
    category: "A",
    region: "West",
    channel: "Online",
    revenue: 100,
    cost: 60,
    orders: 2,
  },
  {
    date: "2025-02-10",
    category: "B",
    region: "East",
    channel: "Retail",
    revenue: 150,
    cost: 100,
    orders: 3,
  },
];
test("KPIs, category grouping and consecutive-month growth are exact", () => {
  const s = summarize(rows);
  assert.equal(s.revenue, 250);
  assert.equal(s.cost, 160);
  assert.equal(s.profit, 90);
  assert.equal(s.margin, 36);
  assert.equal(s.aov, 50);
  assert.equal(s.growth, 50);
  assert.equal(s.categories[0].name, "B");
});
test("filters combine region and calendar month range relative to dataset", () => {
  assert.deepEqual(filterRows(rows, "West", "all"), [rows[0]]);
  assert.deepEqual(filterRows(rows, "All regions", "1"), [rows[1]]);
  assert.equal(filterRows(rows, "West", "1").length, 0);
});
test("CSV round trip preserves full sample, quotes, commas and CRLF", () => {
  assert.deepEqual(parseCSV(toCSV(sampleData())), sampleData());
  const csv =
    'date,category,region,revenue,cost,orders\r\n2025-01-10,"Office, ""premium""",West,"1,200",800,4\r\n';
  const result = parseCSV(csv);
  assert.equal(result[0].category, 'Office, "premium"');
  assert.equal(result[0].revenue, 1200);
  assert.equal(result[0].channel, "Direct");
});
test("CSV rejects absent headers, duplicate headers and malformed quoting", () => {
  assert.throws(() => parseCSV("date,cost\n2025-01-01,1"), /Missing column/);
  assert.throws(() => parseCSV("date,date\nx,x"), /unique/);
  assert.throws(() => parseCSV('"unclosed'), /unclosed/);
  assert.throws(
    () =>
      parseCSV(
        'date,category,region,revenue,cost,orders\n2025-01-01,"A"x,W,1,1,1',
      ),
    /Unexpected/,
  );
});
test("validation rejects impossible dates, blank numbers, negatives and fractional orders", () => {
  for (const change of [
    { date: "2025-02-30" },
    { revenue: "" },
    { cost: -1 },
    { orders: 1.5 },
    { revenue: Infinity },
  ])
    assert.throws(() => validateRows([{ ...rows[0], ...change }]));
});
test("zero revenue and empty selections remain finite", () => {
  for (const s of [
    summarize([]),
    summarize([{ ...rows[0], revenue: 0, orders: 0 }]),
  ]) {
    assert.ok(Number.isFinite(s.margin));
    assert.ok(Number.isFinite(s.aov));
    assert.equal(s.growth, null);
    assert.ok(Number.isFinite(scenario(s, 0, 0, 0).margin));
  }
  assert.deepEqual(insights(summarize([])), []);
});
test("missing calendar month never becomes a misleading month-on-month comparison", () => {
  assert.equal(
    summarize([rows[0], { ...rows[1], date: "2025-03-10" }]).growth,
    null,
  );
});
test("scenario scales revenue and variable costs and resets exactly", () => {
  const s = summarize(rows);
  assert.equal(scenario(s, 0, 0, 0).profit, 90);
  const p = scenario(s, 10, 20, -10);
  assert.ok(Math.abs(p.revenue - 330) < 1e-8);
  assert.ok(Math.abs(p.cost - 172.8) < 1e-8);
  assert.ok(Math.abs(p.profit - 157.2) < 1e-8);
});
test("formula-like labels are protected in spreadsheet exports", () => {
  assert.match(
    toCSV([{ ...rows[0], category: '=HYPERLINK("x")' }]),
    /"'=HYPERLINK/,
  );
});
test("dataset size and cardinality are bounded", () => {
  assert.throws(() => validateRows(Array(10001).fill(rows[0])), /10,000/);
  assert.throws(
    () =>
      validateRows(
        Array.from({ length: 51 }, (_, i) => ({
          ...rows[0],
          category: String(i),
        })),
      ),
    /50 distinct/,
  );
});
test("demo responses are grounded and unknown questions disclose limitations", async () => {
  const r = await answerRequest(
    { question: "Summarize performance", rows },
    undefined,
  );
  assert.equal(r.mode, "demo");
  assert.match(r.answer, /250/);
  assert.match(
    demoAnswer("who won the world cup", summarize(rows)),
    /not a language model/,
  );
});
test("Gemini receives calculated metrics instead of raw sales rows", async () => {
  let sent;
  const mock = async (url, options) => {
    sent = { url, options };
    return Response.json({
      candidates: [
        {
          content: { parts: [{ text: "Revenue is INR 250." }] },
          finishReason: "STOP",
        },
      ],
    });
  };
  const result = await answerRequest(
    { question: "Summarize performance", rows },
    "test-key",
    "test-model",
    mock,
  );
  assert.equal(result.mode, "gemini");
  assert.match(sent.url, /test-model:generateContent/);
  const body = JSON.parse(sent.options.body);
  const context = JSON.parse(body.contents[0].parts[0].text);
  assert.equal(context.metrics.revenue, 250);
  assert.equal(context.rows, undefined);
  assert.equal(sent.options.headers["x-goog-api-key"], "test-key");
});
test("provider errors and empty responses are explicit, not disguised as generated answers", async () => {
  await assert.rejects(
    answerRequest(
      { question: "hello", rows },
      "key",
      "model",
      async () => new Response("", { status: 429 }),
    ),
    /429/,
  );
  await assert.rejects(
    answerRequest({ question: "hello", rows }, "key", "model", async () =>
      Response.json({ candidates: [] }),
    ),
    /no text/,
  );
});
test("AI request validation runs before contacting a provider", async () => {
  await assert.rejects(
    answerRequest({ question: "", rows }, "key"),
    /question/,
  );
  await assert.rejects(
    answerRequest({ question: "summary", rows: [] }, "key"),
    /at least one/,
  );
});

test("a transient provider failure is retried once and returns the generated answer", async () => {
  let calls = 0;
  const result = await answerRequest(
    { question: "summary", rows },
    "key",
    "model",
    async () => {
      calls++;
      return calls === 1
        ? new Response("Unavailable", { status: 503 })
        : Response.json({
            candidates: [
              { content: { parts: [{ text: "Revenue is INR 250." }] } },
            ],
          });
    },
  );
  assert.equal(calls, 2);
  assert.equal(result.mode, "gemini");
  assert.equal(result.answer, "Revenue is INR 250.");
});
