// functions/api/admin/export-intake.js

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
      "Expires": "0",
      ...extraHeaders,
    },
  });

// Basic auth gate (fast + effective). Prefer Cloudflare Access later.
function requireBasicAuth(request, env) {
  const user = env.ADMIN_USER;
  const pass = env.ADMIN_PASS;

  if (!user || !pass) {
    return {
      ok: false,
      status: 500,
      body: {
        ok: false,
        error: "Server misconfigured: missing ADMIN_USER/ADMIN_PASS",
      },
    };
  }

  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Basic ")) {
    return {
      ok: false,
      status: 401,
      body: { ok: false, error: "Unauthorized" },
      headers: { "WWW-Authenticate": 'Basic realm="NetGoblin Admin"' },
    };
  }

  const b64 = auth.slice("Basic ".length).trim();
  let decoded = "";
  try {
    decoded = atob(b64);
  } catch {
    return { ok: false, status: 401, body: { ok: false, error: "Unauthorized" } };
  }

  const [u, p] = decoded.split(":");
  if (u !== user || p !== pass) {
    return { ok: false, status: 401, body: { ok: false, error: "Unauthorized" } };
  }

  return { ok: true };
}

export const onRequestGet = async ({ request, env }) => {
  // 1) Admin gate
  const gate = requireBasicAuth(request, env);
  if (!gate.ok) return json(gate.body, gate.status, gate.headers || {});

  // 2) Required env
  const baseUrl = (env.GOBLINALIAS_URL || "").replace(/\/+$/, "");
  const apiKey = env.GOBLINALIAS_API_KEY || "";
  const contract = env.GOBLINALIAS_CONTRACT || "v1";
  const exportKey = env.ADMIN_EXPORT_KEY || "";

  if (!baseUrl || !apiKey || !exportKey) {
    return json(
      {
        ok: false,
        error:
          "Server misconfigured: missing GOBLINALIAS_URL / GOBLINALIAS_API_KEY / ADMIN_EXPORT_KEY",
      },
      500
    );
  }

  // 3) Optional: allow explicit opt-in for signature fields (if/when upstream supports it)
  const url = new URL(request.url);
  const includeSignatures = url.searchParams.get("includeSignatures") === "1";

  // Build upstream URL with optional query param
  const upstreamUrl = new URL(`${baseUrl}/admin/export/intake.json`);
  if (includeSignatures) upstreamUrl.searchParams.set("includeSignatures", "1");

  // 4) Fetch from Fly (server-to-server)
  const upstream = await fetch(upstreamUrl.toString(), {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "x-ng-contract": contract,
      "x-export-key": exportKey,
    },
  });

  const text = await upstream.text().catch(() => "");
  if (!upstream.ok) {
    return json(
      {
        ok: false,
        error: "Upstream export failed",
        upstreamStatus: upstream.status,
        upstreamBodyPreview: (text || "").slice(0, 300),
      },
      502
    );
  }

  try {
    const data = text ? JSON.parse(text) : null;
    return json(data ?? { ok: false, error: "Empty JSON from upstream" }, 200);
  } catch {
    return json(
      {
        ok: false,
        error: "Upstream returned non-JSON",
        upstreamBodyPreview: (text || "").slice(0, 300),
      },
      502
    );
  }
};
