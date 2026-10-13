# Clickity

A storefront for 3D-printed fidgets hosted on GitHub Pages. Customers pay cash at pickup.

- **`index.html`**: the shop and checkout.
- **`privacy.html`**: explains what order information Clickity collects and how it is used.
- **`booth.html`**: in-person sales screen for school events. Its sales log stays on that device and can be exported to CSV or emailed as a daily summary. It isn't linked to online orders.

When a customer places an order, the shop opens a prefilled Gmail draft addressed to `clickityshop.com@gmail.com`. It includes the customer's contact and pickup details, items, total, and notes. The customer reviews the draft and clicks Send; orders are not stored by the website. Customers pay cash at pickup.

Every site page checks the latest commit on the `main` branch and shows a plain-language summary of visible changes in a welcome popup the first time a visitor opens any page after that commit. It does not show the commit message or link visitors to commit details. Dismissing the popup is remembered across pages in that browser until a newer commit is published. This requires access to the GitHub API.

## Products

Edit `products.js` to add or change products, prices, colors, and model shapes. The shop randomly picks one available color for each product whenever the page opens; customers can change it before adding the item to their cart. Put photos in `photos/` and set `photo: "photos/whatever.jpg"`. Products without a photo are rendered as Three.js model images; colored SVG drawings remain visible if 3D rendering is unavailable.

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

The tests cover checkout's Gmail draft contents and order API validation. Playwright starts a local shop server automatically.
