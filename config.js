// Site settings — edit these, no code changes needed elsewhere.
window.CLICKITY_CONFIG = {
  // Support email shown on the homepage.
  contactEmail: "clickityshop.com@gmail.com",

  // Inbox that receives online orders and booth summaries through FormSubmit.
  orderEmail: "clickityshop.com@gmail.com",
  orderEmailCc: "wesley.eifler@franklinsabers.org",

  currency: "$",
  maxPerItem: 10,

  // Set to the Cloudflare Worker order endpoint to send orders automatically.
  // Leave blank to send online orders through FormSubmit.
  orderApiUrl: "",

  // Shown at checkout.
  pickupNote: "Pay with cash when you pick up your order at school. No money is collected online.",
};
