const path = require('path');
const fs = require('fs');

const PROJECT_DIR = path.resolve(__dirname, '..');
const BROWSER_DATA_DIR = path.join(PROJECT_DIR, 'browser-data');
const LOGS_DIR = path.join(PROJECT_DIR, 'logs');
const SCREENSHOTS_DIR = path.join(LOGS_DIR, 'screenshots');

// Load .env from project root (if exists)
const envFile = path.join(PROJECT_DIR, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

module.exports = {
  PROJECT_DIR,
  BROWSER_DATA_DIR,
  LOGS_DIR,
  SCREENSHOTS_DIR,
  MALT_DASHBOARD_URL: 'https://www.malt.de/dashboard/freelancer/',
  MALT_SIGNIN_URL: 'https://www.malt.de/signin',
  MALT_BASE_URL: 'https://www.malt.de',
  TIMEOUT_MS: 30000,
  NAVIGATION_TIMEOUT_MS: 60000,
  LICENSE_SERVER_URL: process.env.LICENSE_SERVER_URL || 'https://malt-license.example.com',
  LICENSE_FILE_PATH: path.join(PROJECT_DIR, 'license.json'),
  SUCCESS_FILE_PATH: path.join(PROJECT_DIR, 'last-success.json'),
  STALENESS_WARNING_DAYS: 5,
  LICENSE_GRACE_PERIOD_DAYS: 7,
};
