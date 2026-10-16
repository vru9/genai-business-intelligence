import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Insight BI — Group 8 · Division B · Batch B3",
  description:
    "Explore your business data, generate grounded AI insights, and test strategic scenarios. A GenAI college mini project by Group 8, Division B, Batch B3.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
