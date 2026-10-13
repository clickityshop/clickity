const { test, expect } = require('@playwright/test');

async function disableReleaseCheck(page) {
  await page.route('https://api.github.com/repos/clickityshop/clickity/commits/main', (route) => route.abort());
}

test('shows the Halloween favicon throughout October only', async ({ browser }) => {
  const cases = [
    { date: new Date(2026, 8, 30, 12), path: '/', favicon: 'assets/favicon.svg' },
    { date: new Date(2026, 9, 1, 12), path: '/', favicon: 'assets/halloween-favicon.svg' },
    { date: new Date(2026, 9, 15, 12), path: '/terms.html', favicon: 'assets/halloween-favicon.svg' },
    { date: new Date(2026, 9, 31, 12), path: '/privacy.html', favicon: 'assets/halloween-favicon.svg' },
    { date: new Date(2026, 10, 1, 12), path: '/', favicon: 'assets/favicon.svg' },
  ];

  for (const { date, path, favicon } of cases) {
    const page = await browser.newPage();
    await page.clock.install({ time: date });
    await page.goto(path);
    await expect(page.locator('link[rel~="icon"]')).toHaveAttribute('href', favicon);
    await page.close();
  }

  const midnightPage = await browser.newPage();
  await midnightPage.clock.install({ time: new Date(2026, 9, 31, 23, 59, 59) });
  await midnightPage.goto('/');
  await expect(midnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/halloween-favicon.svg');
  await midnightPage.clock.fastForward(2000);
  await expect(midnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/favicon.svg');
  await midnightPage.close();
});

test('cart adds products without exposing order details on the public shop', async ({ page }) => {
  await disableReleaseCheck(page);
  await page.goto('/');
  await expect(page.locator('#cartCount')).toHaveText('0');
  await page.locator('.add').first().click();
  await expect(page.locator('#cartCount')).toHaveText('1');
  await page.locator('#openCart').click();
  await expect(page.locator('#drawerTitle')).toHaveText('Your cart');
  await expect(page.locator('#drawerBody')).toContainText('Infinity Cube');
  await expect(page.locator('#recentOrders')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Owner orders' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', 'privacy.html');
});

test('cart is cleared only after the order is successfully placed', async ({ page }) => {
  await disableReleaseCheck(page);
  await page.route('**/config.js', (route) => route.fulfill({
    contentType: 'text/javascript',
    body: `window.CLICKITY_CONFIG = {
      contactEmail: "clickityshop.com@gmail.com",
      currency: "$",
      maxPerItem: 10,
      orderApiUrl: "/api/orders",
      pickupNote: "Pay with cash when you pick up your order at school.",
    };`,
  }));
  await page.route('**/api/orders', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ order: { reference: 'CK-123' } }),
  }));

  await page.goto('/');
  await page.locator('.add').first().click();
  await page.locator('#openCart').click();
  await page.getByRole('button', { name: /Checkout/ }).click();
  await expect(page.locator('#drawerBody')).toContainText('1 item · $5');
  await expect(page.locator('#cartCount')).toHaveText('1');

  await page.locator('[name="name"]').fill('Sam');
  await page.locator('[name="email"]').fill('sam@example.com');
  await page.locator('[name="pickupTime"]').selectOption('before-school');
  await page.locator('[name="pickupLocation"]').fill('by the front office');
  await page.locator('[name="acceptedTerms"]').check();
  await page.getByRole('button', { name: /Place order/ }).click();

  await expect(page.locator('#drawerTitle')).toHaveText('Order sent');
  await expect(page.locator('#drawerBody')).toContainText('CK-123');
  await expect(page.locator('#cartCount')).toHaveText('0');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('clickity-cart'))).toBe('[]');

  await page.locator('#closeCart').click();
  await page.locator('#openCart').click();
  await expect(page.locator('#drawerBody')).toContainText('Your cart is empty.');
});

test('product cards start with varied random colors that match their illustrations', async ({ page }) => {
  await page.addInitScript(() => {
    const values = [0, 0.26, 0.51, 0.76];
    let index = 0;
    Math.random = () => values[index++ % values.length];
  });
  await disableReleaseCheck(page);
  await page.goto('/');

  const cards = page.locator('.card');
  await expect(cards.locator('.pic svg')).toHaveCount(8);
  await expect(cards.locator('.pic canvas')).toHaveCount(0);
  const products = await cards.evaluateAll((elements) => elements.map((card) => ({
    color: card.querySelector('.color').value,
    fill: (() => {
      const shape = card.querySelector('.pic svg g');
      return shape.getAttribute('fill') || shape.querySelector('[fill]:not([fill="none"])')?.getAttribute('fill');
    })(),
  })));
  const colors = products.map((product) => product.color);
  expect(colors.slice(0, 4)).toEqual(['Red', 'Blue', 'Black', 'White']);
  expect(new Set(colors.slice(0, 4)).size).toBe(4);
  expect(products.slice(0, 4).map((product) => product.fill)).toEqual(['#ef3b36', '#1e88e5', '#111111', '#ffffff']);
  await cards.first().locator('.add').click();
  await page.locator('#openCart').click();
  await expect(page.locator('#drawerBody')).toContainText(colors[0]);
});

