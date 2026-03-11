import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import Stripe from 'stripe';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;

// Load .env manually
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  // GET /api/config — return publishable key
  if (req.method === 'GET' && urlPath === '/api/config') {
    return jsonRes(res, 200, { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
  }

  // POST /api/create-checkout-session
  if (req.method === 'POST' && urlPath === '/api/create-checkout-session') {
    try {
      const { items } = await readBody(req);
      if (!items || !items.length) return jsonRes(res, 400, { error: 'No items provided' });

      const origin = `http://localhost:${PORT}`;
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: items.map(item => ({
          price_data: {
            currency: 'usd',
            unit_amount: item.price,
            product_data: { name: `${item.brand} ${item.name}` },
          },
          quantity: item.qty,
        })),
        success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout.html`,
      });

      return jsonRes(res, 200, { url: session.url });
    } catch (err) {
      console.error('Stripe error:', err.message);
      return jsonRes(res, 500, { error: err.message });
    }
  }

  // Static files
  const filePath = urlPath === '/' ? '/index.html' : urlPath;
  const fullPath = join(__dirname, filePath);
  const ext = extname(fullPath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const data = await readFile(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`VoltFlow server running at http://localhost:${PORT}`);
});
