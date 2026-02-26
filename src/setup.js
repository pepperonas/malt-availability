#!/usr/bin/env node
/**
 * Setup script - Opens a visible browser for initial Google SSO login.
 * The session is saved to browser-data/ for subsequent headless runs.
 *
 * Usage: npm run setup
 */

const { chromium } = require('playwright');
const fs = require('fs');
const config = require('./config');
const log = require('./logger');
const { ensureDir } = require('./utils');

async function setup() {
  log.info('=== ProfilePulse setup started ===');
  log.info('A browser window will open. Please log in to malt.de via Google SSO.');
  log.info('After logging in, the browser will close automatically when it detects the dashboard.');

  ensureDir(config.BROWSER_DATA_DIR);

  const browser = await chromium.launchPersistentContext(config.BROWSER_DATA_DIR, {
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 900 },
  });

  const page = browser.pages()[0] || (await browser.newPage());

  // Navigate to Malt sign-in
  await page.goto(config.MALT_SIGNIN_URL, {
    waitUntil: 'domcontentloaded',
    timeout: config.NAVIGATION_TIMEOUT_MS,
  });

  log.info('Waiting for successful login (up to 5 minutes)...');
  log.info('Please complete the Google SSO login in the browser window.');

  // Poll for successful login - check if we land on dashboard or any authenticated page
  const startTime = Date.now();
  const maxWaitMs = 5 * 60 * 1000; // 5 minutes

  while (Date.now() - startTime < maxWaitMs) {
    await page.waitForTimeout(2000);
    const url = page.url();

    if (
      url.includes('/dashboard') ||
      (url.includes('malt.de') &&
        !url.includes('/signin') &&
        !url.includes('/who-are-you') &&
        !url.includes('accounts.google.com'))
    ) {
      // Verify we're actually on an authenticated page
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      if (!currentUrl.includes('/signin') && !currentUrl.includes('accounts.google.com')) {
        log.success('Login successful! Session saved.');
        log.info(`Current URL: ${currentUrl}`);

        // Navigate to dashboard to verify
        await page.goto(config.MALT_DASHBOARD_URL, {
          waitUntil: 'domcontentloaded',
          timeout: config.NAVIGATION_TIMEOUT_MS,
        });
        await page.waitForTimeout(3000);

        if (!page.url().includes('/signin')) {
          log.success('Dashboard accessible. Setup complete!');
          log.info('You can now close this window. The automated script will run headless.');
          log.info('');
          log.info('Next steps:');
          log.info('  npm run confirm          - Run confirmation once');
          log.info('  npm run install-schedule - Install daily scheduler');
          await page.waitForTimeout(3000);
          await browser.close();
          return;
        }
      }
    }
  }

  log.error('Login timeout after 5 minutes. Please try again.');
  await browser.close();
  process.exit(1);
}

setup();
