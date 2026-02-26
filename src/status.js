#!/usr/bin/env node
/**
 * Status check - Shows the current state of the automation.
 * Cross-platform: macOS (LaunchAgent), Linux (systemd), Windows (Task Scheduler).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const config = require('./config');

function checkScheduler() {
  const platform = process.platform;

  if (platform === 'darwin') {
    const plistPath = path.join(
      process.env.HOME,
      'Library/LaunchAgents/com.celox.profile-pulse.plist'
    );
    if (!fs.existsSync(plistPath)) return 'not installed (macOS LaunchAgent)';
    try {
      const output = execFileSync('launchctl', ['list'], { encoding: 'utf-8' });
      if (output.includes('com.celox.profile-pulse')) return 'active (macOS LaunchAgent)';
      return 'installed but not loaded (macOS LaunchAgent)';
    } catch {
      return 'installed (status unknown)';
    }
  }

  if (platform === 'linux') {
    const timerPath = path.join(
      process.env.HOME,
      '.config/systemd/user/profile-pulse.timer'
    );
    if (!fs.existsSync(timerPath)) return 'not installed (systemd timer)';
    try {
      const output = execFileSync(
        'systemctl',
        ['--user', 'is-active', 'profile-pulse.timer'],
        { encoding: 'utf-8' }
      ).trim();
      return output === 'active'
        ? 'active (systemd timer)'
        : `${output} (systemd timer)`;
    } catch {
      return 'installed but inactive (systemd timer)';
    }
  }

  if (platform === 'win32') {
    try {
      const output = execFileSync(
        'schtasks',
        ['/Query', '/TN', 'ProfilePulse', '/FO', 'LIST'],
        { encoding: 'utf-8' }
      );
      if (output.includes('Ready') || output.includes('Running')) return 'active (Task Scheduler)';
      return 'installed (Task Scheduler)';
    } catch {
      return 'not installed (Task Scheduler)';
    }
  }

  return 'unsupported platform';
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

function getLastSuccess() {
  if (!fs.existsSync(config.SUCCESS_FILE_PATH)) return 'never';
  try {
    const data = JSON.parse(fs.readFileSync(config.SUCCESS_FILE_PATH, 'utf8'));
    const date = new Date(data.lastSuccess);
    const daysSince = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
    const warning = daysSince >= config.STALENESS_WARNING_DAYS ? ' (!)' : '';
    return `${date.toLocaleString()} (${daysSince}d ago)${warning}`;
  } catch {
    return 'unknown';
  }
}

console.log('\n  ProfilePulse - Status');
console.log('  -------------------------');
console.log(`  Platform:      ${process.platform}`);
console.log(`  Session:       ${hasSession() ? 'saved' : 'not found (run: npm run setup)'}`);
console.log(`  Scheduler:     ${checkScheduler()}`);
console.log(`  Last success:  ${getLastSuccess()}`);
console.log(`  Last log:      ${getLastLog()}`);
console.log('');
