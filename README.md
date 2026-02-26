# ProfilePulse

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#lizenz--license)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.50+-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![macOS](https://img.shields.io/badge/macOS-supported-000000?logo=apple&logoColor=white)](https://www.apple.com/macos/)
[![Linux](https://img.shields.io/badge/Linux-supported-FCC624?logo=linux&logoColor=black)](https://www.linux.org/)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![Malt](https://img.shields.io/badge/Malt.de-Freelancer-FC5757)](https://www.malt.de/)
[![Tests](https://img.shields.io/badge/Tests-29%20passed-brightgreen)](test/)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

> **[Deutsch](#deutsch)** | **[English](#english)**

---

<a id="deutsch"></a>

## :de: Deutsch

Automatische Verfügbarkeitsbestätigung für [malt.de](https://www.malt.de) Freelancer-Profile.

Malt verlangt von Freelancern, ihre Verfügbarkeit alle 7 Tage zu bestätigen, um das Badge "Verfügbarkeit bestätigt" auf dem Profil zu behalten. Ohne Bestätigung sinkt die Sichtbarkeit in den Suchergebnissen. ProfilePulse automatisiert den gesamten Vorgang auf **macOS, Linux und Windows**.

### Preise

| Plan | Preis | Details |
|------|-------|---------|
| **Monats-Abo** | 5 EUR/Monat | Jederzeit kündbar |
| **Lifetime** | 49 EUR einmalig | Einmal zahlen, für immer nutzen |

Lizenz kaufen und Schlüssel erhalten: **[profilepulse-license.example.com](https://profilepulse-license.example.com)**

### So funktioniert's

1. Nutzt [Playwright](https://playwright.dev/) mit einem **persistenten Browser-Kontext**, um die Login-Session dauerhaft zu speichern
2. Navigiert zum Malt Freelancer-Dashboard
3. Öffnet den Verfügbarkeits-Dialog und klickt "Ja" + "Bestätigen"
4. **Automatische Wiederholung** bei Fehlern (bis zu 3 Versuche mit steigenden Wartezeiten)
5. Sendet Desktop-Benachrichtigungen bei Erfolg oder Fehler (macOS, Linux, Windows)
6. **Verfolgt den letzten Erfolg** und warnt, wenn die Bestätigung seit >5 Tagen aussteht
7. Läuft automatisch per Scheduler — startet beim Login und wiederholt sich täglich um 10:00 Uhr

### Installation

```bash
# Abhängigkeiten installieren
npm install

# Playwright-Browser installieren (nur Chromium)
npx playwright install chromium
```

### Lizenz aktivieren

Nach dem Kauf einer Lizenz erhältst du einen Schlüssel im Format `PULSE-XXXX-XXXX-XXXX-XXXX`.

```bash
npm run activate
```

Gibt den Lizenzschlüssel ein, wenn du dazu aufgefordert wirst. Der Schlüssel wird lokal in `license.json` gespeichert (gitignored).

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
| `npm run activate` | Lizenzschlüssel eingeben und aktivieren |
| `npm run setup` | Google SSO Login (öffnet Browser-Fenster) |
| `npm run setup:login` | E-Mail/Passwort Login (interaktiv im Terminal) |
| `npm run confirm` | Verfügbarkeit einmalig bestätigen (erfordert Lizenz) |
| `npm run status` | Aktuellen Status anzeigen (Session, Scheduler, letzter Erfolg) |
| `npm run install-schedule` | Scheduler installieren (erkennt OS automatisch) |
| `npm run uninstall-schedule` | Scheduler entfernen |
| `npm test` | Unit Tests ausführen |

### Scheduling (plattformspezifisch)

Der Scheduler wird automatisch für dein Betriebssystem konfiguriert:

| Plattform | Mechanismus | Konfiguration |
|-----------|------------|---------------|
| **macOS** | LaunchAgent | `~/Library/LaunchAgents/com.celox.profile-pulse.plist` |
| **Linux** | systemd User Timer | `~/.config/systemd/user/profile-pulse.timer` |
| **Windows** | Task Scheduler | Task `ProfilePulse` |

Auf allen Plattformen:
- **Start beim Login** — läuft sofort nach der Anmeldung
- **Täglich um 10:00 Uhr** — wiederholt sich jeden Tag, um das 7-Tage-Fenster zuverlässig abzudecken
- **Überlebt Neustarts** — der jeweilige Scheduler verwaltet den Lebenszyklus automatisch

Der Browser läuft off-screen (nicht-headless, um Cloudflare zu umgehen) und stört nicht bei der Arbeit.

### Zuverlässigkeit

- **Automatische Wiederholung**: Schlägt ein Bestätigungsversuch fehl (z.B. Netzwerk-Timeout, Cloudflare), wird bis zu 3x mit steigenden Wartezeiten (0s, 15s, 45s) wiederholt
- **Erfolgs-Tracking**: Der Zeitpunkt der letzten erfolgreichen Bestätigung wird in `last-success.json` gespeichert. Falls >5 Tage vergangen sind, erscheint eine Warnung per Desktop-Benachrichtigung
- **Offline-Toleranz**: Ist der Lizenzserver nicht erreichbar, wird die Lizenz bis zu 7 Tage lang weiterhin als gültig akzeptiert (Grace Period)
- **Screenshot-Rotation**: Alte Screenshots werden automatisch bereinigt (maximal 20 behalten)

### Session-Verwaltung

Die Browser-Session wird in `browser-data/` gespeichert (gitignored). Wenn die Session abläuft (Google-Sessions halten typischerweise Wochen bis Monate), erscheint eine Desktop-Benachrichtigung mit der Aufforderung, `npm run setup` oder `npm run setup:login` erneut auszuführen.

### Logs

Logs werden in `logs/` geschrieben (tägliche Rotation). Screenshots landen in `logs/screenshots/` zur Fehleranalyse (automatische Rotation, max. 20 Dateien).

### Voraussetzungen

- **macOS**, **Linux** oder **Windows**
- Node.js >= 18
- Ein Malt.de Freelancer-Konto
- Eine gültige Lizenz (monatlich oder Lifetime)
- Linux: `notify-send` (optional, für Desktop-Benachrichtigungen)

---

<a id="english"></a>

## :gb: English

Automated availability confirmation for [malt.de](https://www.malt.de) freelancer profiles.

Malt requires freelancers to confirm their availability every 7 days to maintain the "availability confirmed" badge on their profile. Without confirmation, visibility in search results decreases. ProfilePulse automates the entire process on **macOS, Linux, and Windows**.

### Pricing

| Plan | Price | Details |
|------|-------|---------|
| **Monthly** | 5 EUR/month | Cancel anytime |
| **Lifetime** | 49 EUR one-time | Pay once, use forever |

Purchase a license and get your key: **[profilepulse-license.example.com](https://profilepulse-license.example.com)**

### How it works

1. Uses [Playwright](https://playwright.dev/) with a **persistent browser context** to maintain the login session permanently
2. Navigates to the Malt freelancer dashboard
3. Opens the availability dialog and clicks "Ja" + "Bestätigen"
4. **Automatic retry** on failure (up to 3 attempts with increasing delays)
5. Sends desktop notifications on success or failure (macOS, Linux, Windows)
6. **Tracks last success** and warns if confirmation is overdue (>5 days)
7. Runs automatically via scheduler — starts at login and repeats daily at 10:00 AM

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (Chromium only)
npx playwright install chromium
```

### Activate license

After purchasing a license, you'll receive a key in the format `PULSE-XXXX-XXXX-XXXX-XXXX`.

```bash
npm run activate
```

Enter the license key when prompted. The key is stored locally in `license.json` (gitignored).

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
| `npm run activate` | Enter and activate a license key |
| `npm run setup` | Google SSO login (opens browser window) |
| `npm run setup:login` | Email/password login (interactive terminal) |
| `npm run confirm` | Confirm availability once (requires license) |
| `npm run status` | Show current status (session, scheduler, last success) |
| `npm run install-schedule` | Install scheduler (auto-detects OS) |
| `npm run uninstall-schedule` | Remove the scheduler |
| `npm test` | Run unit tests |

### Scheduling (platform-specific)

The scheduler is automatically configured for your operating system:

| Platform | Mechanism | Configuration |
|----------|-----------|---------------|
| **macOS** | LaunchAgent | `~/Library/LaunchAgents/com.celox.profile-pulse.plist` |
| **Linux** | systemd user timer | `~/.config/systemd/user/profile-pulse.timer` |
| **Windows** | Task Scheduler | Task `ProfilePulse` |

On all platforms:
- **Start at login** — runs immediately when you log in
- **Daily at 10:00 AM** — repeats every day to keep the 7-day window covered
- **Survives reboots** — the respective scheduler manages the lifecycle automatically

The browser window runs off-screen (non-headless to bypass Cloudflare) so it won't interfere with your work.

### Reliability

- **Automatic retry**: If a confirmation attempt fails (e.g. network timeout, Cloudflare), it retries up to 3 times with increasing delays (0s, 15s, 45s)
- **Success tracking**: The timestamp of the last successful confirmation is stored in `last-success.json`. If >5 days have passed, a warning notification is shown
- **Offline tolerance**: If the license server is unreachable, the license remains valid for up to 7 days (grace period)
- **Screenshot rotation**: Old screenshots are automatically cleaned up (keeps the most recent 20)

### Session management

The browser session is stored in `browser-data/` (gitignored). If the session expires (Google SSO sessions typically last weeks to months), you'll receive a desktop notification prompting you to run `npm run setup` or `npm run setup:login` again.

### Logs

Logs are written to `logs/` with daily rotation. Screenshots are saved to `logs/screenshots/` for debugging (automatic rotation, max 20 files).

### Requirements

- **macOS**, **Linux**, or **Windows**
- Node.js >= 18
- A Malt.de freelancer account
- A valid license (monthly or lifetime)
- Linux: `notify-send` (optional, for desktop notifications)

---

## Author

Martin Pfeffer - [celox.io](https://celox.io)

## Lizenz / License

Proprietary software. See [LICENSE](LICENSE) for details.

Purchase at [profilepulse-license.example.com](https://profilepulse-license.example.com):
- **5 EUR/Monat** (monthly subscription)
- **49 EUR** (lifetime, one-time payment)
