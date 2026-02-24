const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('./config');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function timestamp() {
  return new Date().toISOString();
}

function logFile() {
  ensureDir(LOGS_DIR);
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOGS_DIR, `malt-${date}.log`);
}

function log(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(logFile(), line + '\n');
}

module.exports = {
  info: (msg) => log('INFO', msg),
  warn: (msg) => log('WARN', msg),
  error: (msg) => log('ERROR', msg),
  success: (msg) => log('SUCCESS', msg),
};
