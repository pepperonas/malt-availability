# malt-availability

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.50+-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Platform](https://img.shields.io/badge/Platform-macOS-000000?logo=apple&logoColor=white)](https://www.apple.com/macos/)
[![Malt](https://img.shields.io/badge/Malt.de-Freelancer-FC5757)](https://www.malt.de/)

> **[Deutsch](#deutsch)** | **[English](#english)**

---

<a id="deutsch"></a>

## :de: Deutsch

Automatische Verfügbarkeitsbestätigung für [malt.de](https://www.malt.de) Freelancer-Profile.

Malt verlangt von Freelancern, ihre Verfügbarkeit alle 7 Tage zu bestätigen, um das Badge "Verfügbarkeit bestätigt" auf dem Profil zu behalten. Ohne Bestätigung sinkt die Sichtbarkeit in den Suchergebnissen. Dieses Tool automatisiert den gesamten Vorgang auf macOS.

### So funktioniert's

1. Nutzt [Playwright](https://playwright.dev/) mit einem **persistenten Browser-Kontext**, um die Login-Session dauerhaft zu speichern
2. Navigiert zum Malt Freelancer-Dashboard
3. Öffnet den Verfügbarkeits-Dialog und klickt "Ja" + "Bestätigen"
4. Sendet macOS-Benachrichtigungen bei Erfolg oder Fehler
5. Läuft automatisch per macOS LaunchAgent — startet beim Login und wiederholt sich täglich um 10:00 Uhr

### Installation

```bash
# Abhängigkeiten installieren
npm install

# Playwright-Browser installieren (nur Chromium)
npx playwright install chromium
```

### Anmeldung

Es gibt zwei Wege, sich bei Malt anzumelden. Die Session wird nach dem Login lokal gespeichert und für alle weiteren automatischen Läufe wiederverwendet.

#### Option A: Google SSO (Browser-Fenster)

```bash
npm run setup
```

Öffnet ein Chromium-Fenster mit der Malt-Anmeldeseite. Du klickst auf "Mit Google anmelden" und durchläufst den Google-Login. Sobald das Dashboard geladen ist, wird die Session gespeichert und das Fenster schließt sich automatisch.

#### Option B: E-Mail und Passwort (Terminal)

```bash
npm run setup:login
```

Fragt E-Mail und Passwort direkt im Terminal ab. Das Passwort wird bei der Eingabe mit `*` maskiert. Die Anmeldedaten werden **nicht** gespeichert — nur die Browser-Session wird lokal abgelegt.

### Automatisierung starten

```bash
# Einmalig testen, ob die Bestätigung funktioniert
npm run confirm

# Täglichen Scheduler installieren (startet beim Login + täglich 10:00 Uhr)
npm run install-schedule
```

### Befehle

| Befehl | Beschreibung |
|--------|-------------|
| `npm run setup` | Google SSO Login (öffnet Browser-Fenster) |
| `npm run setup:login` | E-Mail/Passwort Login (interaktiv im Terminal) |
| `npm run confirm` | Verfügbarkeit einmalig bestätigen |
| `npm run status` | Aktuellen Status anzeigen (Session, Scheduler, letzter Lauf) |
| `npm run install-schedule` | macOS LaunchAgent installieren |
| `npm run uninstall-schedule` | LaunchAgent entfernen |

### Scheduling

Der macOS LaunchAgent (`com.celox.malt-availability`):

- **Start beim Login** — läuft sofort nach der Anmeldung am Mac
- **Täglich um 10:00 Uhr** — wiederholt sich jeden Tag, um das 7-Tage-Fenster zuverlässig abzudecken
- **Überlebt Neustarts** — launchd verwaltet den Lebenszyklus automatisch

Der Browser läuft off-screen (nicht-headless, um Cloudflare zu umgehen) und stört nicht bei der Arbeit.

### Session-Verwaltung

Die Browser-Session wird in `browser-data/` gespeichert (gitignored). Wenn die Session abläuft (Google-Sessions halten typischerweise Wochen bis Monate), erscheint eine macOS-Benachrichtigung mit der Aufforderung, `npm run setup` oder `npm run setup:login` erneut auszuführen.

### Logs

Logs werden in `logs/` geschrieben (tägliche Rotation). Screenshots landen in `logs/screenshots/` zur Fehleranalyse.

### Voraussetzungen

- macOS
- Node.js >= 18
- Ein Malt.de Freelancer-Konto

---

<a id="english"></a>

## :gb: English

Automated availability confirmation for [malt.de](https://www.malt.de) freelancer profiles.

Malt requires freelancers to confirm their availability every 7 days to maintain the "availability confirmed" badge on their profile. Without confirmation, visibility in search results decreases. This tool automates the entire process on macOS.

### How it works

1. Uses [Playwright](https://playwright.dev/) with a **persistent browser context** to maintain the login session permanently
2. Navigates to the Malt freelancer dashboard
3. Opens the availability dialog and clicks "Ja" + "Bestätigen"
4. Sends macOS notifications on success or failure
5. Runs automatically via macOS LaunchAgent — starts at login and repeats daily at 10:00 AM

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium only)
npx playwright install chromium
```

### Login

There are two ways to log in to Malt. The session is saved locally after login and reused for all subsequent automated runs.

#### Option A: Google SSO (browser window)

```bash
npm run setup
```

Opens a Chromium window with the Malt sign-in page. Click "Sign in with Google" and complete the Google login. Once the dashboard loads, the session is saved and the window closes automatically.

#### Option B: Email and password (terminal)

```bash
npm run setup:login
```

Prompts for email and password directly in the terminal. The password is masked with `*` during input. Credentials are **not** stored — only the browser session is saved locally.

### Start automation

```bash
# Test that confirmation works
npm run confirm

# Install daily scheduler (starts at login + daily at 10:00 AM)
npm run install-schedule
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Google SSO login (opens browser window) |
| `npm run setup:login` | Email/password login (interactive terminal) |
| `npm run confirm` | Confirm availability once |
| `npm run status` | Show current status (session, scheduler, last run) |
| `npm run install-schedule` | Install macOS LaunchAgent |
| `npm run uninstall-schedule` | Remove the LaunchAgent |

### Scheduling

The macOS LaunchAgent (`com.celox.malt-availability`):

- **Start at login** — runs immediately when you log into your Mac
- **Daily at 10:00 AM** — repeats every day to keep the 7-day window covered
- **Survives reboots** — launchd manages the lifecycle automatically

The browser window runs off-screen (non-headless to bypass Cloudflare) so it won't interfere with your work.

### Session management

The browser session is stored in `browser-data/` (gitignored). If the session expires (Google SSO sessions typically last weeks to months), you'll receive a macOS notification prompting you to run `npm run setup` or `npm run setup:login` again.

### Logs

Logs are written to `logs/` with daily rotation. Screenshots are saved to `logs/screenshots/` for debugging.

### Requirements

- macOS
- Node.js >= 18
- A Malt.de freelancer account

---

## Author

Martin Pfeffer - [celox.io](https://celox.io)

## License

MIT
