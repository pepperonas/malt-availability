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
const { checkLicense } = require('./license');
const { ensureDir, cleanupScreenshots } = require('./utils');

function saveSuccess() {
  const data = { lastSuccess: new Date().toISOString() };
  fs.writeFileSync(config.SUCCESS_FILE_PATH, JSON.stringify(data, null, 2));
}

function checkStaleness() {
  if (!fs.existsSync(config.SUCCESS_FILE_PATH)) return;
  try {
    const data = JSON.parse(fs.readFileSync(config.SUCCESS_FILE_PATH, 'utf8'));
    const lastSuccess = new Date(data.lastSuccess).getTime();
    const daysSince = (Date.now() - lastSuccess) / (24 * 60 * 60 * 1000);
    if (daysSince >= config.STALENESS_WARNING_DAYS) {
      log.warn(`Last successful confirmation was ${Math.floor(daysSince)} days ago!`);
      notify('Malt Availability', `Warning: Last confirmation was ${Math.floor(daysSince)} days ago. Badge may expire soon!`);
    }
  } catch {
    // corrupted file, ignore
  }
}

function notify(title, message) {
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      execFileSync('osascript', [
        '-e',
        `display notification "${message}" with title "${title}"`,
      ]);
    } else if (platform === 'linux') {
      execFileSync('notify-send', [title, message]);
    } else if (platform === 'win32') {
      const safeTitle = title.replace(/[`$"\\]/g, '');
      const safeMessage = message.replace(/[`$"\\]/g, '');
      execFileSync('powershell', [
        '-NoProfile',
        '-Command',
        `$null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]; ` +
          `$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); ` +
          `$textNodes = $template.GetElementsByTagName('text'); ` +
          `$textNodes.Item(0).AppendChild($template.CreateTextNode('${safeTitle}')) | Out-Null; ` +
          `$textNodes.Item(1).AppendChild($template.CreateTextNode('${safeMessage}')) | Out-Null; ` +
          `$toast = [Windows.UI.Notifications.ToastNotification]::new($template); ` +
          `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('malt-availability').Show($toast)`,
      ]);
    }
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

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [0, 15000, 45000]; // immediate, 15s, 45s

async function attemptConfirmation() {
  let browser;
  try {
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
        'Session expired! Run: npm run setup'
      );
      return { success: false, fatal: true };
    }

    log.info(`Logged in. Current URL: ${page.url()}`);
    await takeScreenshot(page, 'dashboard');

    // Step 1: Open the availability dialog by clicking the badge
    log.info('Opening availability dialog...');
    const dialogOpened = await openAvailabilityDialog(page);

    if (!dialogOpened) {
      log.warn('Could not find availability badge on dashboard.');
      await takeScreenshot(page, 'no-badge-found');
      return { success: false, fatal: false };
    }

    // Step 2: Confirm in the dialog (click "Ja" + "Bestätigen")
    log.info('Confirming availability in dialog...');
    const confirmed = await confirmInDialog(page);

    if (confirmed) {
      await takeScreenshot(page, 'confirmed');
      await page.waitForTimeout(2000);
      const pageText = await page.textContent('body').catch(() => '');
      if (
        pageText.includes('Verfügbarkeit heute bestätigt') ||
        pageText.includes('Verfügbarkeit bestätigt')
      ) {
        log.success('Availability confirmed successfully!');
        return { success: true };
      } else {
        log.success('Confirm button clicked. Awaiting page verification.');
        await takeScreenshot(page, 'post-confirm');
        return { success: true };
      }
    } else {
      log.warn('Could not click confirm button in dialog.');
      await takeScreenshot(page, 'dialog-no-confirm');
      return { success: false, fatal: false };
    }
  } catch (err) {
    log.error(`Attempt error: ${err.message}`);
    return { success: false, fatal: false, error: err.message };
  } finally {
    if (browser) await browser.close();
  }
}

async function run() {
  log.info('=== Malt availability confirmation started ===');

  // Cleanup old screenshots
  cleanupScreenshots(config.SCREENSHOTS_DIR);

  // Check staleness before attempting
  checkStaleness();

  // License check
  log.info('Checking license...');
  const licenseStatus = await checkLicense();
  if (!licenseStatus.valid) {
    log.error(`License check failed: ${licenseStatus.error}`);
    log.error('Purchase a license at: ' + config.LICENSE_SERVER_URL);
    log.error('Then run: npm run activate');
    notify('Malt Availability', 'No valid license. Run: npm run activate');
    process.exit(1);
  }
  if (licenseStatus.offline) {
    log.warn(`License server unreachable. Grace period: ${licenseStatus.graceDaysRemaining} day(s) remaining.`);
  }
  log.info(`License valid (${licenseStatus.type})`);

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

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt] || 45000;
      log.info(`Retry ${attempt}/${MAX_RETRIES - 1} after ${delay / 1000}s delay...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const result = await attemptConfirmation();

    if (result.success) {
      saveSuccess();
      notify('Malt Availability', 'Verfuegbarkeit erfolgreich bestaetigt!');
      log.info('=== Malt availability confirmation finished ===');
      return;
    }

    if (result.fatal) {
      // Non-retryable errors (expired session)
      process.exit(1);
    }

    log.warn(`Attempt ${attempt + 1}/${MAX_RETRIES} failed.`);
  }

  // All retries exhausted
  log.error(`All ${MAX_RETRIES} attempts failed.`);
  notify('Malt Availability', `Confirmation failed after ${MAX_RETRIES} attempts. Check logs.`);
  process.exit(1);
}

run();
