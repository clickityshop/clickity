# Clickity

A storefront for 3D-printed fidgets hosted on GitHub Pages. Customers pay cash at pickup.

- **`index.html`**: the shop and checkout.
- **`privacy.html`**: explains what order information Clickity collects and how it is used.
- **`booth.html`**: in-person sales screen for school events. Its sales log stays on that device and can be exported to CSV or emailed as a daily summary. It isn't linked to online orders.

When a customer places an order, the browser submits the checkout form directly to FormSubmit, which emails the customer's contact and pickup details, items, total, and notes to `orderEmail` and copies `orderEmailCc`. Set both addresses in `config.js`; FormSubmit may require the owner to confirm the destination address before it delivers the first submission. Booth summaries use the same recipients. Alternatively, set `orderApiUrl` to use the optional Cloudflare Worker order service. Customers pay cash at pickup.

Every site page checks the latest commit on the `main` branch and shows a plain-language summary of visible changes in a welcome popup the first time a visitor opens any page after that commit. It does not show the commit message or link visitors to commit details. Dismissing the popup is remembered across pages in that browser until a newer commit is published. This requires access to the GitHub API.

## Products

Edit `products.js` to add or change products, prices, colors, and model shapes. The shop randomly picks one available color for each product whenever the page opens; customers can change it before adding the item to their cart. Put photos in `photos/` and set `photo: "photos/whatever.jpg"`. Products without a photo use colored 2D SVG illustrations.

The calendar-based favicon schedule is in `assets/favicon.js`. The St. Patrick's Day icon appears throughout March, the Halloween icon throughout October, and the Christmas icon throughout December; the normal icon is used the rest of the year. Add future seasonal icons and date windows to `seasonalIcons`.

## Hosting (GitHub Pages)

Repo Settings → Pages → Deploy from branch → `main` / root. The current address in the repository setup is `https://erobbot.github.io/clickity/`.

## Run locally

```sh
python3 -m http.server 8000
```

## Test

```sh
npm install
npm test
```

The tests cover FormSubmit checkout payloads, the optional order API, and order API validation. Playwright starts a local shop server automatically.
