import type { NextApiRequest, NextApiResponse } from "next";

function safeJsonParse(text: string) {
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ status: "ERROR", details: "Method not allowed" });

  try {
    const { code } = req.body || {};
    if (!code || typeof code !== "string") {
      return res.status(400).json({ status: "ERROR", details: "Missing/invalid code" });
    }

    const base = process.env.GOBLINALIAS_URL;
    const intakeSecret = process.env.GOBLINALIAS_INTAKE_SECRET;

    if (!base) return res.status(500).json({ status: "ERROR", details: "Missing env: GOBLINALIAS_URL" });
    if (!intakeSecret) return res.status(500).json({ status: "ERROR", details: "Missing env: GOBLINALIAS_INTAKE_SECRET" });

    const upstream = await fetch(`${base.replace(/\/+$/, "")}/intake/start`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-intake-secret": intakeSecret,
      },
      body: JSON.stringify({ code }),
    });

    const text = await upstream.text().catch(() => "");
    const parsed = safeJsonParse(text);

    // Always return JSON to the browser.
    if (parsed) return res.status(upstream.status).json(parsed);

    return res.status(upstream.status).json({
      status: "ERROR",
      details: text?.slice(0, 500) || `Upstream returned non-JSON/empty body (HTTP ${upstream.status})`,
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "ERROR",
      details: err?.message || "Server error",
    });
  }
}
