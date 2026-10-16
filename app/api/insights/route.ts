import { answerRequest } from "@/lib/ai";

export const dynamic = "force-dynamic";

function config() {
  return {
    key: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
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
  // Render terminates HTTPS before forwarding to the Node server.
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const protocol =
    request.headers.get("x-forwarded-proto") || url.protocol.slice(0, -1);
  const expectedOrigin = process.env.RENDER_EXTERNAL_URL
    ? new URL(process.env.RENDER_EXTERNAL_URL).origin
    : `${protocol}://${host}`;
  if (origin && origin !== expectedOrigin)
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
