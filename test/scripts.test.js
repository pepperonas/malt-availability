const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const scriptsDir = path.join(__dirname, '..', 'scripts');

describe('scheduling scripts', () => {
  describe('macOS', () => {
    it('install-launchagent.sh exists', () => {
      assert.ok(fs.existsSync(path.join(scriptsDir, 'install-launchagent.sh')));
    });

    it('uninstall-launchagent.sh exists', () => {
      assert.ok(fs.existsSync(path.join(scriptsDir, 'uninstall-launchagent.sh')));
    });

    it('install script creates a valid plist', () => {
      const content = fs.readFileSync(
        path.join(scriptsDir, 'install-launchagent.sh'),
        'utf-8'
      );
      assert.ok(content.includes('com.celox.malt-availability'));
      assert.ok(content.includes('RunAtLoad'));
      assert.ok(content.includes('StartCalendarInterval'));
    });
  });

  describe('Linux', () => {
    it('install-linux.sh exists', () => {
      assert.ok(fs.existsSync(path.join(scriptsDir, 'install-linux.sh')));
    });

    it('uninstall-linux.sh exists', () => {
      assert.ok(fs.existsSync(path.join(scriptsDir, 'uninstall-linux.sh')));
    });

    it('install script creates systemd service and timer', () => {
      const content = fs.readFileSync(
        path.join(scriptsDir, 'install-linux.sh'),
        'utf-8'
      );
      assert.ok(content.includes('.service'));
      assert.ok(content.includes('.timer'));
      assert.ok(content.includes('OnCalendar'));
      assert.ok(content.includes('systemctl --user'));
    });
  });

  describe('Windows', () => {
    it('install-windows.ps1 exists', () => {
      assert.ok(fs.existsSync(path.join(scriptsDir, 'install-windows.ps1')));
    });

    it('uninstall-windows.ps1 exists', () => {
      assert.ok(fs.existsSync(path.join(scriptsDir, 'uninstall-windows.ps1')));
    });

    it('install script registers a scheduled task', () => {
      const content = fs.readFileSync(
        path.join(scriptsDir, 'install-windows.ps1'),
        'utf-8'
      );
      assert.ok(content.includes('Register-ScheduledTask'));
      assert.ok(content.includes('MaltAvailability'));
      assert.ok(content.includes('-Daily'));
      assert.ok(content.includes('-AtLogon'));
    });
  });

  describe('cross-platform dispatcher', () => {
    it('install-schedule.js exists and handles all platforms', () => {
      const content = fs.readFileSync(
        path.join(scriptsDir, 'install-schedule.js'),
        'utf-8'
      );
      assert.ok(content.includes("'darwin'"));
      assert.ok(content.includes("'linux'"));
      assert.ok(content.includes("'win32'"));
    });

    it('uninstall-schedule.js exists and handles all platforms', () => {
      const content = fs.readFileSync(
        path.join(scriptsDir, 'uninstall-schedule.js'),
        'utf-8'
      );
      assert.ok(content.includes("'darwin'"));
      assert.ok(content.includes("'linux'"));
      assert.ok(content.includes("'win32'"));
    });
  });
});
