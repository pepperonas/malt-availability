const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const BROWSER_DATA_DIR = path.join(PROJECT_DIR, 'browser-data');
const LOGS_DIR = path.join(PROJECT_DIR, 'logs');
const SCREENSHOTS_DIR = path.join(LOGS_DIR, 'screenshots');

module.exports = {
  PROJECT_DIR,
  BROWSER_DATA_DIR,
  LOGS_DIR,
  SCREENSHOTS_DIR,
  MALT_DASHBOARD_URL: 'https://www.malt.de/dashboard/freelancer/',
  MALT_SIGNIN_URL: 'https://www.malt.de/signin',
  MALT_BASE_URL: 'https://www.malt.de',
  PROFILE_URL: 'https://www.malt.de/profile/martinpfeffer',
  TIMEOUT_MS: 30000,
  NAVIGATION_TIMEOUT_MS: 60000,
};
