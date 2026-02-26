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

Malt verlangt von Freelancern, ihre Verfügbarkeit **alle 7 Tage** manuell zu bestätigen. Vergisst man es, verschwindet das grüne Badge, die Sichtbarkeit in Suchergebnissen sinkt — und potenzielle Kunden finden dich nicht mehr.

### Die Lösung

ProfilePulse erledigt das automatisch. Einmal einrichten, nie wieder daran denken. Läuft auf **macOS, Linux und Windows**.

### Kostenlos testen

ProfilePulse bietet **2 kostenlose Bestätigungen** ohne Lizenzschlüssel. Einfach installieren, einloggen und `npm run confirm` ausführen — keine Kreditkarte nötig.

### Preise

| Plan | Preis | Details |
|------|-------|---------|
| **Kostenlose Testphase** | 0 EUR | 2 Bestätigungen zum Ausprobieren |
| **Monats-Abo** | 5 EUR/Monat | Jederzeit kündbar |
| **Lifetime** | 49 EUR einmalig | Einmal zahlen, für immer nutzen |

Lizenz kaufen: **[profilepulse.celox.io](https://profilepulse.celox.io)**

### So funktioniert's

1. Nutzt [Playwright](https://playwright.dev/) mit einem **persistenten Browser-Kontext** für dauerhafte Login-Sessions
2. Navigiert zum Freelancer-Dashboard
3. Öffnet den Verfügbarkeits-Dialog und klickt "Ja" + "Bestätigen"
4. **Automatische Wiederholung** bei Fehlern (bis zu 3 Versuche mit steigenden Wartezeiten)
5. Sendet **Desktop-Benachrichtigungen** bei Erfolg oder Fehler
6. **Verfolgt den letzten Erfolg** und warnt bei >5 Tagen ohne Bestätigung
7. Läuft automatisch per Scheduler — täglich um 10:00 Uhr + beim Login

### Schnellstart

```bash
# 1. Abhängigkeiten installieren
npm install && npx playwright install chromium

# 2. Bei Malt anmelden (wähle eine Option)
npm run setup          # Google SSO (öffnet Browser-Fenster)
npm run setup:login    # E-Mail/Passwort (interaktiv im Terminal)

# 3. Kostenlos testen (2x ohne Lizenz)
npm run confirm

# 4. Lizenz aktivieren (Format: PULSE-XXXX-XXXX-XXXX-XXXX)
npm run activate

# 5. Scheduler installieren
npm run install-schedule
```

### Login-Methoden

| Methode | Befehl | Beschreibung |
|---------|--------|-------------|
| **Google SSO** | `npm run setup` | Öffnet ein Browser-Fenster für Google-Login bei Malt |
| **E-Mail/Passwort** | `npm run setup:login` | Login direkt im Terminal, ideal für Server/Headless |

Beide Methoden speichern die Session dauerhaft — du musst dich nur einmal anmelden.

### Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `npm run setup` | Google SSO Login (öffnet Browser-Fenster) |
| `npm run setup:login` | E-Mail/Passwort Login (interaktiv im Terminal) |
| `npm run confirm` | Verfügbarkeit einmalig bestätigen |
| `npm run activate` | Lizenzschlüssel eingeben und aktivieren |
| `npm run status` | Aktuellen Status anzeigen |
| `npm run install-schedule` | Täglichen Scheduler installieren |
| `npm run uninstall-schedule` | Scheduler entfernen |
| `npm test` | Tests ausführen (29 Tests) |

### Scheduling

| Plattform | Mechanismus | Konfiguration |
|-----------|------------|---------------|
| **macOS** | LaunchAgent | `~/Library/LaunchAgents/com.celox.profile-pulse.plist` |
| **Linux** | systemd User Timer | `~/.config/systemd/user/profile-pulse.timer` |
| **Windows** | Task Scheduler | Task `ProfilePulse` |

Auf allen Plattformen: Start beim Login + täglich 10:00 Uhr. Überlebt Neustarts. Der Browser läuft off-screen und stört nicht bei der Arbeit.

### Zuverlässigkeit

- **Automatische Wiederholung** — bis zu 3 Versuche (0s, 15s, 45s Delay)
- **Erfolgs-Tracking** — warnt per Benachrichtigung wenn >5 Tage seit letzter Bestätigung
- **Offline-Toleranz** — Lizenz bleibt 7 Tage gültig ohne Serververbindung
- **Screenshot-Rotation** — automatische Bereinigung (max. 20 Dateien)

### Session & Logs

- Browser-Session in `browser-data/` (gitignored). Bei Ablauf erscheint eine Benachrichtigung.
- Logs in `logs/` (tägliche Rotation). Screenshots in `logs/screenshots/` zur Fehleranalyse.

### Voraussetzungen

- **macOS**, **Linux** oder **Windows**
- Node.js >= 18
- Ein Malt.de Freelancer-Konto
- Linux: `notify-send` (optional, für Desktop-Benachrichtigungen)

---

<a id="english"></a>

## :gb: English

### The problem

Malt requires freelancers to manually confirm their availability **every 7 days**. Miss it, and your green badge disappears, search visibility drops — and potential clients can't find you.

### The solution

ProfilePulse handles it automatically. Set up once, never think about it again. Runs on **macOS, Linux, and Windows**.

### Free trial

ProfilePulse includes **2 free confirmations** without a license key. Just install, log in, and run `npm run confirm` — no credit card required.

### Pricing

| Plan | Price | Details |
|------|-------|---------|
| **Free trial** | 0 EUR | 2 confirmations to try it out |
| **Monthly** | 5 EUR/month | Cancel anytime |
| **Lifetime** | 49 EUR one-time | Pay once, use forever |

Purchase a license: **[profilepulse.celox.io](https://profilepulse.celox.io)**

### How it works

1. Uses [Playwright](https://playwright.dev/) with a **persistent browser context** for permanent login sessions
2. Navigates to the freelancer dashboard
3. Opens the availability dialog and clicks "Ja" + "Bestätigen"
4. **Automatic retry** on failure (up to 3 attempts with increasing delays)
5. Sends **desktop notifications** on success or failure
6. **Tracks last success** and warns if >5 days since last confirmation
7. Runs automatically via scheduler — daily at 10:00 AM + at login

### Quick start

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

### Login methods

| Method | Command | Description |
|--------|---------|-------------|
| **Google SSO** | `npm run setup` | Opens a browser window for Google login at Malt |
| **Email/Password** | `npm run setup:login` | Login directly in the terminal, ideal for servers/headless |

Both methods persist the session permanently — you only need to log in once.

### Commands

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
- Linux: `notify-send` (optional, for desktop notifications)

---

## Author

Martin Pfeffer - [celox.io](https://celox.io)

## Lizenz / License

Proprietary software. See [LICENSE](LICENSE) for details.

Purchase at [profilepulse.celox.io](https://profilepulse.celox.io):
- **Kostenlose Testphase** (2 Bestätigungen gratis)
- **5 EUR/Monat** (monthly subscription)
- **49 EUR** (lifetime, one-time payment)
