import PRODUCTS from "../products.js";

const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));
const encoder = new TextEncoder();

function response(body, status, origin) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function isLocalhostAlias(hostnameA, hostnameB) {
  const normalizeLocalhost = (hostname) => {
    if (!hostname) return "";
    const trimmed = hostname.replace(/^\[|\]$/g, "");
    if (trimmed === "localhost") return "localhost";
    if (trimmed === "127.0.0.1" || trimmed === "::1") return "localhost";
    return trimmed;
  };
  return normalizeLocalhost(hostnameA) === normalizeLocalhost(hostnameB);
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;

  const origins = (env.SHOP_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const requestUrl = new URL(origin);

  for (const configuredOrigin of origins) {
    try {
      const configuredUrl = new URL(configuredOrigin);
      const sameOrigin = configuredUrl.origin === requestUrl.origin;
      const sameLocalPort = configuredUrl.protocol === requestUrl.protocol && configuredUrl.port === requestUrl.port;
      const sameLocalHost = isLocalhostAlias(configuredUrl.hostname, requestUrl.hostname) && sameLocalPort;
      if (sameOrigin || sameLocalHost) return origin;
    } catch {
      // Ignore malformed configured origins.
    }
  }

  return null;
}

async function readJson(request, maxBytes = 16_384) {
  const text = await request.text();
  if (encoder.encode(text).length > maxBytes) return { error: "Request is too large." };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: "Request must contain valid JSON." };
  }
}

function cleanText(value, maxLength, required = false) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (cleaned.length > maxLength || (required && !cleaned)) return null;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(cleaned)) return null;
  return cleaned;
}

async function isDashboardPasswordValid(request, env) {
  const expected = env.DASHBOARD_PASSWORD || "";
  const authorization = request.headers.get("Authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (expected.length < 10 || !supplied || supplied.length > 256) return false;
  const [expectedHash, suppliedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
  ]);
  const a = new Uint8Array(expectedHash);
  const b = new Uint8Array(suppliedHash);
  return a.reduce((difference, byte, index) => difference | (byte ^ b[index]), 0) === 0;
}

function serializeOrder(row) {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    name: row.customer_name,
    email: row.customer_email,
    homeroom: row.homeroom,
    pickupTime: row.pickup_time,
    pickupLocation: row.pickup_location,
    notes: row.notes,
    items: JSON.parse(row.items_json),
    totalCents: row.total_cents,
    status: row.status,
  };
}

