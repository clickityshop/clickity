const { test, expect } = require('@playwright/test');

async function disableReleaseCheck(page) {
  await page.route('https://api.github.com/repos/clickityshop/clickity/commits/main', (route) => route.abort());
}

test('shows seasonal favicons throughout March, October, and December only', async ({ browser }) => {
  const cases = [
    { date: new Date(2026, 1, 28, 12), path: '/', favicon: 'assets/favicon.svg' },
    { date: new Date(2026, 2, 1, 12), path: '/', favicon: 'assets/st-patricks-favicon.png' },
    { date: new Date(2026, 2, 17, 12), path: '/terms.html', favicon: 'assets/st-patricks-favicon.png' },
    { date: new Date(2026, 2, 31, 12), path: '/privacy.html', favicon: 'assets/st-patricks-favicon.png' },
    { date: new Date(2026, 3, 1, 12), path: '/', favicon: 'assets/favicon.svg' },
    { date: new Date(2026, 8, 30, 12), path: '/', favicon: 'assets/favicon.svg' },
    { date: new Date(2026, 9, 1, 12), path: '/', favicon: 'assets/halloween-favicon.svg' },
    { date: new Date(2026, 9, 15, 12), path: '/terms.html', favicon: 'assets/halloween-favicon.svg' },
    { date: new Date(2026, 9, 31, 12), path: '/privacy.html', favicon: 'assets/halloween-favicon.svg' },
    { date: new Date(2026, 10, 1, 12), path: '/', favicon: 'assets/favicon.svg' },
    { date: new Date(2026, 10, 30, 12), path: '/', favicon: 'assets/favicon.svg' },
    { date: new Date(2026, 11, 1, 12), path: '/', favicon: 'assets/christmas-favicon.png' },
    { date: new Date(2026, 11, 15, 12), path: '/terms.html', favicon: 'assets/christmas-favicon.png' },
    { date: new Date(2026, 11, 31, 12), path: '/privacy.html', favicon: 'assets/christmas-favicon.png' },
    { date: new Date(2027, 0, 1, 12), path: '/', favicon: 'assets/favicon.svg' },
  ];

  for (const { date, path, favicon } of cases) {
    const page = await browser.newPage();
    await page.clock.install({ time: date });
    await page.goto(path);
    await expect(page.locator('link[rel~="icon"]')).toHaveAttribute('href', favicon);
    await expect(page.locator('link[rel~="icon"]')).toHaveAttribute(
      'type',
      favicon.endsWith('.png') ? 'image/png' : 'image/svg+xml',
    );
    const logoDot = page.locator('.logo .dot');
    if (favicon === 'assets/favicon.svg') {
      await expect(logoDot).toHaveCSS('background-image', 'none');
    } else {
      await expect(logoDot).toHaveCSS('background-image', new RegExp(favicon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    await expect(logoDot).toHaveCSS('border-radius', '50%');
    await page.close();
  }

  const midnightPage = await browser.newPage();
  await midnightPage.clock.install({ time: new Date(2026, 9, 31, 23, 59, 59) });
  await midnightPage.goto('/');
  await expect(midnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/halloween-favicon.svg');
  await midnightPage.clock.fastForward(2000);
  await expect(midnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/favicon.svg');
  await midnightPage.close();

  const christmasMidnightPage = await browser.newPage();
  await christmasMidnightPage.clock.install({ time: new Date(2026, 11, 31, 23, 59, 59) });
  await christmasMidnightPage.goto('/');
  await expect(christmasMidnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/christmas-favicon.png');
  await christmasMidnightPage.clock.fastForward(2000);
  await expect(christmasMidnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/favicon.svg');
  await christmasMidnightPage.close();

  const stPatricksMidnightPage = await browser.newPage();
  await stPatricksMidnightPage.clock.install({ time: new Date(2026, 2, 31, 23, 59, 59) });
  await stPatricksMidnightPage.goto('/');
  await expect(stPatricksMidnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/st-patricks-favicon.png');
  await stPatricksMidnightPage.clock.fastForward(2000);
  await expect(stPatricksMidnightPage.locator('link[rel~="icon"]')).toHaveAttribute('href', 'assets/favicon.svg');
  await stPatricksMidnightPage.close();
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

test('checkout submits a named order form directly to FormSubmit', async ({ page }) => {
  await disableReleaseCheck(page);
  let submittedOrder;
  await page.route('https://formsubmit.co/**', async (route) => {
    const request = route.request();
    submittedOrder = {
      url: request.url(),
      method: request.method(),
      body: new URLSearchParams(request.postData()),
    };
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Submitted</title>',
    });
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
  await expect(page.locator('#orderForm')).toHaveAttribute(
    'action',
    'https://formsubmit.co/clickityshop.com@gmail.com',
  );
  await expect(page.locator('#orderForm')).toHaveAttribute('method', 'POST');
  await page.getByRole('button', { name: /Place order/ }).click();
  await page.waitForURL('https://formsubmit.co/**');
  expect(submittedOrder.url).toBe('https://formsubmit.co/clickityshop.com@gmail.com');
  expect(submittedOrder.method).toBe('POST');
  expect(submittedOrder.body.get('name')).toBe('Sam');
  expect(submittedOrder.body.get('email')).toBe('sam@example.com');
  expect(submittedOrder.body.get('pickupTime')).toBe('before-school');
  expect(submittedOrder.body.get('pickupLocation')).toBe('by the front office');
  expect(submittedOrder.body.get('Items')).toContain(`1 × Infinity Cube (${selectedColor})`);
  expect(submittedOrder.body.get('Total due at pickup')).toBe('$5');
  expect(submittedOrder.body.get('Notes')).toBe('Please bring the blue one');
  expect(submittedOrder.body.get('_replyto')).toBe('sam@example.com');
  expect(submittedOrder.body.get('_cc')).toBe('wesley.eifler@franklinsabers.org');
  expect(submittedOrder.body.get('_template')).toBe('table');
  expect(submittedOrder.body.get('acceptedTerms')).toBe('on');
});
