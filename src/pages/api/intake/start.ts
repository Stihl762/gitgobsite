import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { code } = req.body;

    const base = process.env.GOBLINALIAS_URL!;
    const intakeSecret = process.env.GOBLINALIAS_INTAKE_SECRET!;

    const r = await fetch(`${base}/intake/start`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-intake-secret": intakeSecret,
      },
      body: JSON.stringify({ code }),
    });

    const text = await r.text();
    res.status(r.status).json(JSON.parse(text));
  } catch (err: any) {
    res.status(500).json({ status: "ERROR", details: err?.message || "error" });
  }
}
