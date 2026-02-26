# ProfilePulse

<p align="center">
  <img src="profilepulse.png" alt="ProfilePulse" width="600">
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/lang-Deutsch-grey?style=for-the-badge" alt="Deutsch"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/lang-English-blue?style=for-the-badge" alt="English"></a>
</p>

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.50+-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![macOS](https://img.shields.io/badge/macOS-supported-000000?logo=apple&logoColor=white)](https://www.apple.com/macos/)
[![Linux](https://img.shields.io/badge/Linux-supported-FCC624?logo=linux&logoColor=black)](https://www.linux.org/)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![Tests](https://img.shields.io/badge/Tests-29%20passed-brightgreen)](test/)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

**Keep your freelancer profile visible — automatically.**

ProfilePulse automates the recurring availability confirmation on [malt.de](https://www.malt.de), so you never lose your "availability confirmed" badge again.

---

## The problem

Malt requires freelancers to manually confirm their availability **every 7 days**. Miss it, and your green badge disappears, search visibility drops — and potential clients can't find you.

## The solution

ProfilePulse handles it automatically. Set up once, never think about it again. Runs on **macOS, Linux, and Windows**.

## Free trial

ProfilePulse includes **2 free confirmations** without a license key. Just install, log in, and run `npm run confirm` — no credit card required.

## Pricing

| Plan | Price | Details |
|------|-------|---------|
| **Free trial** | 0 EUR | 2 confirmations to try it out |
| **Monthly** | 5 EUR/month | Cancel anytime |
| **Lifetime** | 49 EUR one-time | Pay once, use forever |

Purchase a license: **[profilepulse.celox.io](https://profilepulse.celox.io)**

## How it works

1. Uses [Playwright](https://playwright.dev/) with a **persistent browser context** for permanent login sessions
2. Navigates to the freelancer dashboard
3. Opens the availability dialog and clicks "Ja" + "Bestätigen"
4. **Automatic retry** on failure (up to 3 attempts with increasing delays)
5. Sends **desktop notifications** on success or failure
6. **Tracks last success** and warns if >5 days since last confirmation
7. Runs automatically via scheduler — daily at 10:00 AM + at login

## Quick start

```bash
# 1. Install dependencies
npm install && npx playwright install chromium

# 2. Log in to Malt (choose one)
npm run setup          # Google SSO (opens browser window)
npm run setup:login    # Email/password (interactive terminal)

# 3. Try for free (2x without license)
npm run confirm

# 4. Activate license (format: PULSE-XXXX-XXXX-XXXX-XXXX)
npm run activate

# 5. Install scheduler
npm run install-schedule
```

## Login methods

| Method | Command | Description |
|--------|---------|-------------|
| **Google SSO** | `npm run setup` | Opens a browser window for Google login at Malt |
| **Email/Password** | `npm run setup:login` | Login directly in the terminal, ideal for servers/headless |

Both methods persist the session permanently — you only need to log in once.

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Google SSO login (opens browser window) |
| `npm run setup:login` | Email/password login (interactive terminal) |
| `npm run confirm` | Confirm availability once |
| `npm run activate` | Enter and activate a license key |
| `npm run status` | Show current status |
| `npm run install-schedule` | Install daily scheduler |
| `npm run uninstall-schedule` | Remove the scheduler |
| `npm test` | Run tests (29 tests) |

## Scheduling

| Platform | Mechanism | Configuration |
|----------|-----------|---------------|
| **macOS** | LaunchAgent | `~/Library/LaunchAgents/com.celox.profile-pulse.plist` |
| **Linux** | systemd user timer | `~/.config/systemd/user/profile-pulse.timer` |
| **Windows** | Task Scheduler | Task `ProfilePulse` |

On all platforms: starts at login + daily at 10:00 AM. Survives reboots. The browser runs off-screen and won't interfere with your work.

## Reliability

- **Automatic retry** — up to 3 attempts (0s, 15s, 45s delay)
- **Success tracking** — warns via notification if >5 days since last confirmation
- **Offline tolerance** — license stays valid for 7 days without server connection
- **Screenshot rotation** — automatic cleanup (max 20 files)

## Session & logs

- Browser session stored in `browser-data/` (gitignored). A notification appears when it expires.
- Logs written to `logs/` (daily rotation). Screenshots in `logs/screenshots/` for debugging.

## Requirements

- **macOS**, **Linux**, or **Windows**
- Node.js >= 18
- A Malt.de freelancer account
- Linux: `notify-send` (optional, for desktop notifications)

---

## Author

Martin Pfeffer - [celox.io](https://celox.io)

## License

Proprietary software. See [LICENSE](LICENSE) for details.

Purchase at [profilepulse.celox.io](https://profilepulse.celox.io):
- **Free trial** (2 confirmations free)
- **5 EUR/month** (monthly subscription)
- **49 EUR** (lifetime, one-time payment)
