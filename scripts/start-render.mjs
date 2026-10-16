import { fileURLToPath } from "node:url";

// Render supplies PORT; bind publicly so its load balancer can reach Next.js.
const port = process.env.PORT || "10000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}
const cli = new URL("../node_modules/next/dist/bin/next", import.meta.url);
process.argv = [
  process.execPath,
  fileURLToPath(cli),
  "start",
  "--hostname",
  "0.0.0.0",
  "--port",
  port,
];
await import(cli.href);
