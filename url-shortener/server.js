const fs = require('fs');
const path = require('path');

let urlDatabase = {};
let counter = 1000;

function generateShortCode() {
  return (counter++).toString(36);
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      if(!data) return resolve(null);
      try { resolve(JSON.parse(data)); } catch(e){ reject(e); }
    });
    req.on('error', reject);
  });
}

function getIndexHtml() {
  const file = path.join(__dirname, 'public', 'index.html');
  return fs.readFileSync(file, 'utf8');
}

module.exports = async (req, res) => {
  const url = req.url || '/';
  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    const html = getIndexHtml();
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (req.method === 'POST' && url === '/shorten') {
    try {
      const body = await parseBody(req);
      const longUrl = body && body.longUrl;
      if (!longUrl) {
        sendJSON(res, 400, { error: 'longUrl is required' });
        return;
      }
      const code = generateShortCode();
      const normalized = longUrl.startsWith('http://') || longUrl.startsWith('https://') ? longUrl : 'https://' + longUrl;
      urlDatabase[code] = { longUrl: normalized, clicks: 0, createdAt: new Date().toISOString() };
      const host = req.headers.host || 'localhost';
      const shortUrl = `${host}/${code}`;
      sendJSON(res, 201, { shortCode: code, shortUrl });
    } catch (e) {
      sendJSON(res, 400, { error: 'invalid json' });
    }
    return;
  }

  if (req.method === 'GET' && url.startsWith('/api/stats/')) {
    const code = url.replace('/api/stats/', '').replace(/\?.*$/,'');
    const data = urlDatabase[code];
    if (data) {
      sendJSON(res, 200, data);
    } else {
      sendJSON(res, 404, { error: 'not found' });
    }
    return;
  }

  if (req.method === 'GET') {
    const code = url.replace(/^\//, '').replace(/\?.*$/,'');
    if (code === 'favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    const data = urlDatabase[code];
    if (data) {
      data.clicks = (data.clicks || 0) + 1;
      res.writeHead(302, { Location: data.longUrl });
      res.end();
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
};
