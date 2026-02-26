#!/usr/bin/env node
/**
 * ProfilePulse License Server
 *
 * Handles Stripe checkout sessions, webhooks, and license validation.
 * Deploy this on a VPS and configure Stripe webhook to point here.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env from server directory
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;
const LICENSES_FILE = path.join(__dirname, 'licenses.json');

// --- License DB helpers ---

function loadLicenses() {
  if (!fs.existsSync(LICENSES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LICENSES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLicenses(licenses) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(licenses, null, 2));
}

function generateLicenseKey() {
  // Format: PULSE-XXXX-XXXX-XXXX-XXXX
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `PULSE-${segments.join('-')}`;
}

// --- Stripe webhook needs raw body ---

app.post(
  '/api/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'invoice.payment_succeeded'
    ) {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email;
      const mode = session.mode; // 'subscription' or 'payment'

      if (email) {
        const licenses = loadLicenses();
        const licenseKey = generateLicenseKey();
        licenses.push({
          key: licenseKey,
          email,
          type: mode === 'subscription' ? 'monthly' : 'lifetime',
          createdAt: new Date().toISOString(),
          active: true,
          stripeSessionId: session.id,
          stripeCustomerId: session.customer || null,
        });
        saveLicenses(licenses);
        console.log(`License created for ${email}: ${licenseKey} (${mode})`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const licenses = loadLicenses();
      let deactivated = 0;
      const updated = licenses.map((lic) => {
        if (
          lic.type === 'monthly' &&
          lic.active &&
          lic.stripeCustomerId === customerId
        ) {
          lic.active = false;
          deactivated++;
        }
        return lic;
      });
      saveLicenses(updated);
      console.log(`Subscription cancelled for customer ${customerId}, ${deactivated} license(s) deactivated`);
    }

    res.json({ received: true });
  }
);

// --- JSON body parser for all other routes ---

app.use(express.json());

// --- Health check ---

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Rate limiting for license validation ---

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per IP per minute

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ valid: false, error: 'Too many requests. Try again later.' });
  }
  next();
}

// --- Create Checkout Session ---

app.post('/api/create-checkout', async (req, res) => {
  const { plan } = req.body; // 'monthly' or 'lifetime'

  try {
    const params = {
      payment_method_types: ['card'],
      customer_email: req.body.email || undefined,
      success_url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/cancel`,
    };

    if (plan === 'monthly') {
      params.mode = 'subscription';
      params.line_items = [
        { price: process.env.STRIPE_PRICE_MONTHLY, quantity: 1 },
      ];
    } else {
      params.mode = 'payment';
      params.line_items = [
        { price: process.env.STRIPE_PRICE_LIFETIME, quantity: 1 },
      ];
    }

    const session = await stripe.checkout.sessions.create(params);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error(`Checkout error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// --- Validate License ---

app.post('/api/validate-license', rateLimit, (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ valid: false, error: 'No license key provided' });
  }

  // Master key — always valid (read from environment, not in source code)
  if (process.env.MASTER_KEY && key === process.env.MASTER_KEY) {
    return res.json({ valid: true, type: 'lifetime', email: 'admin', createdAt: null });
  }

  const licenses = loadLicenses();
  const license = licenses.find((lic) => lic.key === key && lic.active);

  if (!license) {
    return res.json({ valid: false, error: 'Invalid or inactive license key' });
  }

  res.json({
    valid: true,
    type: license.type,
    email: license.email,
    createdAt: license.createdAt,
  });
});

// --- Simple landing page ---

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ProfilePulse - Automatische Verfügbarkeit für Malt.de</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
        .hero { max-width: 900px; margin: 0 auto; padding: 4rem 2rem 2rem; text-align: center; }
        h1 { font-size: 2.8rem; margin-bottom: 0.5rem; color: #fff; }
        .tagline { color: #22c55e; font-size: 1.2rem; font-weight: 600; margin-bottom: 1.5rem; }
        .subtitle { color: #888; font-size: 1.05rem; margin-bottom: 2rem; line-height: 1.6; max-width: 650px; margin-left: auto; margin-right: auto; }

        .problem { max-width: 700px; margin: 0 auto 3rem; padding: 0 2rem; }
        .problem h2 { color: #fff; font-size: 1.4rem; margin-bottom: 1rem; text-align: center; }
        .problem p { color: #aaa; line-height: 1.7; margin-bottom: 0.8rem; }
        .problem strong { color: #e5e5e5; }

        .how-it-works { max-width: 700px; margin: 0 auto 3rem; padding: 0 2rem; }
        .how-it-works h2 { color: #fff; font-size: 1.4rem; margin-bottom: 1.2rem; text-align: center; }
        .steps { list-style: none; }
        .steps li { color: #ccc; padding: 0.6rem 0; padding-left: 2rem; position: relative; line-height: 1.5; }
        .steps li::before { position: absolute; left: 0; color: #22c55e; font-weight: bold; }
        .steps li:nth-child(1)::before { content: "1."; }
        .steps li:nth-child(2)::before { content: "2."; }
        .steps li:nth-child(3)::before { content: "3."; }
        .steps li:nth-child(4)::before { content: "4."; }
        .steps li:nth-child(5)::before { content: "5."; }

        .plans-section { max-width: 900px; margin: 0 auto; padding: 0 2rem 2rem; text-align: center; }
        .plans-section h2 { color: #fff; font-size: 1.4rem; margin-bottom: 1.5rem; }
        .plans { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; }
        .plan { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2rem; width: 320px; text-align: left; }
        .plan h3 { font-size: 1.3rem; margin-bottom: 0.5rem; color: #fff; }
        .price { font-size: 2rem; font-weight: bold; color: #fff; margin: 1rem 0; }
        .price span { font-size: 0.9rem; color: #888; font-weight: normal; }
        .features { list-style: none; margin: 1.5rem 0; }
        .features li { padding: 0.4rem 0; color: #ccc; }
        .features li::before { content: "\\2713"; color: #22c55e; font-weight: bold; margin-right: 0.5rem; }
        .btn { display: block; width: 100%; padding: 0.8rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; transition: background 0.2s; }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: #22c55e; color: #fff; }
        .btn-secondary:hover { background: #16a34a; }
        .popular { border-color: #22c55e; position: relative; }
        .popular::before { content: "Beliebt"; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #22c55e; color: #000; padding: 2px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }

        .setup { max-width: 700px; margin: 3rem auto; padding: 0 2rem; }
        .setup h2 { color: #fff; font-size: 1.4rem; margin-bottom: 1.2rem; text-align: center; }
        .code-block { background: #111; border: 1px solid #333; border-radius: 8px; padding: 1.2rem 1.5rem; margin: 1rem 0; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.9rem; color: #ccc; overflow-x: auto; line-height: 1.7; }
        .code-block .comment { color: #666; }
        .setup p { color: #aaa; line-height: 1.6; margin-bottom: 0.8rem; }

        .login-info { margin-top: 2rem; }
        .login-info h3 { color: #fff; font-size: 1.15rem; margin-bottom: 1rem; }
        .login-options { display: flex; gap: 1.2rem; flex-wrap: wrap; }
        .login-option { flex: 1; min-width: 250px; background: #111; border: 1px solid #333; border-radius: 8px; padding: 1rem 1.2rem; color: #ccc; line-height: 1.6; font-size: 0.95rem; }
        .login-option strong { color: #fff; }
        .login-option code { background: #222; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; color: #22c55e; }
        .login-note { color: #888; font-size: 0.9rem; margin-top: 0.8rem; }

        .footer { max-width: 700px; margin: 3rem auto 0; padding: 2rem; text-align: center; border-top: 1px solid #222; }
        .footer p { color: #555; font-size: 0.85rem; margin-bottom: 0.3rem; }
        .footer a { color: #2563eb; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="hero">
        <h1>ProfilePulse</h1>
        <p class="tagline">Nie wieder Verfügbarkeit manuell bestätigen.</p>
        <p class="subtitle">
          ProfilePulse hält dein Malt.de-Profil automatisch sichtbar &mdash;
          jeden Tag, ohne dass du einen Finger rühren musst.
        </p>
      </div>

      <div class="problem">
        <h2>Das Problem</h2>
        <p>Malt.de verlangt von Freelancern, ihre Verfügbarkeit <strong>alle 7 Tage</strong> manuell zu bestätigen. Vergisst du es, verschwindet das grüne Badge, dein Profil rutscht in den Suchergebnissen ab &mdash; und potenzielle Kunden finden dich nicht mehr.</p>
        <p>Das kann schnell <strong>tausende Euro an entgangenen Aufträgen</strong> bedeuten.</p>
      </div>

      <div class="how-it-works">
        <h2>So funktioniert ProfilePulse</h2>
        <ul class="steps">
          <li>Läuft automatisch im Hintergrund auf deinem Rechner (macOS, Linux, Windows)</li>
          <li>Öffnet unsichtbar einen Browser und navigiert zu deinem Malt-Dashboard</li>
          <li>Klickt &bdquo;Ja, ich bin verfügbar&ldquo; und &bdquo;Bestätigen&ldquo;</li>
          <li>Benachrichtigt dich bei Erfolg oder falls etwas schiefgeht</li>
          <li>Wiederholt sich täglich &mdash; dein Badge bleibt immer grün</li>
        </ul>
      </div>

      <div class="plans-section">
        <h2>Lizenz wählen</h2>
        <div class="plans">
          <div class="plan">
            <h3>Monats-Abo</h3>
            <div class="price">5 EUR<span>/Monat</span></div>
            <ul class="features">
              <li>Tägliche automatische Bestätigung</li>
              <li>Alle Updates inklusive</li>
              <li>E-Mail Support</li>
              <li>Jederzeit kündbar</li>
            </ul>
            <a class="btn btn-primary" href="/checkout/monthly">Abo starten</a>
          </div>
          <div class="plan popular">
            <h3>Lifetime</h3>
            <div class="price">49 EUR<span> einmalig</span></div>
            <ul class="features">
              <li>Tägliche automatische Bestätigung</li>
              <li>Alle Updates inklusive</li>
              <li>E-Mail Support</li>
              <li>Einmal zahlen, für immer nutzen</li>
            </ul>
            <a class="btn btn-secondary" href="/checkout/lifetime">Jetzt kaufen</a>
          </div>
        </div>
      </div>

      <div class="setup">
        <h2>Einrichtung in 2 Minuten</h2>
        <p>Nach dem Kauf erhältst du einen Lizenzschlüssel (Format: <strong>PULSE-XXXX-XXXX-XXXX-XXXX</strong>). Dann:</p>
        <div class="code-block">
          <span class="comment"># 1. Repository klonen und installieren</span><br>
          git clone https://github.com/pepperonas/profile-pulse.git<br>
          cd profile-pulse<br>
          npm install && npx playwright install chromium<br><br>
          <span class="comment"># 2. Lizenz aktivieren</span><br>
          npm run activate<br><br>
          <span class="comment"># 3. Bei Malt anmelden (Option A oder B)</span><br>
          npm run setup &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="comment"># Google SSO (Browser-Fenster)</span><br>
          npm run setup:login &nbsp;&nbsp;<span class="comment"># E-Mail/Passwort (Terminal)</span><br><br>
          <span class="comment"># 4. Täglich automatisch laufen lassen</span><br>
          npm run install-schedule
        </div>

        <div class="login-info">
          <h3>Zwei Login-Wege</h3>
          <div class="login-options">
            <div class="login-option">
              <strong>Google SSO</strong> (<code>npm run setup</code>)<br>
              Öffnet ein Browser-Fenster, in dem du dich mit deinem Google-Konto bei Malt anmeldest. Ideal, wenn du dich bei Malt über Google registriert hast.
            </div>
            <div class="login-option">
              <strong>E-Mail / Passwort</strong> (<code>npm run setup:login</code>)<br>
              Login direkt im Terminal &mdash; du gibst E-Mail und Passwort ein, ohne dass ein Browser-Fenster erscheint. Ideal für Server oder Headless-Setups.
            </div>
          </div>
          <p class="login-note">Beide Methoden speichern die Session dauerhaft. Du musst dich nur einmal anmelden.</p>
        </div>

        <p>Das war's. ProfilePulse läuft ab jetzt jeden Tag automatisch im Hintergrund.</p>
      </div>

      <div class="footer">
        <p>&copy; 2026 Martin Pfeffer &mdash; <a href="https://celox.io">celox.io</a></p>
        <p><a href="https://github.com/pepperonas/profile-pulse">GitHub</a></p>
        <p style="margin-top: 0.8rem;"><a href="/impressum">Impressum</a> &middot; <a href="/datenschutz">Datenschutz</a> &middot; <a href="/agb">AGB</a></p>
      </div>
    </body>
    </html>
  `);
});

// --- Checkout redirect routes ---

app.get('/checkout/monthly', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_MONTHLY, quantity: 1 }],
      success_url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/cancel`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

app.get('/checkout/lifetime', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_LIFETIME, quantity: 1 }],
      success_url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SERVER_URL || `http://localhost:${PORT}`}/cancel`,
    });
    res.redirect(303, session.url);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

// --- Success / Cancel pages ---

app.get('/success', async (req, res) => {
  const sessionId = req.query.session_id;
  let licenseKey = null;

  if (sessionId) {
    // Wait briefly for webhook to process
    await new Promise((r) => setTimeout(r, 2000));
    const licenses = loadLicenses();
    const license = licenses.find((lic) => lic.stripeSessionId === sessionId);
    if (license) licenseKey = license.key;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zahlung erfolgreich</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
        .container { max-width: 600px; padding: 3rem; }
        h1 { color: #22c55e; margin-bottom: 1rem; }
        .key { background: #1a1a1a; border: 2px solid #22c55e; border-radius: 8px; padding: 1rem 2rem; font-family: monospace; font-size: 1.3rem; margin: 2rem 0; letter-spacing: 1px; user-select: all; }
        code { background: #1a1a1a; padding: 2px 8px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Zahlung erfolgreich!</h1>
        ${
          licenseKey
            ? `<p>Dein Lizenzschlüssel:</p><div class="key">${licenseKey}</div><p>Aktiviere ihn mit:</p><p><code>npm run activate</code></p>`
            : `<p>Dein Lizenzschlüssel wird in Kürze per E-Mail zugestellt.</p><p>Falls der Schlüssel hier nicht angezeigt wird, prüfe deine E-Mail oder lade diese Seite neu.</p>`
        }
      </div>
    </body>
    </html>
  `);
});

app.get('/cancel', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>Zahlung abgebrochen</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
      </style>
    </head>
    <body>
      <div>
        <h1>Zahlung abgebrochen</h1>
        <p>Du kannst es jederzeit erneut versuchen.</p>
        <p><a href="/" style="color: #2563eb;">Zurück zur Startseite</a></p>
      </div>
    </body>
    </html>
  `);
});

// --- Legal page styles (shared) ---

const legalPageStyle = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; }
  .legal { max-width: 740px; margin: 0 auto; padding: 3rem 2rem; }
  .legal h1 { color: #fff; font-size: 2rem; margin-bottom: 2rem; }
  .legal h2 { color: #fff; font-size: 1.2rem; margin: 1.8rem 0 0.6rem; }
  .legal p, .legal li { color: #ccc; line-height: 1.7; margin-bottom: 0.6rem; }
  .legal ul { padding-left: 1.5rem; margin-bottom: 1rem; }
  .legal a { color: #2563eb; text-decoration: none; }
  .legal a:hover { text-decoration: underline; }
  .legal .back { display: inline-block; margin-bottom: 2rem; color: #888; font-size: 0.9rem; }
`;

// --- Impressum ---

app.get('/impressum', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Impressum – ProfilePulse</title>
      <style>${legalPageStyle}</style>
    </head>
    <body>
      <div class="legal">
        <a class="back" href="/">&larr; Zurück zur Startseite</a>
        <h1>Impressum</h1>

        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          Martin Pfeffer<br>
          Flughafenstraße 24<br>
          12053 Berlin<br>
          Deutschland
        </p>

        <h2>Kontakt</h2>
        <p>
          Telefon: 0151 590 824 65<br>
          E-Mail: martin.pfeffer@celox.io
        </p>

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Martin Pfeffer<br>
          Flughafenstraße 24<br>
          12053 Berlin
        </p>

        <h2>Streitschlichtung</h2>
        <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank">https://ec.europa.eu/consumers/odr/</a>.</p>
        <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </div>
    </body>
    </html>
  `);
});

// --- Datenschutz ---

app.get('/datenschutz', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Datenschutzerklärung – ProfilePulse</title>
      <style>${legalPageStyle}</style>
    </head>
    <body>
      <div class="legal">
        <a class="back" href="/">&larr; Zurück zur Startseite</a>
        <h1>Datenschutzerklärung</h1>

        <h2>1. Verantwortlicher</h2>
        <p>
          Martin Pfeffer<br>
          Flughafenstraße 24, 12053 Berlin<br>
          E-Mail: martin.pfeffer@celox.io<br>
          Telefon: 0151 590 824 65
        </p>

        <h2>2. Erhebung und Speicherung personenbezogener Daten</h2>
        <p>Beim Besuch dieser Website werden automatisch folgende Daten erfasst:</p>
        <ul>
          <li>IP-Adresse (anonymisiert)</li>
          <li>Datum und Uhrzeit des Zugriffs</li>
          <li>Aufgerufene Seite</li>
        </ul>
        <p>Diese Daten werden für den technischen Betrieb benötigt und nach spätestens 7 Tagen gelöscht.</p>

        <h2>3. Zahlungsabwicklung über Stripe</h2>
        <p>Für die Zahlungsabwicklung nutzen wir den Dienst <strong>Stripe, Inc.</strong> (510 Townsend Street, San Francisco, CA 94103, USA). Bei einem Kauf werden folgende Daten an Stripe übermittelt:</p>
        <ul>
          <li>E-Mail-Adresse</li>
          <li>Zahlungsinformationen (Kreditkartendaten werden ausschließlich von Stripe verarbeitet)</li>
        </ul>
        <p>Die Datenschutzerklärung von Stripe findest du unter: <a href="https://stripe.com/de/privacy" target="_blank">stripe.com/de/privacy</a></p>

        <h2>4. Lizenzschlüssel</h2>
        <p>Nach dem Kauf wird ein Lizenzschlüssel generiert und zusammen mit deiner E-Mail-Adresse auf unserem Server gespeichert. Dies ist für die Lizenzvalidierung erforderlich.</p>

        <h2>5. Software (ProfilePulse Client)</h2>
        <p>Die ProfilePulse-Software läuft lokal auf deinem Rechner. Sie:</p>
        <ul>
          <li>Kontaktiert unseren Server ausschließlich zur Lizenzvalidierung (einmal täglich)</li>
          <li>Speichert Browser-Sitzungsdaten lokal in <code>browser-data/</code></li>
          <li>Schreibt Logs lokal in <code>logs/</code></li>
          <li>Überträgt keine personenbezogenen Daten an Dritte</li>
        </ul>

        <h2>6. Deine Rechte</h2>
        <p>Du hast das Recht auf:</p>
        <ul>
          <li>Auskunft über deine gespeicherten Daten</li>
          <li>Berichtigung unrichtiger Daten</li>
          <li>Löschung deiner Daten</li>
          <li>Einschränkung der Verarbeitung</li>
          <li>Datenübertragbarkeit</li>
          <li>Widerspruch gegen die Verarbeitung</li>
        </ul>
        <p>Kontaktiere uns dazu unter: martin.pfeffer@celox.io</p>

        <h2>7. Cookies</h2>
        <p>Diese Website verwendet keine Tracking-Cookies. Stripe kann im Rahmen der Zahlungsabwicklung technisch notwendige Cookies setzen.</p>

        <p style="margin-top: 2rem; color: #888;">Stand: Februar 2026</p>
      </div>
    </body>
    </html>
  `);
});

// --- AGB ---

app.get('/agb', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AGB – ProfilePulse</title>
      <style>${legalPageStyle}</style>
    </head>
    <body>
      <div class="legal">
        <a class="back" href="/">&larr; Zurück zur Startseite</a>
        <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>

        <h2>§ 1 Geltungsbereich</h2>
        <p>Diese AGB gelten für alle Verträge zwischen Martin Pfeffer, Flughafenstraße 24, 12053 Berlin (nachfolgend „Anbieter") und dem Kunden über die Nutzung der Software „ProfilePulse".</p>

        <h2>§ 2 Vertragsgegenstand</h2>
        <p>Der Anbieter stellt dem Kunden die Software ProfilePulse zur Verfügung, die die automatische Bestätigung der Verfügbarkeit auf der Plattform malt.de ermöglicht. Die Software wird als Download über GitHub bereitgestellt und erfordert einen gültigen Lizenzschlüssel.</p>

        <h2>§ 3 Lizenzmodelle und Preise</h2>
        <ul>
          <li><strong>Monats-Abo:</strong> 5 EUR/Monat, monatlich kündbar. Die Lizenz ist gültig, solange das Abonnement aktiv ist.</li>
          <li><strong>Lifetime-Lizenz:</strong> 49 EUR (einmalig). Die Lizenz gilt zeitlich unbegrenzt.</li>
        </ul>

        <h2>§ 4 Zahlungsbedingungen</h2>
        <p>Die Zahlung erfolgt über den Zahlungsdienstleister Stripe. Mit Abschluss des Kaufs wird die Zahlung fällig. Beim Monats-Abo wird der Betrag monatlich automatisch abgebucht.</p>

        <h2>§ 5 Lizenzschlüssel</h2>
        <p>Nach erfolgreicher Zahlung erhält der Kunde einen Lizenzschlüssel. Dieser ist persönlich, nicht übertragbar und darf nicht an Dritte weitergegeben werden. Pro Lizenz ist die Nutzung auf einem Gerät gestattet.</p>

        <h2>§ 6 Kündigung</h2>
        <p>Das Monats-Abo kann jederzeit zum Ende des laufenden Abrechnungszeitraums gekündigt werden. Die Kündigung erfolgt über das Stripe-Kundenportal oder per E-Mail an martin.pfeffer@celox.io.</p>

        <h2>§ 7 Widerrufsrecht</h2>
        <p>Als Verbraucher hast du ein 14-tägiges Widerrufsrecht ab dem Kaufdatum. Der Widerruf kann formlos per E-Mail an martin.pfeffer@celox.io erklärt werden. Nach Widerruf wird der Lizenzschlüssel deaktiviert und der Kaufpreis erstattet.</p>

        <h2>§ 8 Haftung</h2>
        <p>Die Software wird „wie besehen" bereitgestellt. Der Anbieter haftet nicht für:</p>
        <ul>
          <li>Änderungen an der Plattform malt.de, die die Funktionalität beeinträchtigen</li>
          <li>Ausfälle oder Einschränkungen durch Drittanbieter (Malt, Stripe)</li>
          <li>Schäden, die durch unsachgemäße Nutzung entstehen</li>
        </ul>
        <p>Die Haftung für vorsätzliche und grob fahrlässige Pflichtverletzungen bleibt unberührt.</p>

        <h2>§ 9 Verfügbarkeit</h2>
        <p>Der Anbieter bemüht sich um eine hohe Verfügbarkeit des Lizenzservers, kann jedoch keine ständige Erreichbarkeit garantieren. Die Software verfügt über eine Offline-Toleranz von 7 Tagen.</p>

        <h2>§ 10 Änderungen der AGB</h2>
        <p>Der Anbieter behält sich vor, diese AGB mit angemessener Ankündigungsfrist zu ändern. Bestehende Lifetime-Lizenzen bleiben von Änderungen unberührt.</p>

        <h2>§ 11 Schlussbestimmungen</h2>
        <p>Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Berlin, sofern gesetzlich zulässig.</p>

        <p style="margin-top: 2rem; color: #888;">Stand: Februar 2026</p>
      </div>
    </body>
    </html>
  `);
});

// --- Start server ---

app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});
