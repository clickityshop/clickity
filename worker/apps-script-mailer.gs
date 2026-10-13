function doPost(event) {
  const properties = PropertiesService.getScriptProperties();
  const payload = JSON.parse(event.postData.contents);
  const expectedToken = properties.getProperty("CLICKITY_MAILER_TOKEN");
  const recipient = properties.getProperty("CLICKITY_ORDER_EMAIL");

  if (!expectedToken || payload.token !== expectedToken) {
    return output({ ok: false, error: "Unauthorized." });
  }
  if (!recipient || !validOrder(payload)) {
    return output({ ok: false, error: "Invalid order." });
  }

  const pickupTime = payload.pickupTime === "before-school" ? "Before school" : "After school";
  const itemLines = payload.items.map((item) =>
    `- ${item.name} (${item.color}) - Qty: ${item.qty} x ${money(item.unitPriceCents)} = ${money(item.unitPriceCents * item.qty)}`
  );
  const body = [
    `New Clickity order ${payload.reference}`,
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Pickup time: ${pickupTime}`,
    `Pickup place: ${payload.pickupLocation}`,
    "",
    "Items:",
    ...itemLines,
    "",
    `Total due at pickup: ${money(payload.totalCents)}`,
    "Payment: Cash at pickup",
    `Notes: ${payload.notes || "None"}`,
  ].join("\n");

  GmailApp.sendEmail(recipient, `Clickity order ${payload.reference}`, body, {
    replyTo: payload.email,
  });
  return output({ ok: true });
}

function validOrder(order) {
  return order
    && typeof order.submissionId === "string"
    && typeof order.reference === "string"
    && typeof order.name === "string"
    && typeof order.email === "string"
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)
    && ["before-school", "after-school"].includes(order.pickupTime)
    && typeof order.pickupLocation === "string"
    && typeof order.notes === "string"
    && Array.isArray(order.items)
    && order.items.length > 0
    && Number.isInteger(order.totalCents)
    && order.items.every((item) =>
      typeof item.name === "string"
      && typeof item.color === "string"
      && Number.isInteger(item.qty)
      && Number.isInteger(item.unitPriceCents)
    );
}

function money(cents) {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function output(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
