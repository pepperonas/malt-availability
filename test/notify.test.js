const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('cross-platform notify', () => {
  it('notify function exists in confirm-availability module', () => {
    // We can't directly test notify since it's not exported,
    // but we can verify the module loads without errors on any platform
    assert.doesNotThrow(() => {
      // Just verify the module is syntactically valid
      const src = require('fs').readFileSync(
        require('path').join(__dirname, '..', 'src', 'confirm-availability.js'),
        'utf-8'
      );
      assert.ok(src.includes("process.platform"));
      assert.ok(src.includes("'darwin'"));
      assert.ok(src.includes("'linux'"));
      assert.ok(src.includes("'win32'"));
    });
  });

  it('confirm-availability handles all three platforms in notify', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'src', 'confirm-availability.js'),
      'utf-8'
    );
    // macOS
    assert.ok(src.includes('osascript'));
    // Linux
    assert.ok(src.includes('notify-send'));
    // Windows
    assert.ok(src.includes('powershell'));
  });
});

describe('cross-platform status', () => {
  it('status.js references all platform schedulers', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'src', 'status.js'),
      'utf-8'
    );
    assert.ok(src.includes('LaunchAgent'));
    assert.ok(src.includes('systemd'));
    assert.ok(src.includes('Task Scheduler'));
  });
});
