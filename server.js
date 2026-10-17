require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');

const app = express();
const configuredPort = Number(process.env.PORT || 3000);
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpay = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
const geminiApiKey = process.env.GEMINI_API_KEY;
const rescueEmail = process.env.RESCUE_ALERT_TO;
const rescueSms = process.env.RESCUE_ALERT_SMS_TO;
const chatModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const rateWindows = new Map();
const transporter = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  : null;

// Allow the public GitHub Pages frontend and the Animal Allies custom domain to call this API.
const allowedOrigins = new Set([
  'https://alok2709-dev.github.io',
  'https://animalallies.org',
  'https://www.animalallies.org',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '30kb' }));
app.use('/data', (_req, res) => res.sendStatus(404));
app.use(express.static(__dirname, { dotfiles: 'deny' }));

function clientKey(req) { return req.ip || req.socket.remoteAddress || 'unknown'; }
function allowRequest(req, bucket, max, durationMs) {
  const now = Date.now(), key = `${bucket}:${clientKey(req)}`;
  const history = (rateWindows.get(key) || []).filter(time => now - time < durationMs);
  if (history.length >= max) return false;
  history.push(now); rateWindows.set(key, history); return true;
}
function safe(value, max) { return typeof value === 'string' ? value.trim().replace(/[\r\n]+/g, ' ').slice(0, max) : ''; }

async function sendTwilioMessage(body) {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from || !rescueSms) return false;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: rescueSms, From: from, Body: body })
  });
  if (!response.ok) throw new Error(`Twilio returned ${response.status}`);
  return true;
}

