#!/usr/bin/env node
/**
 * malt-availability - Automated availability confirmation for malt.de
 *
 * Uses a persistent Playwright browser context to maintain the login session.
 * Run `npm run setup` first to log in via Google SSO.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const config = require('./config');
const log = require('./logger');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function notify(title, message) {
  try {
    execFileSync('osascript', [
      '-e',
      `display notification "${message}" with title "${title}"`,
    ]);
  } catch {
    // notification is best-effort
  }
}

async function takeScreenshot(page, name) {
  ensureDir(config.SCREENSHOTS_DIR);
  const file = path.join(
    config.SCREENSHOTS_DIR,
    `${name}-${Date.now()}.png`
  );
  await page.screenshot({ path: file, fullPage: false });
  log.info(`Screenshot saved: ${file}`);
  return file;
}

async function waitForCloudflare(page) {
  // Cloudflare Turnstile challenge may appear - wait for it to auto-resolve
  const maxWait = 30000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const pageText = await page.textContent('body').catch(() => '');
    if (
      pageText.includes('security verification') ||
      pageText.includes('Verify you are human') ||
      pageText.includes('Performing security')
    ) {
      log.info('Cloudflare challenge detected, waiting...');
      // Try clicking the checkbox if present
      try {
        const turnstile = page.frameLocator('iframe[src*="challenges"]');
        const checkbox = turnstile.locator('input[type="checkbox"], .cb-lb');
        if (await checkbox.isVisible({ timeout: 2000 })) {
          await checkbox.click();
          log.info('Clicked Cloudflare checkbox');
        }
      } catch {
        // iframe may not be accessible, just wait
      }
      await page.waitForTimeout(3000);
    } else {
      return; // No Cloudflare challenge
    }
  }
  log.warn('Cloudflare challenge did not resolve within timeout');
}

async function isLoggedIn(page) {
  try {
    await page.goto(config.MALT_DASHBOARD_URL, {
      waitUntil: 'domcontentloaded',
      timeout: config.NAVIGATION_TIMEOUT_MS,
    });
    // Wait for page to settle and handle Cloudflare
    await page.waitForTimeout(3000);
    await waitForCloudflare(page);

    const url = page.url();
    // If redirected to signin, we're not logged in
    if (url.includes('/signin') || url.includes('/who-are-you')) {
      return false;
    }
    return true;
  } catch (err) {
    log.error(`Navigation error: ${err.message}`);
    return false;
  }
}

async function openAvailabilityDialog(page) {
  // The availability status badge is in the top-right corner of the dashboard.
  // Clicking it opens a dialog where we can confirm availability.

  // Try data-testid first (most reliable)
  try {
    const badge = page.locator('[data-testid*="availability"]').first();
    if (await badge.isVisible({ timeout: 3000 })) {
      const text = await badge.textContent();
      log.info(`Found availability badge: "${text.trim()}"`);
      await badge.click();
      await page.waitForTimeout(1500);
      return true;
    }
  } catch { /* continue */ }

  // Fallback: look for text-based matches
  const patterns = [
    'Verfügbarkeit bestätigt',
    'Verfügbarkeit nicht bestätigt',
    'Nicht verfügbar',
    'Availability confirmed',
  ];
  for (const pattern of patterns) {
    try {
      const el = page.locator(`button:has-text("${pattern}"), [role="button"]:has-text("${pattern}"), a:has-text("${pattern}")`).first();
      if (await el.isVisible({ timeout: 1000 })) {
        log.info(`Found availability element: "${pattern}"`);
        await el.click();
        await page.waitForTimeout(1500);
        return true;
      }
    } catch { /* continue */ }
  }

  return false;
}

