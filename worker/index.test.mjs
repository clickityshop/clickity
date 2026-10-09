import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "./index.mjs";

const origin = "https://shop.example";
const password = "a-test-dashboard-password-that-is-long-enough";
const env = () => ({
  DB: new MemoryDatabase(),
  DASHBOARD_PASSWORD: password,
  SHOP_ORIGINS: `${origin},http://localhost:8000`,
});

class MemoryDatabase {
  orders = [];

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }
}

class MemoryStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql.trim().replace(/\s+/g, " ");
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.startsWith("INSERT OR IGNORE")) {
      const [id, submissionId, reference, createdAt, name, email, pickupTime, pickupLocation, notes, itemsJson, totalCents] = this.values;
      if (this.database.orders.some((order) => order.submission_id === submissionId)) {
        return { meta: { changes: 0 } };
      }
      this.database.orders.push({
        id,
        submission_id: submissionId,
        reference,
        created_at: createdAt,
        customer_name: name,
        customer_email: email,
        homeroom: "",
        pickup_time: pickupTime,
        pickup_location: pickupLocation,
        notes,
        items_json: itemsJson,
        total_cents: totalCents,
        status: "pending",
      });
      return { meta: { changes: 1 } };
    }
    if (this.sql.startsWith("UPDATE orders SET status")) {
      const order = this.database.orders.find((entry) => entry.id === this.values[1]);
      if (order) order.status = this.values[0];
      return { meta: { changes: order ? 1 : 0 } };
    }
    throw new Error(`Unimplemented test query: ${this.sql}`);
  }

  async first() {
    if (this.sql.includes("WHERE submission_id = ?")) {
      return this.database.orders.find((order) => order.submission_id === this.values[0]) || null;
    }
    throw new Error(`Unimplemented test query: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("ORDER BY created_at DESC")) {
      return {
        results: this.database.orders.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100),
      };
    }
    throw new Error(`Unimplemented test query: ${this.sql}`);
  }
}

function request(path, { method = "GET", body, authorization, requestOrigin = origin } = {}) {
  const headers = { Origin: requestOrigin };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authorization) headers.Authorization = `Bearer ${authorization}`;
  return new Request(`https://orders.example${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("accepts preflight from the configured shop and rejects other origins", async () => {
  const bindings = env();
  const preflight = await worker.fetch(request("/api/orders", { method: "OPTIONS" }), bindings);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);

  const denied = await worker.fetch(request("/api/orders", { requestOrigin: "https://attacker.example" }), bindings);
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
});

test("stores an order with server-calculated prices and deduplicates retries", async () => {
  const bindings = env();
  const order = {
    submissionId: "11111111-1111-4111-8111-111111111111",
    name: "Sam",
    email: "sam@example.com",
    pickupTime: "before-school",
    pickupLocation: "by the front office",
    notes: "",
    expectedTotalCents: 1000,
    items: [{ id: "infinity-cube", color: "Lime", qty: 2, price: 0 }],
  };

  const first = await worker.fetch(request("/api/orders", { method: "POST", body: order }), bindings);
  const saved = await first.json();
  assert.equal(first.status, 201);
  assert.equal(saved.order.name, "Sam");
  assert.equal(saved.order.email, "sam@example.com");
  assert.equal(saved.order.pickupTime, "before-school");
  assert.equal(saved.order.pickupLocation, "by the front office");
  assert.equal(saved.order.items[0].unitPriceCents, 500);
  assert.equal(saved.order.totalCents, 1000);
  assert.match(saved.order.reference, /^CK-/);

  const retry = await worker.fetch(request("/api/orders", {
    method: "POST",
    body: { ...order, name: "Changed name" },
  }), bindings);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).order.id, saved.order.id);
  assert.equal(bindings.DB.orders.length, 1);
});

test("rejects unknown products, invalid colors, and over-limit quantities", async () => {
  const bindings = env();
  const base = {
    submissionId: "22222222-2222-4222-8222-222222222222",
    name: "Sam",
    email: "sam@example.com",
    pickupTime: "after-school",
    pickupLocation: "by the front office",
    notes: "",
    expectedTotalCents: 1000,
  };
  for (const item of [
    { id: "not-a-product", color: "Lime", qty: 1 },
    { id: "infinity-cube", color: "Invisible", qty: 1 },
    { id: "infinity-cube", color: "Lime", qty: 11 },
  ]) {
    const response = await worker.fetch(request("/api/orders", {
      method: "POST",
      body: { ...base, items: [item] },
    }), bindings);
    assert.equal(response.status, 400);
  }
});

