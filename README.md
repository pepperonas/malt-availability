# malt-availability

Automated availability confirmation for [malt.de](https://www.malt.de) freelancer profiles.

Malt requires freelancers to confirm their availability every 7 days to maintain the "availability confirmed" badge on their profile. This tool automates that process on macOS using a headless browser.

## How it works

1. Uses [Playwright](https://playwright.dev/) with a **persistent browser context** to maintain login sessions
2. Navigates to the Malt freelancer dashboard
3. Finds and clicks the availability confirmation button
4. Sends macOS notifications on success/failure
5. Runs automatically via macOS LaunchAgent (daily at 10:00 AM)

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium only)
npx playwright install chromium

# Log in to Malt via Google SSO (opens a browser window)
npm run setup

# Verify it works
npm run confirm

# Install the daily scheduler
npm run install-schedule
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Opens browser for initial Google SSO login |
| `npm run confirm` | Run availability confirmation once |
| `npm run status` | Show current status (session, scheduler, last run) |
| `npm run install-schedule` | Install macOS LaunchAgent (daily at 10 AM) |
| `npm run uninstall-schedule` | Remove the LaunchAgent |

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
