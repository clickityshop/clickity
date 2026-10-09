const { test, expect } = require('@playwright/test');

async function useTestApi(page) {
  await page.route('**/config.js', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /orderApiUrl:\s*"[^"]*"/,
      'orderApiUrl: "https://orders.test"',
    );
    await route.fulfill({ response, body });
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://127.0.0.1:8000',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Content-Type': 'application/json',
};

test('cart adds products without exposing order details on the public shop', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#cartCount')).toHaveText('0');
  await page.locator('.add').first().click();
  await expect(page.locator('#cartCount')).toHaveText('1');
  await page.locator('#openCart').click();
  await expect(page.locator('#drawerTitle')).toHaveText('Your cart');
  await expect(page.locator('#drawerBody')).toContainText('Infinity Cube');
  await expect(page.locator('#recentOrders')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Owner orders' })).toHaveAttribute('href', 'orders.html');
  await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', 'privacy.html');
});

test('product cards start with varied random colors that match their illustrations', async ({ page }) => {
  await page.addInitScript(() => {
    const values = [0, 0.26, 0.51, 0.76];
    let index = 0;
    Math.random = () => values[index++ % values.length];
  });
  await page.goto('/');

  const cards = page.locator('.card');
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

test('privacy policy explains order data use and limits liability clearly', async ({ page }) => {
  await page.goto('/privacy.html');
  await expect(page.getByRole('heading', { name: 'Privacy policy' })).toBeVisible();
  await expect(page.locator('main')).toContainText('preferred pickup time and place');
  await expect(page.locator('main')).toContainText('follow school rules');
  await expect(page.locator('#terms')).toContainText('cash or items lost after they have been handed over');
  await expect(page.locator('main')).toContainText('not liable');
});

test('checkout sends the customer, pickup time and place, and items to the order API', async ({ page }) => {
  await useTestApi(page);
  let submittedOrder;
  await page.route('https://orders.test/api/orders', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    submittedOrder = JSON.parse(route.request().postData());
    await route.fulfill({
      status: 201,
      headers: corsHeaders,
      body: JSON.stringify({ order: { reference: 'CK-261009-ABCD', totalCents: 500 } }),
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
  await page.locator('[name="acceptedTerms"]').check();
  await page.getByRole('button', { name: /Place order/ }).click();

  await expect(page.locator('#drawerTitle')).toHaveText('Order received');
  await expect(page.locator('#drawerBody')).toContainText('CK-261009-ABCD');
  await expect(page.locator('#drawerBody')).toContainText('$5');
  expect(submittedOrder.name).toBe('Sam');
  expect(submittedOrder.email).toBe('sam@example.com');
  expect(submittedOrder.pickupTime).toBe('before-school');
  expect(submittedOrder.pickupLocation).toBe('by the front office');
  expect(submittedOrder.acceptedTerms).toBe(true);
  expect(submittedOrder.expectedTotalCents).toBe(500);
  expect(submittedOrder.items).toEqual([{ id: 'infinity-cube', color: selectedColor, qty: 1 }]);
});

test('owner dashboard shows who, what, and cash due, then tracks pickup', async ({ page }) => {
  await useTestApi(page);
  const order = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    reference: 'CK-261009-ABCD',
    createdAt: '2026-10-09T01:00:00.000Z',
    name: 'Sam',
    email: 'sam@example.com',
    pickupTime: 'after-school',
    pickupLocation: 'by the front office',
    notes: '',
    items: [{ id: 'infinity-cube', name: 'Infinity Cube', color: 'Red', qty: 2, unitPriceCents: 500 }],
    totalCents: 1000,
    status: 'pending',
  };
  await page.route('https://orders.test/api/orders**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (route.request().method() === 'PATCH') {
      order.status = JSON.parse(route.request().postData()).status;
      await route.fulfill({ status: 200, headers: corsHeaders, body: '{"ok":true}' });
      return;
    }
    expect(route.request().headers().authorization).toBe('Bearer this-is-a-long-test-password-12345');
    await route.fulfill({ status: 200, headers: corsHeaders, body: JSON.stringify({ orders: [order] }) });
  });
  await page.goto('/orders.html');
  await page.locator('#dashboardPassword').fill('this-is-a-long-test-password-12345');
  await page.getByRole('button', { name: 'Show my orders' }).click();

  await expect(page.locator('.dashboard-order')).toContainText('Sam');
  await expect(page.locator('.dashboard-order')).toContainText('sam@example.com');
  await expect(page.locator('.dashboard-order')).toContainText('Meet after school');
  await expect(page.locator('.dashboard-order')).toContainText('At by the front office');
  await expect(page.locator('.dashboard-order')).toContainText('Infinity Cube');
  await expect(page.locator('.dashboard-order-total')).toContainText('$10');
  await page.getByRole('button', { name: 'Mark picked up & paid' }).click();
  await expect(page.locator('.order-status')).toHaveText('Picked up');
  await expect(page.locator('.order-stat').nth(1)).toContainText('$0');
});