app.post('/api/rescue-reports', async (req, res) => {
  if (!allowRequest(req, 'rescue', 3, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many reports from this connection. For an urgent case, call or WhatsApp the rescue line.' });
  const report = { name: safe(req.body.name, 80), phone: safe(req.body.phone, 30), email: safe(req.body.email, 120), location: safe(req.body.location, 220), message: safe(req.body.message, 1600) };
  if (!report.name || !report.phone || !report.email || !report.location || !/^\S+@\S+\.\S+$/.test(report.email)) return res.status(400).json({ error: 'Please include your name, email, phone number, and the animal’s exact location.' });
  if (!transporter && !rescueSms) return res.status(503).json({ error: 'Rescue alerts have not been configured yet. Please call or WhatsApp the rescue line for immediate help.' });
  const plain = `New Animal Allies rescue report\n\nReporter: ${report.name}\nPhone: ${report.phone}\nEmail: ${report.email}\nLocation: ${report.location}\n\nWhat happened:\n${report.message || 'No additional details'}`;
  const sms = `Animal Allies rescue: ${report.location}. Reporter ${report.name}, ${report.phone}. ${(report.message || 'No details').slice(0, 240)}`;
  const tasks = [];
  if (transporter && rescueEmail) {
    const from = process.env.RESCUE_FROM || process.env.SMTP_USER;
    tasks.push(transporter.sendMail({ from, to: rescueEmail, replyTo: report.email, subject: `URGENT RESCUE REPORT — ${report.location}`, text: plain }));
    tasks.push(transporter.sendMail({ from, to: report.email, subject: 'We received your animal rescue report', text: `Thank you, ${report.name}. Your rescue report for ${report.location} has been sent to the Animal Allies care team. If the animal is in immediate danger, call or WhatsApp us now at +91 73982 59999.` }));
  }
  if (rescueSms) tasks.push(sendTwilioMessage(sms));
  const settled = await Promise.allSettled(tasks);
  if (!settled.some(result => result.status === 'fulfilled')) { console.error('Rescue notification failed:', settled.map(result => result.reason?.message)); return res.status(502).json({ error: 'We could not deliver the rescue alert. Please call or WhatsApp the rescue line now.' }); }
  res.status(201).json({ message: 'Your rescue report was sent to the care team. For immediate danger, please call or WhatsApp us too.' });
});

app.post('/api/ask-ally', async (req, res) => {
  if (!allowRequest(req, 'assistant', Number(process.env.AI_MAX_REQUESTS_PER_HOUR || 20), 60 * 60 * 1000)) return res.status(429).json({ error: 'The guide has reached its hourly question limit. Please try again later.' });
  const message = safe(req.body.message, 600);
  if (!message) return res.status(400).json({ error: 'Write a question for the guide first.' });
  if (!geminiApiKey) return res.status(503).json({ error: 'The AI guide needs a GEMINI_API_KEY before it can answer.' });
  try {
    let response;
    let result;
    // Gemini can temporarily return 429/503 during demand spikes; retry briefly before failing.
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chatModel)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are Ally, Animal Allies’ practical, compassionate animal-welfare first-response guide. Give specific, safe next steps rather than vague statements. Reply in the same language as the user (including natural Hindi/Hinglish when they use it). Give a complete, useful answer in about 6–10 short sentences (roughly 120–220 words), using numbered steps when helpful. Do not stop after the first sentence or leave instructions unfinished; explain what to do now, what not to do, and when to get urgent help. Use concise but complete guidance. First assess immediate danger and protect the person: do not tell someone to approach, touch, chase, restrain, or feed an unfamiliar, frightened, aggressive, badly injured, or wild animal; tell them to keep a safe distance and contact a local animal rescue or veterinarian. For a dog bleeding from the ear, say this needs prompt veterinary assessment; keep the dog calm and prevent handling if it may bite. If the dog is familiar and safe to touch, only apply gentle pressure with clean gauze to visible external bleeding if tolerated; do not insert cotton buds, pack the ear canal, or put drops, powders, oils, or human medicines in the ear. If bleeding is heavy, the dog is weak, has trouble breathing, collapses, or has a head injury, seek emergency veterinary help immediately. Ask for the user's city/area only if it helps them find appropriate help, but never claim you have contacted or dispatched a rescuer. You are not a veterinarian; do not diagnose or prescribe medication. Do not use web search. Avoid alarming or judgmental language." }]
          },
          contents: [{ role: 'user', parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 650, temperature: 0.45 }
        }),
        signal: AbortSignal.timeout(20000)
      });
      result = await response.json().catch(() => ({}));
      if (response.ok) break;
      const retryable = [429, 500, 502, 503, 504].includes(response.status);
      if (!retryable || attempt === 2) {
        const detail = result.error?.message || `Gemini returned ${response.status}`;
        throw new Error(detail);
      }
      await new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)));
    }
    let answer = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    let finishReason = result.candidates?.[0]?.finishReason || '';
    if (!answer) throw new Error('Gemini returned an empty answer.');

    // Some model responses stop mid-sentence. Detect likely truncation and ask once for a complete rewrite.
    const looksIncomplete = !/[.!?।]["'”’)]?\\s*$/.test(answer) || ['MAX_TOKENS', 'OTHER'].includes(finishReason);
    if (looksIncomplete) {
      const repair = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(chatModel)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are Ally, a practical, compassionate animal-welfare first-response guide. Reply in the same language as the user. Give complete, safe, actionable guidance in 6–9 short sentences. Never end mid-sentence. Keep people away from dangerous animals and recommend a vet or local rescue for serious injuries. Do not diagnose or prescribe medicine." }]
          },
          contents: [{ role: 'user', parts: [{ text: `The user's question was: "${message}". A previous draft was cut off and must not be repeated as an unfinished answer. Write a fresh, complete answer from the beginning, about 100–170 words, with a clear final sentence. Answer in natural Hindi/Hinglish if the question is in Hindi/Hinglish. Do not mention that you are rewriting anything.` }] }],
          generationConfig: { maxOutputTokens: 900, temperature: 0.3 }
        }),
        signal: AbortSignal.timeout(20000)
      });
      if (repair.ok) {
        const repaired = await repair.json().catch(() => ({}));
        const candidate = repaired.candidates?.[0];
        const full = candidate?.content?.parts?.map(part => part.text || '').join('').trim();
        if (full && /[.!?।]["'”’)]?\\s*$/.test(full)) answer = full;
      }
    }
    res.json({ answer });
  } catch (error) {
    console.error('Gemini assistant error:', error.message);
    res.status(502).json({ error: 'Ally could not get a response from the AI service after a few attempts. Please try once more in a moment.' });
  }
});

app.post('/api/create-order', async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount < 100 || amount > 10000000) return res.status(400).json({ error: 'Choose a donation between ₹1 and ₹1,00,000.' });
  if (!razorpay) return res.status(503).json({ error: 'Secure checkout is not configured yet.' });
  try {
    const order = await razorpay.orders.create({ amount, currency: 'INR', receipt: `aa_${Date.now()}`, notes: { purpose: 'Animal Allies donation' } });
    res.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error('Razorpay order error:', error.message);
    res.status(502).json({ error: 'Could not create the payment order. Please try again.' });
  }
});

app.post('/api/verify-payment', (req, res) => {
  if (!keySecret) return res.status(503).json({ error: 'Secure checkout is not configured yet.' });
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (!orderId || !paymentId || !signature) return res.status(400).json({ error: 'Missing payment verification details.' });
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  const a = Buffer.from(expected, 'hex'), b = Buffer.from(signature, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: 'Payment signature did not match.' });
  res.json({ verified: true });
});

const startServer = (port, attempt = 0) => {
  const server = app.listen(port, () => {
    console.log(`Animal Allies running at http://localhost:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      if (attempt < 9) {
        console.warn(`Port ${port} is busy; retrying on ${nextPort}...`);
        startServer(nextPort, attempt + 1);
        return;
      }
      console.error(`No available port found near ${configuredPort}. Please free a port and try again.`);
      process.exit(1);
    }
    throw error;
  });
};

startServer(configuredPort);
