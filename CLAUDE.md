# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ProfilePulse automates the 7-day availability confirmation on malt.de using Playwright browser automation. Monetized via Stripe (trial → monthly/lifetime). Runs on macOS, Linux, Windows.

## Commands

```bash
npm install && npx playwright install chromium   # Install dependencies
npm test                                          # Run 29 unit tests (Node.js built-in test runner)
npm run confirm                                   # Run availability confirmation once
npm run setup                                     # Google SSO login (opens browser)
npm run setup:login                               # Email/password login (terminal)
npm run activate                                  # Enter license key
npm run status                                    # Show scheduler + session status
npm run install-schedule                          # Install daily scheduler (platform-native)
npm run uninstall-schedule                        # Remove scheduler
```

No build step. No linter configured. Tests use `node --test test/*.test.js`.

## Architecture

```
src/confirm-availability.js   Core: Playwright automation, retry logic (3 attempts: 0s/15s/45s),
                              desktop notifications (osascript/notify-send/PowerShell),
                              screenshot capture, staleness warnings
src/license.js                Client-side license: trial (2 free uses via trial.json),
                              server validation (POST /api/validate-license),
                              7-day offline grace period, 24h revalidation cycle
src/config.js                 All paths, URLs, timeouts. Loads .env from project root
src/setup.js                  Google SSO login — visible browser, user completes auth manually
src/setup-login.js            Email/password login — terminal prompts, hidden password input
src/status.js                 Checks scheduler status per platform, session, last success
src/logger.js                 Daily rotating logs (pulse-YYYY-MM-DD.log), 4 levels
src/utils.js                  ensureDir, cleanupScreenshots (max 20 files)

server/index.js               License server (Express): Stripe webhooks generate PULSE-XXXX keys,
                              /api/validate-license with rate limiting (10/min/IP),
                              landing page with Impressum/Datenschutz/AGB,
                              master key via MASTER_KEY env var (not in source)

scripts/install-schedule.js   Dispatcher: detects OS, calls platform-specific script
scripts/*-launchagent.sh      macOS: ~/Library/LaunchAgents/com.celox.profile-pulse.plist
scripts/*-linux.sh            Linux: ~/.config/systemd/user/profile-pulse.{service,timer}
scripts/*-windows.ps1         Windows: Task Scheduler task "ProfilePulse"
```

## Key Patterns

- **Persistent browser context**: `chromium.launchPersistentContext()` stores session in `browser-data/`. User logs in once; all subsequent runs reuse the session.
- **Off-screen browser**: `--window-position=-2400,-2400` keeps the browser invisible during automation.
- **Cross-platform dispatcher**: `scripts/install-schedule.js` checks `process.platform` and delegates to platform-native scripts (LaunchAgent/systemd/Task Scheduler). Same pattern for notifications in `confirm-availability.js`.
- **License flow**: No license → trial (2 uses from `trial.json`) → expired → requires `npm run activate`. With license → daily server revalidation → 7-day grace if server unreachable.
- **Cloudflare handling**: `waitForCloudflare()` detects challenge pages and waits up to 15s for resolution.

## Deployment

The license server (`server/`) is deployed independently on VPS at `profilepulse.celox.io:3008` behind Nginx with Let's Encrypt SSL. PM2 process name: `profilepulse-license`. Deploy via:

```bash
scp server/index.js celox:/var/www/profilepulse-license/
ssh celox 'pm2 restart profilepulse-license'
```

Static assets (favicon.svg, profilepulse.png) must also be copied to the VPS server directory. The server looks for them in both `__dirname` (VPS) and `__dirname/..` (local dev).

## Gitignored State Files

- `browser-data/` — Playwright persistent context (cookies, storage)
- `license.json` — User's active license key and validation timestamp
- `trial.json` — Trial usage counter (`{uses: N, startedAt: ...}`)
- `last-success.json` — Last successful confirmation timestamp
- `server/licenses.json` — All issued license keys (server-side)
- `.env` — Local environment overrides

## Server Environment Variables (VPS only)

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_LIFETIME`, `PORT`, `SERVER_URL`, `MASTER_KEY`