test("requires a valid customer email", async () => {
  const bindings = env();
  const response = await worker.fetch(request("/api/orders", {
    method: "POST",
    body: {
      submissionId: "55555555-5555-4555-8555-555555555555",
      name: "Sam",
      email: "not-an-email",
      pickupTime: "after-school",
      pickupLocation: "by the front office",
      notes: "",
      expectedTotalCents: 500,
      items: [{ id: "infinity-cube", color: "Lime", qty: 1 }],
    },
  }), bindings);
  assert.equal(response.status, 400);
  assert.equal(bindings.DB.orders.length, 0);
});

test("rejects a stale displayed total instead of saving a mismatched order", async () => {
  const bindings = env();
  const response = await worker.fetch(request("/api/orders", {
    method: "POST",
    body: {
      submissionId: "44444444-4444-4444-8444-444444444444",
      name: "Sam",
      email: "sam@example.com",
      pickupTime: "after-school",
      pickupLocation: "by the front office",
      notes: "",
      expectedTotalCents: 300,
      items: [{ id: "infinity-cube", color: "Lime", qty: 1 }],
    },
  }), bindings);
  assert.equal(response.status, 409);
  assert.equal(bindings.DB.orders.length, 0);
});

test("requires the dashboard password and lets the owner mark pickup paid", async () => {
  const bindings = env();
  await worker.fetch(request("/api/orders", {
    method: "POST",
    body: {
      submissionId: "33333333-3333-4333-8333-333333333333",
      name: "Sam",
      email: "sam@example.com",
      pickupTime: "after-school",
      pickupLocation: "by the front office",
      notes: "",
      expectedTotalCents: 800,
      items: [{ id: "flexi-dragon", color: "Red", qty: 1 }],
    },
  }), bindings);

  const denied = await worker.fetch(request("/api/orders"), bindings);
  assert.equal(denied.status, 401);
  const authorized = await worker.fetch(request("/api/orders", { authorization: password }), bindings);
  assert.equal(authorized.status, 200);
  const orders = await authorized.json();
  assert.equal(orders.orders[0].totalCents, 800);
  assert.equal(orders.orders[0].email, "sam@example.com");
  assert.equal(orders.orders[0].pickupTime, "after-school");
  assert.equal(orders.orders[0].pickupLocation, "by the front office");

  const id = orders.orders[0].id;
  const updated = await worker.fetch(request(`/api/orders/${id}`, {
    method: "PATCH",
    authorization: password,
    body: { status: "collected" },
  }), bindings);
  assert.equal(updated.status, 200);
  const refreshed = await worker.fetch(request("/api/orders", { authorization: password }), bindings);
  assert.equal((await refreshed.json()).orders[0].status, "collected");
});

test("rejects an invalid pickup time or missing pickup place", async () => {
  const bindings = env();
  const base = {
    submissionId: "66666666-6666-4666-8666-666666666666",
    name: "Sam",
    email: "sam@example.com",
    pickupTime: "during-class",
    pickupLocation: "by the front office",
    notes: "",
    expectedTotalCents: 500,
    items: [{ id: "infinity-cube", color: "Lime", qty: 1 }],
  };
  for (const order of [
    base,
    { ...base, submissionId: "77777777-7777-4777-8777-777777777777", pickupTime: "before-school", pickupLocation: "" },
  ]) {
    const response = await worker.fetch(request("/api/orders", { method: "POST", body: order }), bindings);
    assert.equal(response.status, 400);
  }
  assert.equal(bindings.DB.orders.length, 0);
});

test("accepts a configured dashboard password at the 10-character minimum", async () => {
  const bindings = env();
  bindings.DASHBOARD_PASSWORD = "TestPass42";
  const authorized = await worker.fetch(request("/api/orders", { authorization: "TestPass42" }), bindings);
  assert.equal(authorized.status, 200);
});
