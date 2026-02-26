#!/usr/bin/env node
/**
 * malt-availability License Server
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
  // Format: MALT-XXXX-XXXX-XXXX-XXXX
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `MALT-${segments.join('-')}`;
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
      <title>malt-availability - Lizenz kaufen</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 800px; padding: 3rem; text-align: center; }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #fff; }
        .subtitle { color: #888; font-size: 1.1rem; margin-bottom: 3rem; }
        .plans { display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap; }
        .plan { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 2rem; width: 320px; text-align: left; }
        .plan h2 { font-size: 1.3rem; margin-bottom: 0.5rem; }
        .price { font-size: 2rem; font-weight: bold; color: #fff; margin: 1rem 0; }
        .price span { font-size: 0.9rem; color: #888; font-weight: normal; }
        .features { list-style: none; margin: 1.5rem 0; }
        .features li { padding: 0.4rem 0; color: #ccc; }
        .features li::before { content: "\\2713 "; color: #22c55e; font-weight: bold; }
        .btn { display: block; width: 100%; padding: 0.8rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; }
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { background: #22c55e; color: #fff; }
        .btn-secondary:hover { background: #16a34a; }
        .popular { border-color: #22c55e; position: relative; }
        .popular::before { content: "Beliebt"; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #22c55e; color: #000; padding: 2px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>malt-availability</h1>
        <p class="subtitle">Automatische Verfuegbarkeitsbestaetigung fuer Malt.de Freelancer</p>
        <div class="plans">
          <div class="plan">
            <h2>Monats-Abo</h2>
            <div class="price">5 EUR<span>/Monat</span></div>
            <ul class="features">
              <li>Taegliche automatische Bestaetigung</li>
              <li>Alle Updates inklusive</li>
              <li>E-Mail Support</li>
              <li>Jederzeit kuendbar</li>
            </ul>
            <a class="btn btn-primary" href="/checkout/monthly">Abo starten</a>
          </div>
          <div class="plan popular">
            <h2>Lifetime</h2>
            <div class="price">49 EUR<span> einmalig</span></div>
            <ul class="features">
              <li>Taegliche automatische Bestaetigung</li>
              <li>Alle Updates inklusive</li>
              <li>E-Mail Support</li>
              <li>Einmal zahlen, fuer immer nutzen</li>
            </ul>
            <a class="btn btn-secondary" href="/checkout/lifetime">Jetzt kaufen</a>
          </div>
        </div>
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
            ? `<p>Dein Lizenzschluessel:</p><div class="key">${licenseKey}</div><p>Aktiviere ihn mit:</p><p><code>npm run activate</code></p>`
            : `<p>Dein Lizenzschluessel wird in Kuerze per E-Mail zugestellt.</p><p>Falls der Schluessel hier nicht angezeigt wird, pruefe deine E-Mail oder lade diese Seite neu.</p>`
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
        <p><a href="/" style="color: #2563eb;">Zurueck zur Startseite</a></p>
      </div>
    </body>
    </html>
  `);
});

// --- Start server ---

app.listen(PORT, () => {
  console.log(`License server running on port ${PORT}`);
});
