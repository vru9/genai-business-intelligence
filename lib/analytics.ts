export type Sale = {
  date: string;
  category: string;
  region: string;
  channel: string;
  revenue: number;
  cost: number;
  orders: number;
};
export type Group = {
  name: string;
  revenue: number;
  cost: number;
  orders: number;
  profit: number;
  margin: number;
};
export type Insight = {
  type: "opportunity" | "attention" | "trend";
  title: string;
  text: string;
  action: string;
};
export const MAX_ROWS = 10000;
export const currency = (n: number, compact = false) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(n);
export const percent = (n: number) => `${n.toFixed(1)}%`;
export function sampleData(): Sale[] {
  const categories = [
    "Electronics",
    "Furniture",
    "Office supplies",
    "Accessories",
  ];
  const regions = ["West", "South", "North", "East"];
  const channels = ["Online", "Retail", "Partner"];
  const rows: Sale[] = [];
  for (let m = 0; m < 6; m++)
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        for (let h = 0; h < 3; h++) {
          const base = [26000, 17500, 11000, 8000][c];
          const revenue = Math.round(
            base *
              [1, 1.12, 1.04, 1.25, 1.32, 1.51][m] *
              [1.2, 1.05, 0.9, 0.75][r] *
              [1.15, 0.85, 0.6][h] *
              (1 + ((m * 7 + c * 3 + r + h) % 9) / 50),
          );
          const margin =
            [0.29, 0.17, 0.34, 0.41][c] - (r === 3 ? 0.045 : 0) + m * 0.003;
          rows.push({
            date: `2025-${String(m + 1).padStart(2, "0")}-${String(3 + c * 4 + r + h).padStart(2, "0")}`,
            category: categories[c],
            region: regions[r],
            channel: channels[h],
            revenue,
            cost: Math.round(revenue * (1 - margin)),
            orders: Math.round(revenue / [2100, 3500, 650, 480][c]),
          });
        }
  return rows;
}
export function validateRows(input: unknown): Sale[] {
  if (!Array.isArray(input) || !input.length)
    throw new Error("Add at least one data row.");
  if (input.length > MAX_ROWS)
    throw new Error("Please use a dataset with 10,000 rows or fewer.");
  const rows = input.map((item, i) => {
    if (!item || typeof item !== "object")
      throw new Error(`Row ${i + 2}: invalid record.`);
    const row = item as Record<string, unknown>;
    const date = String(row.date ?? "").trim();
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      date < "1900-01-01" ||
      date > "2100-12-31"
    )
      throw new Error(
        `Row ${i + 2}: date must be a real date in YYYY-MM-DD format, between 1900 and 2100.`,
      );
    const labels = ["category", "region", "channel"].map((key) => {
      const value = String(
        row[key] ?? (key === "channel" ? "Direct" : ""),
      ).trim();
      if (!value || value.length > 80)
        throw new Error(`Row ${i + 2}: ${key} must contain 1–80 characters.`);
      return value;
    });
    const values = ["revenue", "cost", "orders"].map((key) => {
      const raw = row[key];
      const n =
        typeof raw === "number"
          ? raw
          : typeof raw === "string" && raw.trim() !== ""
            ? Number(raw.replace(/,/g, ""))
            : NaN;
      if (
        !Number.isFinite(n) ||
        n < 0 ||
        n > 1e12 ||
        (key === "orders" && !Number.isInteger(n))
      )
        throw new Error(
          `Row ${i + 2}: ${key} must be a non-negative ${key === "orders" ? "whole number" : "number"} (maximum 1 trillion).`,
        );
      return n;
    });
    return {
      date,
      category: labels[0],
      region: labels[1],
      channel: labels[2],
      revenue: values[0],
      cost: values[1],
      orders: values[2],
    };
  });
  for (const key of ["category", "region", "channel"] as const)
    if (new Set(rows.map((r) => r[key])).size > 50)
      throw new Error(`Use no more than 50 distinct ${key} values.`);
  const dates = rows.map((r) => r.date).sort();
  if ((Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / 86400000 > 3660)
    throw new Error("Use a date range of 10 years or less.");
  return rows;
}
export function parseCSV(text: string): Sale[] {
  if (new TextEncoder().encode(text).length > 2_000_000)
    throw new Error("Please upload a CSV smaller than 2 MB.");
  const records: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === '"') {
      if (field || closed) throw new Error("Invalid quotation in CSV.");
      quoted = true;
    } else if (char === "," || char === "\n" || char === "\r") {
      row.push(field);
      field = "";
      closed = false;
      if (char !== ",") {
        if (row.some((v) => v.trim())) records.push(row);
        row = [];
        if (char === "\r" && text[i + 1] === "\n") i++;
      }
    } else {
      if (closed && char.trim())
        throw new Error("Unexpected text after a quoted CSV field.");
      if (!closed) field += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quotation mark.");
  row.push(field);
  if (row.some((v) => v.trim())) records.push(row);
  const headers = records.shift()?.map((s) => s.trim().toLowerCase()) ?? [];
  if (new Set(headers).size !== headers.length)
    throw new Error("CSV headers must be unique.");
  for (const key of ["date", "category", "region", "revenue", "cost", "orders"])
    if (!headers.includes(key))
      throw new Error(
        `Missing column: ${key}. Download the sample CSV to see the required format.`,
      );
  return validateRows(
    records.map((values, i) => {
      if (values.length !== headers.length)
        throw new Error(
          `Row ${i + 2}: expected ${headers.length} columns, found ${values.length}.`,
        );
      return Object.fromEntries(headers.map((h, j) => [h, values[j]]));
    }),
  );
}
export function toCSV(rows: Sale[]) {
  const keys: (keyof Sale)[] = [
    "date",
    "category",
    "region",
    "channel",
    "revenue",
    "cost",
    "orders",
  ];
  const escape = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return (
    keys.join(",") +
    "\n" +
    rows.map((r) => keys.map((k) => escape(r[k])).join(",")).join("\n")
  );
}
export function filterRows(
  rows: Sale[],
  region: string,
  months: string,
): Sale[] {
  const latest = rows.reduce(
    (max, r) => (r.date > max ? r.date : max),
    "1900-01-01",
  );
  const start = new Date(`${latest.slice(0, 7)}-01T00:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - Number(months) + 1);
  return rows.filter(
    (r) =>
      (region === "All regions" || r.region === region) &&
      (months === "all" || r.date >= start.toISOString().slice(0, 10)),
  );
}
export function summarize(rows: Sale[]) {
  const revenue = rows.reduce((s, r) => s + r.revenue, 0),
    cost = rows.reduce((s, r) => s + r.cost, 0),
    orders = rows.reduce((s, r) => s + r.orders, 0);
  const group = (key: "category" | "region" | "channel" | "month"): Group[] => {
    const map = new Map<string, Group>();
    rows.forEach((r) => {
      const name = key === "month" ? r.date.slice(0, 7) : r[key];
      const g = map.get(name) ?? {
        name,
        revenue: 0,
        cost: 0,
        orders: 0,
        profit: 0,
        margin: 0,
      };
      g.revenue += r.revenue;
      g.cost += r.cost;
      g.orders += r.orders;
      map.set(name, g);
    });
    return [...map.values()]
      .map((g) => ({
        ...g,
        profit: g.revenue - g.cost,
        margin: g.revenue ? ((g.revenue - g.cost) / g.revenue) * 100 : 0,
      }))
      .sort((a, b) =>
        key === "month" ? a.name.localeCompare(b.name) : b.revenue - a.revenue,
      );
  };
  const months = group("month");
  // Missing calendar months stay explicitly missing; never silently compare across gaps.
  const latest = months.at(-1),
    priorDate = latest ? new Date(`${latest.name}-01T00:00:00Z`) : null;
  priorDate?.setUTCMonth(priorDate.getUTCMonth() - 1);
  const previous = months.find(
    (m) => m.name === priorDate?.toISOString().slice(0, 7),
  );
  const growth =
    latest && previous && previous.revenue > 0
      ? ((latest.revenue - previous.revenue) / previous.revenue) * 100
      : null;
  const dates = rows.map((r) => r.date).sort();
  return {
    revenue,
    cost,
    profit: revenue - cost,
    orders,
    margin: revenue ? ((revenue - cost) / revenue) * 100 : 0,
    aov: orders ? revenue / orders : 0,
    categories: group("category"),
    regions: group("region"),
    channels: group("channel"),
    months,
    growth,
    records: rows.length,
    from: dates[0] ?? "",
    to: dates.at(-1) ?? "",
  };
}
export type Summary = ReturnType<typeof summarize>;
export function insights(s: Summary): Insight[] {
  if (!s.records) return [];
  const best = s.categories[0],
    weak = [...s.categories].sort((a, b) => a.margin - b.margin)[0];
  return [
    {
      type: "opportunity",
      title: `${best.name} leads revenue`,
      text: `${best.name} contributes ${percent(s.revenue ? (best.revenue / s.revenue) * 100 : 0)} of revenue with a ${percent(best.margin)} gross margin.`,
      action: "Check inventory and demand before testing additional promotion.",
    },
    {
      type: "attention",
      title: `Review ${weak.name.toLowerCase()} margins`,
      text: `At ${percent(weak.margin)}, this category has the lowest gross margin in the selected data.`,
      action:
        "Review product costs and discounting; test a small pricing change.",
    },
    {
      type: "trend",
      title:
        s.growth === null
          ? "Build a longer trend history"
          : `Latest month revenue ${s.growth >= 0 ? "grew" : "fell"} ${percent(Math.abs(s.growth))}`,
      text:
        s.growth === null
          ? "A comparison needs revenue in two consecutive calendar months."
          : "Compared with the previous calendar month in the selected data. Partial months can distort this comparison.",
      action:
        "Validate month completeness and seasonality before setting targets.",
    },
  ];
}
export function scenario(
  s: Summary,
  price: number,
  volume: number,
  costs: number,
) {
  const revenue = s.revenue * (1 + price / 100) * (1 + volume / 100);
  const cost = s.cost * (1 + volume / 100) * (1 + costs / 100);
  return {
    revenue,
    cost,
    profit: revenue - cost,
    margin: revenue ? ((revenue - cost) / revenue) * 100 : 0,
    delta: revenue - cost - s.profit,
  };
}
export function demoAnswer(question: string, s: Summary): string {
  if (!s.records)
    return "There are no records for this selection. Change the filters or upload a dataset.";
  const q = question.toLowerCase();
  if (/region|geograph|location/.test(q))
    return (
      s.regions
        .map(
          (r, i) =>
            `${i + 1}. ${r.name}: ${currency(r.revenue)} revenue, ${percent(r.margin)} gross margin.`,
        )
        .join("\n") +
      "\n\nCompare regional demand and costs before reallocating resources."
    );
  if (/channel|online|retail/.test(q))
    return s.channels
      .map(
        (r) =>
          `${r.name}: ${currency(r.revenue)} revenue and ${r.orders} orders.`,
      )
      .join("\n");
  if (/categor|product|sell/.test(q))
    return s.categories
      .map(
        (r) =>
          `${r.name}: ${currency(r.revenue)} revenue and ${percent(r.margin)} gross margin.`,
      )
      .join("\n");
  if (/profit|margin|cost/.test(q))
    return `Revenue is ${currency(s.revenue)} and recorded cost is ${currency(s.cost)}. Gross profit is ${currency(s.profit)}, a ${percent(s.margin)} gross margin.\n\n${insights(s)[1].text} ${insights(s)[1].action}\n\nGross profit excludes any operating expenses that are not included in the cost column.`;
  if (/trend|growth|month/.test(q))
    return (
      s.months
        .map((m) => `${m.name}: ${currency(m.revenue)} revenue.`)
        .join("\n") +
      "\n\n" +
      insights(s)[2].text
    );
  if (/summar|insight|strateg|recommend|overview|improve/.test(q))
    return (
      `Across ${s.records} records, revenue is ${currency(s.revenue)}, gross profit is ${currency(s.profit)}, and orders total ${s.orders.toLocaleString("en-IN")}.\n\n` +
      insights(s)
        .map((i) => `${i.title}\n${i.text} ${i.action}`)
        .join("\n\n")
    );
  return "Demo mode supports questions about revenue, profit, margin, categories, regions, channels, growth, and strategy. Try “Summarize business performance” or enable Gemini in the project environment for open-ended questions. This response uses rules, not a language model.";
}
