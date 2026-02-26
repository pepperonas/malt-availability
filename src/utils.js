const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Removes old screenshots, keeping only the most recent `keep` files.
 */
function cleanupScreenshots(screenshotsDir, keep = 20) {
  if (!fs.existsSync(screenshotsDir)) return;

  const files = fs
    .readdirSync(screenshotsDir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => ({
      name: f,
      path: path.join(screenshotsDir, f),
      mtime: fs.statSync(path.join(screenshotsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length <= keep) return;

  const toDelete = files.slice(keep);
  for (const file of toDelete) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // best-effort cleanup
    }
  }
}

module.exports = { ensureDir, cleanupScreenshots };
