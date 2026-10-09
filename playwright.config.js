const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: 'cart.spec.js',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8000',
  },
  webServer: {
    command: 'python3 -m http.server 8000 --bind 0.0.0.0',
    url: 'http://127.0.0.1:8000',
    reuseExistingServer: !process.env.CI,
  },
});
