#!/usr/bin/env node
/**
 * Interactive setup - Logs in to malt.de with email and password.
 * Prompts for credentials via terminal, then saves the session
 * to browser-data/ for subsequent automated runs.
 *
 * Usage: npm run setup:login
 */

const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');
const config = require('./config');
const log = require('./logger');
const { ensureDir } = require('./utils');

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Disable echo for password input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdout.write(question);
    let password = '';

    const onData = (char) => {
      const str = char.toString();
      if (str === '\n' || str === '\r' || str === '\u0004') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (str === '\u007F' || str === '\b') {
        // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (str === '\u0003') {
        // Ctrl+C
        process.stdout.write('\n');
        process.exit(1);
      } else {
        password += str;
        process.stdout.write('*');
      }
    };

    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function setupLogin() {
  console.log('\n  Malt Availability - Login Setup');
  console.log('  ================================\n');
  console.log('  This will log you in to malt.de and save the session');
  console.log('  for automated availability confirmation.\n');

  const email = await prompt('  Email: ');
  if (!email) {
    console.error('  Error: Email is required.');
    process.exit(1);
  }

  const password = await promptPassword('  Password: ');
  if (!password) {
    console.error('  Error: Password is required.');
    process.exit(1);
  }

  console.log('\n  Logging in...\n');
  log.info('=== Malt availability login setup started ===');

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

  try {
    // Navigate to sign-in page
    await page.goto(config.MALT_SIGNIN_URL, {
      waitUntil: 'domcontentloaded',
      timeout: config.NAVIGATION_TIMEOUT_MS,
    });
    await page.waitForTimeout(2000);

    // Handle Cloudflare if present
    const maxCfWait = 15000;
    const cfStart = Date.now();
    while (Date.now() - cfStart < maxCfWait) {
      const bodyText = await page.textContent('body').catch(() => '');
      if (
        bodyText.includes('security verification') ||
        bodyText.includes('Verify you are human')
      ) {
        log.info('Waiting for Cloudflare challenge...');
        await page.waitForTimeout(3000);
      } else {
        break;
      }
    }

    // Fill in email
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="unternehmen"], input[placeholder*="email"]').first();
    await emailField.waitFor({ state: 'visible', timeout: 10000 });
    await emailField.fill(email);
    log.info('Email entered.');

    // Fill in password
    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.waitFor({ state: 'visible', timeout: 5000 });
    await passwordField.fill(password);
    log.info('Password entered.');

    // Click login button
    const loginButton = page.getByRole('button', { name: /anmelden|sign in|login/i });
    await loginButton.click();
    log.info('Login button clicked. Waiting for redirect...');

    // Wait for successful login
    const startTime = Date.now();
    const maxWaitMs = 30000;

    while (Date.now() - startTime < maxWaitMs) {
      await page.waitForTimeout(2000);
      const url = page.url();

      if (
        url.includes('/dashboard') ||
        (url.includes('malt.de') &&
          !url.includes('/signin') &&
          !url.includes('/who-are-you'))
      ) {
        await page.waitForTimeout(3000);
        const currentUrl = page.url();
        if (!currentUrl.includes('/signin')) {
          // Verify dashboard access
          await page.goto(config.MALT_DASHBOARD_URL, {
            waitUntil: 'domcontentloaded',
            timeout: config.NAVIGATION_TIMEOUT_MS,
          });
          await page.waitForTimeout(3000);

          if (!page.url().includes('/signin')) {
            log.success('Login successful! Session saved.');
            console.log('\n  Login successful! Session saved.\n');
            console.log('  Next steps:');
            console.log('    npm run confirm          - Run confirmation once');
            console.log('    npm run install-schedule  - Install daily scheduler\n');
            await browser.close();
            return;
          }
        }
      }

      // Check for login errors
      const bodyText = await page.textContent('body').catch(() => '');
      if (
        bodyText.includes('falsches Passwort') ||
        bodyText.includes('incorrect password') ||
        bodyText.includes('Ungültig') ||
        bodyText.includes('invalid')
      ) {
        log.error('Invalid credentials.');
        console.error('\n  Error: Invalid email or password.\n');
        await browser.close();
        process.exit(1);
      }
    }

    log.error('Login timed out. Check credentials or try npm run setup for Google SSO.');
    console.error('\n  Error: Login timed out. Please verify your credentials.');
    console.error('  Alternatively, use "npm run setup" for Google SSO login.\n');
    await browser.close();
    process.exit(1);
  } catch (err) {
    log.error(`Setup error: ${err.message}`);
    console.error(`\n  Error: ${err.message}\n`);
    await browser.close();
    process.exit(1);
  }
}

setupLogin();
