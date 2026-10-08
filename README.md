# Clickity

A storefront for 3D printed fidgets, made for middle schoolers. Plain static HTML/CSS/JS: no build step, no server, no Node.

- **`index.html`**: the shop. Customers add items to a cart, fill out a short form, and the order is emailed to you. No money changes hands online: they pay cash at pickup.
- **`booth.html`**: the in-person sales screen for school events (phone, tablet or laptop). Tap items, pick the cash given and see the change due, then complete the sale. The sales log stays on that device and can be exported to CSV or emailed as a daily summary. It isn't linked from the shop.

## Setup

1. **Order email:** set `orderEmail` in `config.js`. Orders go through [FormSubmit.co](https://formsubmit.co), which is free and needs no account. The first order sends an activation email to that address. Click the link once. FormSubmit then gives you a random alias you can use in place of your real address, so it isn't visible in the page source.
2. **Products:** edit `products.js`. Put photos in `photos/` and set `photo: "photos/whatever.jpg"`. Products without a photo get a colored placeholder drawing.
3. **Schools:** to show a dropdown instead of a text box, list the schools in `config.js` → `schools`.

## Hosting (GitHub Pages)

Repo Settings → Pages → Deploy from branch → `main` / root. The site goes live at `https://erobbot.github.io/clickity/`.

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```
