// functions/api/intake/start.js

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });

const corsHeaders = (request) => {
  // Same-origin calls don't need CORS, but having it prevents weird 405/OPTIONS surprises.
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
};

export const onRequestOptions = async ({ request }) => {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
};

export const onRequestPost = async ({ request, env }) => {
  const headers = corsHeaders(request);

  try {
    const baseUrl = (env.GOBLINALIAS_URL || "").replace(/\/+$/, "");
    const apiKey = env.GOBLINALIAS_API_KEY || "";
    const contract = env.GOBLINALIAS_CONTRACT || "v1";

    if (!baseUrl || !apiKey) {
      return json(
        { ok: false, error: "Server misconfigured: missing GOBLINALIAS_URL or GOBLINALIAS_API_KEY" },
        500,
        headers
      );
    }

    const body = await request.json().catch(() => null);
    const code = body?.code;

    if (!code || typeof code !== "string") {
      return json({ status: "INVALID", error: "Missing code" }, 400, headers);
    }

    const upstream = await fetch(`${baseUrl}/intake/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "x-ng-contract": contract,
      },
      body: JSON.stringify({ code }),
    });

    const text = await upstream.text().catch(() => "");

    // Upstream should return JSON. If it doesn't, surface a helpful error.
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return json(
        {
          status: "ERROR",
          error: "Upstream returned non-JSON/empty body",
          upstreamStatus: upstream.status,
          upstreamBodyPreview: (text || "").slice(0, 200),
        },
        502,
        headers
      );
    }

    return json(data ?? { status: "ERROR", error: "Empty JSON from upstream" }, upstream.status, headers);
  } catch (err) {
    return json(
      { status: "ERROR", error: "Server error", details: String(err?.message || err) },
      500,
      headers
    );
  }
};
