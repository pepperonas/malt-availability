const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('logger', () => {
  let tmpDir;
  let origLogsDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'malt-test-'));
    // Patch config.LOGS_DIR before requiring logger
    const config = require('../src/config');
    origLogsDir = config.LOGS_DIR;
    config.LOGS_DIR = tmpDir;
    // Clear require cache so logger picks up new config
    delete require.cache[require.resolve('../src/logger')];
  });

  afterEach(() => {
    const config = require('../src/config');
    config.LOGS_DIR = origLogsDir;
    delete require.cache[require.resolve('../src/logger')];
    // Clean up tmp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('info() writes to log file', () => {
    const logger = require('../src/logger');
    logger.info('test info message');

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.log'));
    assert.equal(files.length, 1);

    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8');
    assert.ok(content.includes('[INFO]'));
    assert.ok(content.includes('test info message'));
  });

  it('error() writes ERROR level', () => {
    const logger = require('../src/logger');
    logger.error('test error');

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.log'));
    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8');
    assert.ok(content.includes('[ERROR]'));
    assert.ok(content.includes('test error'));
  });

  it('warn() writes WARN level', () => {
    const logger = require('../src/logger');
    logger.warn('test warning');

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.log'));
    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8');
    assert.ok(content.includes('[WARN]'));
    assert.ok(content.includes('test warning'));
  });

  it('success() writes SUCCESS level', () => {
    const logger = require('../src/logger');
    logger.success('it worked');

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.log'));
    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8');
    assert.ok(content.includes('[SUCCESS]'));
    assert.ok(content.includes('it worked'));
  });

  it('log file name contains current date', () => {
    const logger = require('../src/logger');
    logger.info('date check');

    const today = new Date().toISOString().split('T')[0];
    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.log'));
    assert.ok(files[0].includes(today));
  });

  it('log entries include ISO timestamp', () => {
    const logger = require('../src/logger');
    logger.info('timestamp test');

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.log'));
    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8');
    // ISO timestamp pattern: 2024-01-15T10:30:00.000Z
    assert.ok(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(content));
  });

  it('multiple log calls append to same file', () => {
    const logger = require('../src/logger');
    logger.info('line 1');
    logger.warn('line 2');
    logger.error('line 3');

    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.log'));
    assert.equal(files.length, 1);

    const content = fs.readFileSync(path.join(tmpDir, files[0]), 'utf-8');
    const lines = content.trim().split('\n');
    assert.equal(lines.length, 3);
  });
});