async function createOrder(request, env, origin) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Send the order as JSON." }, 415, origin);
  }
  const parsed = await readJson(request);
  if (parsed.error) return response({ error: parsed.error }, 400, origin);
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response({ error: "Order details are missing." }, 400, origin);
  }
  const submissionId = typeof body.submissionId === "string" && /^[0-9a-f-]{36}$/i.test(body.submissionId)
    ? body.submissionId
    : null;
  const name = cleanText(body.name, 80, true);
  const email = cleanText(body.email, 254, true);
  const pickupTime = body.pickupTime === "before-school" || body.pickupTime === "after-school"
    ? body.pickupTime
    : null;
  const pickupLocation = cleanText(body.pickupLocation, 120, true);
  const notes = cleanText(body.notes ?? "", 500);
  if (!submissionId || !name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !pickupTime || !pickupLocation || body.acceptedTerms !== true || notes === null) {
    return response({ error: "Please check your details and agree to the site and order terms." }, 400, origin);
  }
  const existing = await env.DB.prepare(`
    SELECT id, reference, created_at, customer_name, customer_email, homeroom, pickup_time, pickup_location, notes, items_json, total_cents, status
    FROM orders WHERE submission_id = ? LIMIT 1
  `).bind(submissionId).first();
  if (existing) return response({ order: serializeOrder(existing) }, 200, origin);
  if (!Number.isInteger(body.expectedTotalCents) || body.expectedTotalCents < 0) {
    return response({ error: "The cart total is invalid. Please refresh and try again." }, 400, origin);
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    return response({ error: "This order has an invalid number of items." }, 400, origin);
  }

  let totalCents = 0;
  const items = [];
  const quantities = new Map();
  for (const item of body.items) {
    const product = PRODUCT_BY_ID.get(item?.id);
    const qty = item?.qty;
    if (!product || product.soldOut || !product.colors.includes(item.color) || !Number.isInteger(qty) || qty < 1 || qty > 10) {
      return response({ error: "An item in this order is no longer available. Please refresh and try again." }, 400, origin);
    }
    const key = `${product.id}:${item.color}`;
    const combinedQty = (quantities.get(key) || 0) + qty;
    if (combinedQty > 10) return response({ error: "An item in this order exceeds the quantity limit." }, 400, origin);
    quantities.set(key, combinedQty);
    const unitPriceCents = Math.round(product.price * 100);
    totalCents += unitPriceCents * qty;
    items.push({ id: product.id, name: product.name, color: item.color, qty, unitPriceCents });
  }
  if (body.expectedTotalCents !== totalCents) {
    return response({ error: "Prices changed. Refresh the shop and check your cart total before ordering." }, 409, origin);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const reference = `CK-${createdAt.slice(2, 10).replace(/-/g, "")}-${id.slice(0, 4).toUpperCase()}`;
  await env.DB.prepare(`
    INSERT OR IGNORE INTO orders
      (id, submission_id, reference, created_at, customer_name, customer_email, homeroom, pickup_time, pickup_location, notes, items_json, total_cents, status)
    VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, 'pending')
  `).bind(id, submissionId, reference, createdAt, name, email, pickupTime, pickupLocation, notes, JSON.stringify(items), totalCents).run();
  const row = await env.DB.prepare(`
    SELECT id, reference, created_at, customer_name, customer_email, homeroom, pickup_time, pickup_location, notes, items_json, total_cents, status
    FROM orders WHERE submission_id = ? LIMIT 1
  `).bind(submissionId).first();
  if (!row) throw new Error("Order insert did not return a saved order.");
  return response({ order: serializeOrder(row) }, 201, origin);
}

async function listOrders(env, origin) {
  const result = await env.DB.prepare(`
    SELECT id, reference, created_at, customer_name, customer_email, homeroom, pickup_time, pickup_location, notes, items_json, total_cents, status
    FROM orders ORDER BY created_at DESC
  `).all();
  return response({ orders: result.results.map(serializeOrder) }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (!origin) return response({ error: "This shop origin is not allowed." }, 403, null);
    if (request.method === "OPTIONS") return response(null, 204, origin);

    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/orders" && request.method === "POST") {
        return await createOrder(request, env, origin);
      }
      if (!url.pathname.startsWith("/api/")) return response({ error: "Not found." }, 404, origin);
      if (!await isDashboardPasswordValid(request, env)) {
        return response({ error: "Dashboard password is incorrect." }, 401, origin);
      }
      if (url.pathname === "/api/orders" && request.method === "GET") {
        return await listOrders(env, origin);
      }
      const match = url.pathname.match(/^\/api\/orders\/([0-9a-f-]{36})$/i);
      if (match && request.method === "PATCH") {
        const parsed = await readJson(request, 1024);
        if (parsed.error || !["pending", "collected"].includes(parsed.value?.status)) {
          return response({ error: "Choose a valid order status." }, 400, origin);
        }
        const result = await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?")
          .bind(parsed.value.status, match[1]).run();
        if (!result.meta?.changes) return response({ error: "Order not found." }, 404, origin);
        return response({ ok: true }, 200, origin);
      }
      return response({ error: "Not found." }, 404, origin);
    } catch (error) {
      console.error("Order API request failed:", error);
      return response({ error: "The order service could not complete this request. Please try again." }, 500, origin);
    }
  },
};
