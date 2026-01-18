// functions/api/intake/start.ts
// @ts-nocheck

export const onRequest = async (ctx: any) => {
  const request = ctx.request;
  const env = ctx.env;

  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ status: "ERROR", details: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await request.json().catch(() => ({} as any));
    const code = body?.code;

    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ status: "ERROR", details: "Missing/invalid code" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const base = env?.GOBLINALIAS_URL;
    const intakeSecret = env?.GOBLINALIAS_INTAKE_SECRET;

    if (!base) {
      return new Response(JSON.stringify({ status: "ERROR", details: "Missing env: GOBLINALIAS_URL" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
    if (!intakeSecret) {
      return new Response(JSON.stringify({ status: "ERROR", details: "Missing env: GOBLINALIAS_INTAKE_SECRET" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }

    const upstream = await fetch(`${String(base).replace(/\/+$/, "")}/api/start`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-intake-secret": String(intakeSecret),
      },
      body: JSON.stringify({ code }),
    });

    const text = await upstream.text().catch(() => "");
    let parsed: any = null;
    try {
      parsed = text && text.trim() ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const payload =
      parsed ?? {
        status: "ERROR",
        details: text?.slice(0, 500) || `Upstream returned empty/non-JSON body (HTTP ${upstream.status})`,
      };

    return new Response(JSON.stringify(payload), {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: "ERROR", details: err?.message || "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