async function confirmInDialog(page) {
  // After clicking the availability badge, a dialog opens:
  // "Bist Du offen für neue Projektanfragen?" -> Ja/Nein
  // "Wie viele Tage pro Woche bist Du verfügbar?" -> dropdown
  // [Bestätigen] button
  //
  // We need to:
  // 1. Ensure "Ja" is selected
  // 2. Click "Bestätigen"

  await page.waitForTimeout(1000);

  // Step 1: Click "Ja" if not already selected
  try {
    const jaButton = page.getByRole('button', { name: 'Ja' });
    if (await jaButton.isVisible({ timeout: 2000 })) {
      await jaButton.click();
      log.info('Clicked "Ja" (open for new projects)');
      await page.waitForTimeout(500);
    }
  } catch {
    // "Ja" might already be selected or use different selector
    try {
      const jaText = page.locator('button:has-text("Ja"), [role="button"]:has-text("Ja")').first();
      if (await jaText.isVisible({ timeout: 1000 })) {
        await jaText.click();
        log.info('Clicked "Ja" via text match');
        await page.waitForTimeout(500);
      }
    } catch { /* may already be selected */ }
  }

  await takeScreenshot(page, 'dialog-before-confirm');

  // Step 2: Click "Bestätigen" button in the dialog
  const confirmPatterns = ['Bestätigen', 'Confirm', 'Speichern', 'Save'];
  for (const pattern of confirmPatterns) {
    try {
      const btn = page.getByRole('button', { name: pattern, exact: true });
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        log.info(`Clicked "${pattern}" button in dialog`);
        await page.waitForTimeout(2000);
        return true;
      }
    } catch { /* try next */ }
  }

  // Fallback: broader search for confirm button
  try {
    const confirmBtn = page.locator('button:has-text("Bestätigen")').first();
    if (await confirmBtn.isVisible({ timeout: 2000 })) {
      await confirmBtn.click();
      log.info('Clicked "Bestätigen" via locator');
      await page.waitForTimeout(2000);
      return true;
    }
  } catch { /* continue */ }

  log.warn('Could not find confirm button in dialog');
  return false;
}

async function run() {
  log.info('=== Malt availability confirmation started ===');

  ensureDir(config.BROWSER_DATA_DIR);

  // Check if browser data exists (user has run setup)
  const hasSession = fs.existsSync(
    path.join(config.BROWSER_DATA_DIR, 'Default')
  );
  if (!hasSession) {
    log.error(
      'No browser session found. Run "npm run setup" first to log in.'
    );
    notify(
      'Malt Availability',
      'No session found. Run npm run setup to log in.'
    );
    process.exit(1);
  }

  let browser;
  try {
    // Use visible browser (not headless) to avoid Cloudflare bot detection.
    // Window is positioned off-screen to be non-intrusive.
    browser = await chromium.launchPersistentContext(config.BROWSER_DATA_DIR, {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-position=-2400,-2400',
        '--window-size=1280,800',
      ],
      viewport: { width: 1280, height: 800 },
    });

    const page = browser.pages()[0] || (await browser.newPage());

    // Check if we're logged in
    log.info('Checking login status...');
    const loggedIn = await isLoggedIn(page);

    if (!loggedIn) {
      log.error('Session expired. Run "npm run setup" to log in again.');
      await takeScreenshot(page, 'session-expired');
      notify(
        'Malt Availability',
        'Session expired! Run: cd ~/claude/malt-availability/malt-availability && npm run setup'
      );
      process.exit(1);
    }

    log.info(`Logged in. Current URL: ${page.url()}`);
    await takeScreenshot(page, 'dashboard');

    // Step 1: Open the availability dialog by clicking the badge
    log.info('Opening availability dialog...');
    const dialogOpened = await openAvailabilityDialog(page);

    if (!dialogOpened) {
      log.warn('Could not find availability badge on dashboard.');
      await takeScreenshot(page, 'no-badge-found');
      notify('Malt Availability', 'Could not find availability badge. Check logs.');
    } else {
      // Step 2: Confirm in the dialog (click "Ja" + "Bestätigen")
      log.info('Confirming availability in dialog...');
      const confirmed = await confirmInDialog(page);

      if (confirmed) {
        await takeScreenshot(page, 'confirmed');
        // Check if the dashboard shows confirmation
        await page.waitForTimeout(2000);
        const pageText = await page.textContent('body').catch(() => '');
        if (
          pageText.includes('Verfügbarkeit heute bestätigt') ||
          pageText.includes('Verfügbarkeit bestätigt')
        ) {
          log.success('Availability confirmed successfully!');
          notify('Malt Availability', 'Verfuegbarkeit erfolgreich bestaetigt!');
        } else {
          log.success('Confirm button clicked. Awaiting page verification.');
          await takeScreenshot(page, 'post-confirm');
          notify('Malt Availability', 'Availability confirmation attempted.');
        }
      } else {
        log.warn('Could not click confirm button in dialog.');
        await takeScreenshot(page, 'dialog-no-confirm');
        notify('Malt Availability', 'Could not confirm in dialog. Check logs.');
      }
    }
  } catch (err) {
    log.error(`Unexpected error: ${err.message}`);
    notify('Malt Availability', `Error: ${err.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }

  log.info('=== Malt availability confirmation finished ===');
}

run();
