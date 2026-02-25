#!/usr/bin/env node
/**
 * malt-availability - License Activation
 *
 * Prompts for a license key, validates it against the license server,
 * and saves it locally for future use.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const readline = require('readline');
const config = require('./config');

function ask(question) {
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

function request(url, data) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;
    const body = JSON.stringify(data);

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch {
            reject(new Error(`Invalid server response: ${responseData}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function loadLicense() {
  if (!fs.existsSync(config.LICENSE_FILE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(config.LICENSE_FILE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function saveLicense(data) {
  fs.writeFileSync(config.LICENSE_FILE_PATH, JSON.stringify(data, null, 2));
}

async function validateKey(key) {
  const url = `${config.LICENSE_SERVER_URL}/api/validate-license`;
  try {
    const result = await request(url, { key });
    return result;
  } catch (err) {
    return { valid: false, error: `Could not reach license server: ${err.message}` };
  }
}

async function activate() {
  console.log('');
  console.log('=== malt-availability License Activation ===');
  console.log('');

  // Check if already activated
  const existing = loadLicense();
  if (existing && existing.key) {
    console.log(`Current license: ${existing.key}`);
    console.log(`Type: ${existing.type || 'unknown'}`);
    console.log(`Activated: ${existing.activatedAt || 'unknown'}`);
    console.log('');
    const replace = await ask('Replace existing license? (y/N): ');
    if (replace.toLowerCase() !== 'y') {
      console.log('Keeping existing license.');
      return;
    }
  }

  console.log('Purchase a license at: ' + config.LICENSE_SERVER_URL);
  console.log('  - Monthly:  5 EUR/month');
  console.log('  - Lifetime: 49 EUR (one-time)');
  console.log('');

  const key = await ask('Enter your license key: ');

  if (!key) {
    console.error('No key entered. Aborting.');
    process.exit(1);
  }

  // Validate format
  if (!/^MALT-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(key)) {
    console.error('Invalid key format. Expected: MALT-XXXX-XXXX-XXXX-XXXX');
    process.exit(1);
  }

  console.log('Validating license key...');

  const result = await validateKey(key);

  if (!result.valid) {
    console.error(`License validation failed: ${result.error || 'Invalid key'}`);
    process.exit(1);
  }

  saveLicense({
    key,
    type: result.type,
    email: result.email,
    activatedAt: new Date().toISOString(),
    validatedAt: new Date().toISOString(),
  });

  console.log('');
  console.log('License activated successfully!');
  console.log(`  Type: ${result.type}`);
  console.log(`  Email: ${result.email}`);
  console.log('');
  console.log('You can now run: npm run confirm');
}

// Also export for use in confirm-availability.js
async function checkLicense() {
  const license = loadLicense();

  if (!license || !license.key) {
    return { valid: false, error: 'No license found. Run "npm run activate" first.' };
  }

  // Re-validate against server periodically (every 24h)
  const lastValidated = license.validatedAt
    ? new Date(license.validatedAt).getTime()
    : 0;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  if (lastValidated < oneDayAgo) {
    const result = await validateKey(license.key);
    if (result.valid) {
      license.validatedAt = new Date().toISOString();
      saveLicense(license);
      return { valid: true, type: result.type };
    }
    return { valid: false, error: result.error || 'License no longer valid' };
  }

  return { valid: true, type: license.type };
}

module.exports = { checkLicense, loadLicense, validateKey };

// Run activation if called directly
if (require.main === module) {
  activate().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
