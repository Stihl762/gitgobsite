// @ts-nocheck
// functions/api/customers.ts
/**
 * Returns a JSON export of Stripe customer access state from KV.
 *
 * KV binding required:
 * - STRIPE_CUSTOMERS
 *
 * Optional env vars (recommended):
 * - CUSTOMERS_EXPORT_KEY  (protects endpoint)
 *
 * Usage:
 * GET /api/customers
 * Headers:
 *   x-export-key: <CUSTOMERS_EXPORT_KEY>
 */

const safeJsonParse = (s: string | null) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const requireExportKey = (request: Request, env: any) => {
  const key = env?.CUSTOMERS_EXPORT_KEY;
  if (!key) return { ok: true }; // allow if not set (dev)
  const provided = request.headers.get("x-export-key");
  if (!provided || String(provided) !== String(key)) {
    return { ok: false, res: new Response("Unauthorized", { status: 401 }) };
  }
  return { ok: true };
};

export const onRequestGet = async ({ request, env }: any) => {
  if (!env?.STRIPE_CUSTOMERS) {
    return new Response("Missing KV binding: STRIPE_CUSTOMERS", { status: 500 });
  }

  const gate = requireExportKey(request, env);
  if (!gate.ok) return gate.res;

  const customers: any[] = [];

  // List keys. We only export canonical cust:* keys (not email:* duplicates).
  let cursor: string | undefined = undefined;

  do {
    const page = await env.STRIPE_CUSTOMERS.list({ prefix: "cust:", cursor });
    const keys = page?.keys || [];

    for (const k of keys) {
      const raw = await env.STRIPE_CUSTOMERS.get(k.name);
      const parsed = safeJsonParse(raw);
      if (parsed) customers.push(parsed);
    }

    cursor = page?.cursor;
    // Cloudflare KV returns list_complete boolean in some runtimes
    if (page?.list_complete) cursor = undefined;
  } while (cursor);

  // Sort newest first
  customers.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  return new Response(
    JSON.stringify(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        count: customers.length,
        customers,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // Cache lightly; webhook updates are near-real-time
        "Cache-Control": "public, max-age=30",
      },
    }
  );
};
