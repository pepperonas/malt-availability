#!/usr/bin/env node
/**
 * Status check - Shows the current state of the automation.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const config = require('./config');

function checkLaunchAgent() {
  const plistPath = path.join(
    process.env.HOME,
    'Library/LaunchAgents/com.celox.malt-availability.plist'
  );
  if (!fs.existsSync(plistPath)) return 'not installed';

  try {
    const output = execFileSync('launchctl', ['list'], { encoding: 'utf-8' });
    if (output.includes('com.celox.malt-availability')) return 'active';
    return 'installed but not loaded';
  } catch {
    return 'installed (status unknown)';
  }
}

function getLastLog() {
  if (!fs.existsSync(config.LOGS_DIR)) return 'no logs yet';

  const logFiles = fs
    .readdirSync(config.LOGS_DIR)
    .filter((f) => f.endsWith('.log'))
    .sort()
    .reverse();

  if (logFiles.length === 0) return 'no logs yet';

  const lastFile = path.join(config.LOGS_DIR, logFiles[0]);
  const content = fs.readFileSync(lastFile, 'utf-8');
  const lines = content.trim().split('\n');

  // Find last SUCCESS or ERROR
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('[SUCCESS]') || lines[i].includes('[ERROR]')) {
      return lines[i];
    }
  }
  return lines[lines.length - 1];
}

function hasSession() {
  return fs.existsSync(path.join(config.BROWSER_DATA_DIR, 'Default'));
}

console.log('\n  Malt Availability - Status');
console.log('  -------------------------');
console.log(`  Session:    ${hasSession() ? 'saved' : 'not found (run: npm run setup)'}`);
console.log(`  Scheduler:  ${checkLaunchAgent()}`);
console.log(`  Last run:   ${getLastLog()}`);
console.log('');