test('shows a new published commit across pages once with its changes and favicon', async ({ page }) => {
  let commitSha = 'a'.repeat(40);
  await page.route('https://api.github.com/repos/clickityshop/clickity/commits/main', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      sha: commitSha,
      commit: { message: 'This commit message must not be shown to visitors.' },
      files: [
        { filename: 'assets/styles.css', additions: 12, deletions: 4, patch: '+--paper: #fff8ec;\n+--lime: #9be22d;\n+--orange: #ff8a1f;' },
        { filename: 'assets/favicon.svg', additions: 1, deletions: 1, patch: '+fill="#ff8a1f"' },
        { filename: 'booth.html', additions: 2, deletions: 2, patch: '+class="btn lime"\n+background: var(--lime)' },
        { filename: 'products.js', additions: 8, deletions: 8, patch: '+colors: ["Red", "Blue", "Black", "White"]' },
        { filename: 'orders.html', status: 'removed' },
      ],
    }),
  }));

  await page.goto('/booth.html');
  const dialog = page.locator('#releaseDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#releaseHeading')).toHaveText("Welcome! Here's what changed");
  await expect(dialog.locator('#releaseHighlights')).toContainText('The shop is back to its warm tan background, with green highlights, orange buttons, and purple accents.');
  await expect(dialog.locator('#releaseHighlights')).toContainText('The Clickity favicon is back to its original orange design.');
  await expect(dialog.locator('#releaseHighlights')).toContainText('The sales booth now matches the green-and-orange shop theme.');
  await expect(dialog.locator('#releaseHighlights')).toContainText('Updated product color options; each product still gets a random color when the shop opens.');
  await expect(dialog.locator('#releaseHighlights')).toContainText('Removed the owner orders dashboard; orders are now sent by email.');
  await expect(dialog).not.toContainText('This commit message must not be shown to visitors.');
  await expect(dialog.locator('#releaseFilesSummary')).toHaveText("Here are the latest changes you'll notice:");
  await expect(dialog.locator('#releaseCommitLink')).toHaveCount(0);
  await expect(dialog.locator('img')).toHaveAttribute('src', 'assets/favicon.svg');

  await page.getByRole('button', { name: 'Close' }).click();
  await page.goto('/');
  await expect(page.locator('#releaseDialog')).toBeHidden();

  commitSha = 'b'.repeat(40);
  await page.reload();
  await expect(dialog).toBeVisible();
});

test('privacy policy explains order data use and limits liability clearly', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
  await expect(page.locator('main')).toContainText('preferred pickup time and place');
  await expect(page.locator('main')).toContainText('follow school rules');
  await expect(page.locator('#terms')).toContainText('cash or items lost after they have been handed over');
  await expect(page.locator('main')).toContainText('not liable');
});

test('checkout opens a prefilled Gmail draft without sending or storing the order', async ({ page }) => {
  await disableReleaseCheck(page);
  await page.context().route('https://mail.google.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><title>Gmail compose test</title>',
  }));
  let apiRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/orders')) apiRequests += 1;
  });
  await page.goto('/');
  const selectedColor = await page.locator('.card').first().locator('.color').inputValue();
  await page.locator('.add').first().click();
  await page.locator('#openCart').click();
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.locator('[name="name"]').fill('Sam');
  await page.locator('[name="email"]').fill('sam@example.com');
  await page.locator('[name="pickupTime"]').selectOption('before-school');
  await page.locator('[name="pickupLocation"]').fill('by the front office');
  await page.locator('[name="notes"]').fill('Please bring the blue one');
  await page.locator('[name="acceptedTerms"]').check();
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Place order/ }).click();
  const popup = await popupPromise;
  await popup.waitForURL(/mail\.google\.com\/mail\/\?/);
  const composeUrl = new URL(popup.url());
  expect(composeUrl.searchParams.get('to')).toBe('clickityshop.com@gmail.com');
  expect(composeUrl.searchParams.get('su')).toBe('clickity order');
  expect(composeUrl.searchParams.get('body')).toContain('Name: Sam');
  expect(composeUrl.searchParams.get('body')).toContain('Email: sam@example.com');
  expect(composeUrl.searchParams.get('body')).toContain('Pickup time: Before school');
  expect(composeUrl.searchParams.get('body')).toContain('Pickup place: by the front office');
  expect(composeUrl.searchParams.get('body')).toContain(`Infinity Cube (${selectedColor}) - Qty: 1 x $5 = $5`);
  expect(composeUrl.searchParams.get('body')).toContain('Total due at pickup: $5');
  expect(composeUrl.searchParams.get('body')).toContain('Notes: Please bring the blue one');

  await expect(page.locator('#drawerTitle')).toHaveText('Gmail draft ready');
  await expect(page.locator('#drawerBody')).toContainText('click Send');
  await expect(page.locator('#cartCount')).toHaveText('1');
  expect(apiRequests).toBe(0);
});
