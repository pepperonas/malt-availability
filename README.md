# ProfilePulse

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#lizenz--license)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.50+-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![macOS](https://img.shields.io/badge/macOS-supported-000000?logo=apple&logoColor=white)](https://www.apple.com/macos/)
[![Linux](https://img.shields.io/badge/Linux-supported-FCC624?logo=linux&logoColor=black)](https://www.linux.org/)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![Tests](https://img.shields.io/badge/Tests-29%20passed-brightgreen)](test/)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

**Keep your freelancer profile visible — automatically.**

ProfilePulse automates the recurring availability confirmation on [malt.de](https://www.malt.de), so you never lose your "availability confirmed" badge again.

> **[Deutsch](#deutsch)** | **[English](#english)**

---

<a id="deutsch"></a>

## :de: Deutsch

### Das Problem

Malt verlangt von Freelancern, ihre Verfuegbarkeit **alle 7 Tage** manuell zu bestaetigen. Vergisst man es, verschwindet das gruene Badge, die Sichtbarkeit in Suchergebnissen sinkt — und potenzielle Kunden finden dich nicht mehr.

### Die Loesung

ProfilePulse erledigt das automatisch. Einmal einrichten, nie wieder daran denken. Laeuft auf **macOS, Linux und Windows**.

### Preise

| Plan | Preis | Details |
|------|-------|---------|
| **Monats-Abo** | 5 EUR/Monat | Jederzeit kuendbar |
| **Lifetime** | 49 EUR einmalig | Einmal zahlen, fuer immer nutzen |

Lizenz kaufen: **[profilepulse-license.example.com](https://profilepulse-license.example.com)**

### So funktioniert's

1. Nutzt [Playwright](https://playwright.dev/) mit einem **persistenten Browser-Kontext** fuer dauerhafte Login-Sessions
2. Navigiert zum Freelancer-Dashboard
3. Oeffnet den Verfuegbarkeits-Dialog und klickt "Ja" + "Bestaetigen"
4. **Automatische Wiederholung** bei Fehlern (bis zu 3 Versuche mit steigenden Wartezeiten)
5. Sendet **Desktop-Benachrichtigungen** bei Erfolg oder Fehler
6. **Verfolgt den letzten Erfolg** und warnt bei >5 Tagen ohne Bestaetigung
7. Laeuft automatisch per Scheduler — taeglich um 10:00 Uhr + beim Login

### Schnellstart

```bash
# 1. Abhaengigkeiten installieren
npm install && npx playwright install chromium

# 2. Lizenz aktivieren (Format: PULSE-XXXX-XXXX-XXXX-XXXX)
npm run activate

# 3. Bei Malt anmelden (waehle eine Option)
npm run setup          # Google SSO (Browser-Fenster)
npm run setup:login    # E-Mail/Passwort (Terminal)

# 4. Testen & Scheduler installieren
npm run confirm
npm run install-schedule
```

### Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `npm run activate` | Lizenzschluessel eingeben und aktivieren |
| `npm run setup` | Google SSO Login (oeffnet Browser-Fenster) |
| `npm run setup:login` | E-Mail/Passwort Login (interaktiv im Terminal) |
| `npm run confirm` | Verfuegbarkeit einmalig bestaetigen |
| `npm run status` | Aktuellen Status anzeigen |
| `npm run install-schedule` | Taeglichen Scheduler installieren |
| `npm run uninstall-schedule` | Scheduler entfernen |
| `npm test` | Tests ausfuehren (29 Tests) |

### Scheduling

| Plattform | Mechanismus | Konfiguration |
|-----------|------------|---------------|
| **macOS** | LaunchAgent | `~/Library/LaunchAgents/com.celox.profile-pulse.plist` |
| **Linux** | systemd User Timer | `~/.config/systemd/user/profile-pulse.timer` |
| **Windows** | Task Scheduler | Task `ProfilePulse` |

Auf allen Plattformen: Start beim Login + taeglich 10:00 Uhr. Ueberlebt Neustarts. Der Browser laeuft off-screen und stoert nicht bei der Arbeit.

### Zuverlaessigkeit

- **Automatische Wiederholung** — bis zu 3 Versuche (0s, 15s, 45s Delay)
- **Erfolgs-Tracking** — warnt per Benachrichtigung wenn >5 Tage seit letzter Bestaetigung
- **Offline-Toleranz** — Lizenz bleibt 7 Tage gueltig ohne Serververbindung
- **Screenshot-Rotation** — automatische Bereinigung (max. 20 Dateien)

### Session & Logs

- Browser-Session in `browser-data/` (gitignored). Bei Ablauf erscheint eine Benachrichtigung.
- Logs in `logs/` (taegliche Rotation). Screenshots in `logs/screenshots/` zur Fehleranalyse.

### Voraussetzungen

- **macOS**, **Linux** oder **Windows**
- Node.js >= 18
- Ein Malt.de Freelancer-Konto
- Eine gueltige ProfilePulse-Lizenz
- Linux: `notify-send` (optional, fuer Desktop-Benachrichtigungen)

---

<a id="english"></a>

## :gb: English

### The problem

Malt requires freelancers to manually confirm their availability **every 7 days**. Miss it, and your green badge disappears, search visibility drops — and potential clients can't find you.

### The solution

ProfilePulse handles it automatically. Set up once, never think about it again. Runs on **macOS, Linux, and Windows**.

### Pricing

| Plan | Price | Details |
|------|-------|---------|
| **Monthly** | 5 EUR/month | Cancel anytime |
| **Lifetime** | 49 EUR one-time | Pay once, use forever |

Purchase a license: **[profilepulse-license.example.com](https://profilepulse-license.example.com)**

### How it works

1. Uses [Playwright](https://playwright.dev/) with a **persistent browser context** for permanent login sessions
2. Navigates to the freelancer dashboard
3. Opens the availability dialog and clicks "Ja" + "Bestaetigen"
4. **Automatic retry** on failure (up to 3 attempts with increasing delays)
5. Sends **desktop notifications** on success or failure
6. **Tracks last success** and warns if >5 days since last confirmation
7. Runs automatically via scheduler — daily at 10:00 AM + at login

### Quick start

```bash
# 1. Install dependencies
npm install && npx playwright install chromium

# 2. Activate license (format: PULSE-XXXX-XXXX-XXXX-XXXX)
npm run activate

# 3. Log in to Malt (choose one)
npm run setup          # Google SSO (browser window)
npm run setup:login    # Email/password (terminal)

# 4. Test & install scheduler
npm run confirm
npm run install-schedule
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run activate` | Enter and activate a license key |
| `npm run setup` | Google SSO login (opens browser window) |
| `npm run setup:login` | Email/password login (interactive terminal) |
| `npm run confirm` | Confirm availability once |
| `npm run status` | Show current status |
| `npm run install-schedule` | Install daily scheduler |
| `npm run uninstall-schedule` | Remove the scheduler |
| `npm test` | Run tests (29 tests) |

### Scheduling

| Platform | Mechanism | Configuration |
|----------|-----------|---------------|
| **macOS** | LaunchAgent | `~/Library/LaunchAgents/com.celox.profile-pulse.plist` |
| **Linux** | systemd user timer | `~/.config/systemd/user/profile-pulse.timer` |
| **Windows** | Task Scheduler | Task `ProfilePulse` |

On all platforms: starts at login + daily at 10:00 AM. Survives reboots. The browser runs off-screen and won't interfere with your work.

### Reliability

- **Automatic retry** — up to 3 attempts (0s, 15s, 45s delay)
- **Success tracking** — warns via notification if >5 days since last confirmation
- **Offline tolerance** — license stays valid for 7 days without server connection
- **Screenshot rotation** — automatic cleanup (max 20 files)

### Session & logs

- Browser session stored in `browser-data/` (gitignored). A notification appears when it expires.
- Logs written to `logs/` (daily rotation). Screenshots in `logs/screenshots/` for debugging.

### Requirements

- **macOS**, **Linux**, or **Windows**
- Node.js >= 18
- A Malt.de freelancer account
- A valid ProfilePulse license
- Linux: `notify-send` (optional, for desktop notifications)

---

## Author

Martin Pfeffer - [celox.io](https://celox.io)

## Lizenz / License

Proprietary software. See [LICENSE](LICENSE) for details.

Purchase at [profilepulse-license.example.com](https://profilepulse-license.example.com):
- **5 EUR/Monat** (monthly subscription)
- **49 EUR** (lifetime, one-time payment)
