const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const config = require('../src/config');

describe('config', () => {
  it('exports all required paths', () => {
    assert.ok(config.PROJECT_DIR);
    assert.ok(config.BROWSER_DATA_DIR);
    assert.ok(config.LOGS_DIR);
    assert.ok(config.SCREENSHOTS_DIR);
  });

  it('PROJECT_DIR is an absolute path', () => {
    assert.ok(path.isAbsolute(config.PROJECT_DIR));
  });

  it('BROWSER_DATA_DIR is inside PROJECT_DIR', () => {
    assert.ok(config.BROWSER_DATA_DIR.startsWith(config.PROJECT_DIR));
    assert.equal(
      path.basename(config.BROWSER_DATA_DIR),
      'browser-data'
    );
  });

  it('LOGS_DIR is inside PROJECT_DIR', () => {
    assert.ok(config.LOGS_DIR.startsWith(config.PROJECT_DIR));
    assert.equal(path.basename(config.LOGS_DIR), 'logs');
  });

  it('SCREENSHOTS_DIR is inside LOGS_DIR', () => {
    assert.ok(config.SCREENSHOTS_DIR.startsWith(config.LOGS_DIR));
    assert.equal(path.basename(config.SCREENSHOTS_DIR), 'screenshots');
  });

  it('exports valid malt.de URLs', () => {
    assert.ok(config.MALT_DASHBOARD_URL.startsWith('https://www.malt.de/'));
    assert.ok(config.MALT_SIGNIN_URL.startsWith('https://www.malt.de/'));
    assert.ok(config.MALT_BASE_URL.startsWith('https://www.malt.de'));
  });

  it('timeout values are positive numbers', () => {
    assert.equal(typeof config.TIMEOUT_MS, 'number');
    assert.ok(config.TIMEOUT_MS > 0);
    assert.equal(typeof config.NAVIGATION_TIMEOUT_MS, 'number');
    assert.ok(config.NAVIGATION_TIMEOUT_MS > 0);
  });

  it('NAVIGATION_TIMEOUT_MS >= TIMEOUT_MS', () => {
    assert.ok(config.NAVIGATION_TIMEOUT_MS >= config.TIMEOUT_MS);
  });
});
