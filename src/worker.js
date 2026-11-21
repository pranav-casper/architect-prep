// Serves the static site and a tiny progress API.
// GET  /api/progress?email=...  returns the saved progress for that email, or {} if none.
// PUT  /api/progress?email=...  replaces it with the JSON body.
// Progress is keyed by email only, with no sign-in, so anyone who types an email can read or overwrite it.

const MAX_BODY = 64 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/progress") return env.ASSETS.fetch(request);

    const email = (url.searchParams.get("email") || "").trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return json({ error: "invalid email" }, 400);
    const key = "progress:" + email;

    if (request.method === "GET") {
      const saved = await env.PROGRESS.get(key, "json");
      return json(saved || {});
    }

    if (request.method === "PUT") {
      const body = await request.text();
      if (body.length > MAX_BODY) return json({ error: "too large" }, 413);
      let data;
      try { data = JSON.parse(body); } catch { return json({ error: "invalid json" }, 400); }
      if (!data || typeof data !== "object" || Array.isArray(data)) return json({ error: "expected an object" }, 400);
      await env.PROGRESS.put(key, JSON.stringify(data));
      return json({ ok: true });
    }

    return json({ error: "method not allowed" }, 405);
  },
};
