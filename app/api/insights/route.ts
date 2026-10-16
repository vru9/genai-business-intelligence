import { env } from "cloudflare:workers";
import { answerRequest } from "@/lib/ai";
function config() {
  const vars = env as unknown as Record<string, string | undefined>;
  return {
    key: vars.GEMINI_API_KEY,
    model: vars.GEMINI_MODEL || "gemini-3.8-flash",
  };
}
export function GET() {
  const c = config();
  return Response.json(
    { mode: c.key ? "gemini" : "demo", model: c.key ? c.model : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "Cross-origin requests are not supported." },
      { status: 403 },
    );
  try {
    if (Number(request.headers.get("content-length")) > 3_000_000)
      return Response.json({ error: "Dataset is too large." }, { status: 413 });
    const text = await request.text();
    if (text.length > 3_000_000)
      return Response.json({ error: "Dataset is too large." }, { status: 413 });
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const c = config();
    return Response.json(await answerRequest(payload, c.key, c.model), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate insights.";
    return Response.json(
      {
        error:
          message.includes("timeout") || message.includes("aborted")
            ? "The AI request timed out. Please try again."
            : message,
      },
      { status: /provider|timed out|aborted|fetch/i.test(message) ? 502 : 400 },
    );
  }
}
