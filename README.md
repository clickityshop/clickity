# Clickity

A storefront for 3D-printed fidgets. The shop stays on GitHub Pages; a small Cloudflare Worker and D1 database accept orders and provide a private owner dashboard. Customers pay cash at pickup.

- **`index.html`**: the shop and checkout.
- **`privacy.html`**: explains what order information Clickity collects and how it is used.
- **`orders.html`**: owner order dashboard. Sign in to see the customer's name, email, pickup time and place, items, and cash due; mark an order picked up and paid when complete. New orders appear automatically while the dashboard is open. It also shows best sellers across all orders.
- **`booth.html`**: in-person sales screen for school events. Its sales log stays on that device and can be exported to CSV or emailed as a daily summary. It isn't linked to online orders.

The order service stores a customer's name, email, preferred pickup time and place, optional note, items, and total. It does not collect online payment.

## Set up online orders

The order API needs its own Cloudflare account; GitHub Pages cannot store orders or run the private dashboard API.

1. Install Node.js, then sign in to Cloudflare from this repository:

   ```sh
   npx wrangler login
   ```

2. Create the D1 database:

   ```sh
   npx wrangler d1 create clickity-orders
   ```

   Copy the `database_id` from the command output into `wrangler.toml`, replacing the all-zero placeholder.

3. In `wrangler.toml`, set `SHOP_ORIGINS` to the exact origin of the published shop (scheme and host only, with no path). The checked-in value matches the GitHub Pages address currently listed below; keep `http://localhost:8000` and `http://127.0.0.1:8000` for local testing if wanted.

4. Set a private dashboard password of at least 10 characters and create the database tables:

   ```sh
   npx wrangler secret put DASHBOARD_PASSWORD
   npx wrangler d1 migrations apply clickity-orders --remote
   ```

5. Deploy the API:

   ```sh
   npx wrangler deploy
   ```

6. Copy the deployed Worker URL into `orderApiUrl` in `config.js`, without a trailing slash. Publish the updated shop to GitHub Pages.

7. Open `/orders.html` on the shop and sign in with the dashboard password. The password is stored only for the current browser tab; signing out or closing the tab clears it.

The dashboard's data API requires the password and only accepts browser requests from `SHOP_ORIGINS`. Keep `DASHBOARD_PASSWORD` in Cloudflare secrets, never in `config.js` or a committed file. For local Worker development, use an ignored `.dev.vars` file at the repository root.

## Products

Edit `products.js` to add or change products, prices, and colors. The same catalog is used by the shop and Worker, so the server checks item IDs, colors, quantities, and prices before saving an order. Put photos in `photos/` and set `photo: "photos/whatever.jpg"`. Products without a photo use a colored placeholder drawing.

## Hosting (GitHub Pages)

Repo Settings → Pages → Deploy from branch → `main` / root. The current address in the repository setup is `https://erobbot.github.io/clickity/`. Set `SHOP_ORIGINS` to `https://erobbot.github.io` for that address; if the published shop uses a different host, use that host instead.

## Run locally

```sh
python3 -m http.server 8000
```

To run the API locally after setting up the D1 database and `.dev.vars`:

```sh
npx wrangler dev
```

Put `DASHBOARD_PASSWORD="your-private-password"` in the ignored `.dev.vars` file, apply the migration locally with `npx wrangler d1 migrations apply clickity-orders --local`, then set `orderApiUrl` to `http://localhost:8787` while testing locally. Do not use an HTTP API URL on the published HTTPS shop.

## Test

```sh
npm install
npm test
```

The tests cover order validation and totals, customer checkout, and the owner dashboard. Playwright starts a local shop server automatically.
