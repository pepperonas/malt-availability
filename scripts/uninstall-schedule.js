#!/usr/bin/env node
/**
 * Cross-platform scheduler uninstaller.
 * Detects the OS and runs the appropriate uninstall script.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const scriptsDir = __dirname;
const platform = process.platform;

try {
  if (platform === 'darwin') {
    execFileSync('bash', [path.join(scriptsDir, 'uninstall-launchagent.sh')], {
      stdio: 'inherit',
    });
  } else if (platform === 'linux') {
    execFileSync('bash', [path.join(scriptsDir, 'uninstall-linux.sh')], {
      stdio: 'inherit',
    });
  } else if (platform === 'win32') {
    execFileSync(
      'powershell',
      ['-ExecutionPolicy', 'Bypass', '-File', path.join(scriptsDir, 'uninstall-windows.ps1')],
      { stdio: 'inherit' }
    );
  } else {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Failed to uninstall scheduler: ${err.message}`);
  process.exit(1);
}
