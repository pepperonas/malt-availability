# malt-availability

Automated availability confirmation for [malt.de](https://www.malt.de) freelancer profiles.

Malt requires freelancers to confirm their availability every 7 days to maintain the "availability confirmed" badge on their profile. This tool automates that process on macOS.

## How it works

1. Uses [Playwright](https://playwright.dev/) with a **persistent browser context** to maintain Google SSO login sessions
2. Navigates to the Malt freelancer dashboard
3. Opens the availability dialog and clicks "Ja" + "Bestätigen"
4. Sends macOS notifications on success/failure
5. Runs automatically via macOS LaunchAgent — starts at login and repeats daily at 10:00 AM

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium only)
npx playwright install chromium

# Log in — choose one:
npm run setup          # Google SSO (opens browser window)
npm run setup:login    # Email + password (interactive terminal prompt)

# Verify it works
npm run confirm

# Install the scheduler (starts at boot + daily at 10 AM)
npm run install-schedule
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Opens browser for Google SSO login |
| `npm run setup:login` | Interactive email/password login via terminal |
| `npm run confirm` | Run availability confirmation once |
| `npm run status` | Show current status (session, scheduler, last run) |
| `npm run install-schedule` | Install macOS LaunchAgent |
| `npm run uninstall-schedule` | Remove the LaunchAgent |

## Scheduling

The macOS LaunchAgent (`com.celox.malt-availability`) provides:

- **Start at login** — runs immediately when you log into your Mac
- **Daily at 10:00 AM** — repeats every day to keep the 7-day window covered
- **Survives reboots** — launchd manages the lifecycle automatically

The browser window runs off-screen (non-headless to bypass Cloudflare) so it won't interfere with your work.

## Session Management

The browser session is stored in `browser-data/` (gitignored). If the session expires (Google SSO sessions typically last weeks to months), you'll receive a macOS notification prompting you to run `npm run setup` again.

## Logs

Logs are written to `logs/` with daily rotation. Screenshots are saved to `logs/screenshots/` for debugging.

## Requirements

- macOS
- Node.js >= 18
- A Malt.de freelancer account

## Author

Martin Pfeffer - [celox.io](https://celox.io)

## License

MIT
