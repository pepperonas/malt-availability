# ProfilePulse

<p align="center">
  <img src="profilepulse.png" alt="ProfilePulse" width="600">
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/lang-Deutsch-blue?style=for-the-badge" alt="Deutsch"></a>
  <a href="README.en.md"><img src="https://img.shields.io/badge/lang-English-grey?style=for-the-badge" alt="English"></a>
</p>

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#lizenz)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.50+-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![macOS](https://img.shields.io/badge/macOS-supported-000000?logo=apple&logoColor=white)](https://www.apple.com/macos/)
[![Linux](https://img.shields.io/badge/Linux-supported-FCC624?logo=linux&logoColor=black)](https://www.linux.org/)
[![Windows](https://img.shields.io/badge/Windows-supported-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
[![Tests](https://img.shields.io/badge/Tests-29%20passed-brightgreen)](test/)
[![Stripe](https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

**Halte dein Freelancer-Profil sichtbar — automatisch.**

ProfilePulse automatisiert die wiederkehrende Verfügbarkeitsbestätigung auf [malt.de](https://www.malt.de), damit du nie wieder dein "Verfügbarkeit bestätigt"-Badge verlierst.

---

## Das Problem

Malt verlangt von Freelancern, ihre Verfügbarkeit **alle 7 Tage** manuell zu bestätigen. Vergisst man es, verschwindet das grüne Badge, die Sichtbarkeit in Suchergebnissen sinkt — und potenzielle Kunden finden dich nicht mehr.

## Die Lösung

ProfilePulse erledigt das automatisch. Einmal einrichten, nie wieder daran denken. Läuft auf **macOS, Linux und Windows**.

## Kostenlos testen

ProfilePulse bietet **2 kostenlose Bestätigungen** ohne Lizenzschlüssel. Einfach installieren, einloggen und `npm run confirm` ausführen — keine Kreditkarte nötig.

## Preise

| Plan | Preis | Details |
|------|-------|---------|
| **Kostenlose Testphase** | 0 EUR | 2 Bestätigungen zum Ausprobieren |
| **Monats-Abo** | 5 EUR/Monat | Jederzeit kündbar |
| **Lifetime** | 49 EUR einmalig | Einmal zahlen, für immer nutzen |

Lizenz kaufen: **[profilepulse.celox.io](https://profilepulse.celox.io)**

## So funktioniert's

1. Nutzt [Playwright](https://playwright.dev/) mit einem **persistenten Browser-Kontext** für dauerhafte Login-Sessions
2. Navigiert zum Freelancer-Dashboard
3. Öffnet den Verfügbarkeits-Dialog und klickt "Ja" + "Bestätigen"
4. **Automatische Wiederholung** bei Fehlern (bis zu 3 Versuche mit steigenden Wartezeiten)
5. Sendet **Desktop-Benachrichtigungen** bei Erfolg oder Fehler
6. **Verfolgt den letzten Erfolg** und warnt bei >5 Tagen ohne Bestätigung
7. Läuft automatisch per Scheduler — täglich um 10:00 Uhr + beim Login

## Schnellstart

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

## Login-Methoden

| Methode | Befehl | Beschreibung |
|---------|--------|-------------|
| **Google SSO** | `npm run setup` | Öffnet ein Browser-Fenster für Google-Login bei Malt |
| **E-Mail/Passwort** | `npm run setup:login` | Login direkt im Terminal, ideal für Server/Headless |

Beide Methoden speichern die Session dauerhaft — du musst dich nur einmal anmelden.

## Befehle

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

## Scheduling

| Plattform | Mechanismus | Konfiguration |
|-----------|------------|---------------|
| **macOS** | LaunchAgent | `~/Library/LaunchAgents/com.celox.profile-pulse.plist` |
| **Linux** | systemd User Timer | `~/.config/systemd/user/profile-pulse.timer` |
| **Windows** | Task Scheduler | Task `ProfilePulse` |

Auf allen Plattformen: Start beim Login + täglich 10:00 Uhr. Überlebt Neustarts. Der Browser läuft off-screen und stört nicht bei der Arbeit.

## Zuverlässigkeit

- **Automatische Wiederholung** — bis zu 3 Versuche (0s, 15s, 45s Delay)
- **Erfolgs-Tracking** — warnt per Benachrichtigung wenn >5 Tage seit letzter Bestätigung
- **Offline-Toleranz** — Lizenz bleibt 7 Tage gültig ohne Serververbindung
- **Screenshot-Rotation** — automatische Bereinigung (max. 20 Dateien)

## Session & Logs

- Browser-Session in `browser-data/` (gitignored). Bei Ablauf erscheint eine Benachrichtigung.
- Logs in `logs/` (tägliche Rotation). Screenshots in `logs/screenshots/` zur Fehleranalyse.

## Voraussetzungen

- **macOS**, **Linux** oder **Windows**
- Node.js >= 18
- Ein Malt.de Freelancer-Konto
- Linux: `notify-send` (optional, für Desktop-Benachrichtigungen)

---

## Autor

Martin Pfeffer - [celox.io](https://celox.io)

## Lizenz

Proprietäre Software. Siehe [LICENSE](LICENSE) für Details.

Kaufen auf [profilepulse.celox.io](https://profilepulse.celox.io):
- **Kostenlose Testphase** (2 Bestätigungen gratis)
- **5 EUR/Monat** (Monats-Abo)
- **49 EUR** (Lifetime, einmalig)
