import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const data = req.body;
  const json = JSON.stringify(data, null, 2);

  try {
    await resend.emails.send({
      from: `NetGoblin Beta <${process.env.RESEND_FROM_EMAIL}>`,
      to: "admin@netgoblin.org",
      subject: "🟩 New NetGoblin Beta Signup",
      text: json,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Resend error:", error);
    return res.status(500).json({ error: "Email failed to send" });
  }
}
