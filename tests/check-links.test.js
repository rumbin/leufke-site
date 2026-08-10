#!/usr/bin/env node
/**
 * Integration test: external link validator.
 *
 * Scans the Nikola page sources (pages/) for external http(s) URLs, then
 * checks each in a real headless browser (puppeteer-core + system Chrome),
 * exactly mimicking a human visitor. FAILS (exit != 0) if any link is
 * unreachable, returns an HTTP error, or still uses the insecure http://
 * scheme on an https-served site.
 *
 * Why a real browser instead of plain `fetch`/`curl`:
 *  - Several sites (notably hochschwarzwald.de) run bot/WAF protection that
 *    serves HTTP 403 to non-browser TLS/request fingerprints even when a
 *    browser User-Agent is set. A real headless browser passes these and gives
 *    an accurate result, matching the user's actual experience.
 *
 * Policy / tolerances:
 *  - HTTP 2xx/3xx  -> OK (redirects followed).
 *  - HTTP 403      -> WARNING (non-blocking): almost always a server bot/WAF
 *    block of the automated checker, NOT a dead link. A genuinely gone page
 *    returns 404/410/451. Surfacing 403 as a warning avoids flaky failures on
 *    real, bot-protected sites (hochschwarzwald.de) while keeping visibility.
 *  - HTTP 4xx (≠403) / 5xx -> FAIL (dead link).
 *  - Net/SSL/timeout -> FAIL (unreachable).
 *  - A URL still beginning `http://` -> FAIL (mixed content on an https site).
 *
 * Run against the source pages (no nikola build required):
 *     node check-links.test.js
 * Exit code 0 = pass, 1 = fail (at least one dead/insecure link), 2 = harness.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const PAGES_DIR = path.resolve(__dirname, '..', 'pages');
const PER_LINK_TIMEOUT_MS = 30000;

const CHROME = (() => {
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/chromium',
    process.env.CHROME_PATH,
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  console.error('X  No Chrome/Chromium found. Set CHROME_PATH.');
  process.exit(2);
})();

let browser;

async function checkWithPage(page, url) {
  // Returns {ok, warn, status, finalUrl, insecure, reason}
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: PER_LINK_TIMEOUT_MS,
  });
  if (!response) return { ok: false, warn: false, status: 'ERR', reason: 'no response' };
  const status = response.status();
  const finalUrl = response.url() || url;
  const insecure = url.startsWith('http://');
  if (insecure) return { ok: false, warn: false, status, finalUrl, insecure, reason: 'insecure http:// scheme' };
  // A link is DEAD only if the page is really gone. HTTP 403 overwhelmingly
  // means "automated checker blocked by bot/WAF protection", NOT "link broken"
  // (a real dead page returns 404/410/451). So 403 is a non-blocking warning.
  if (status === 403) return { ok: true, warn: true, status, finalUrl, reason: '403 — bot/WAF block (page may be fine, verify manually)' };
  const ok = status < 400;
  return { ok, warn: false, status, finalUrl, reason: ok ? undefined : `HTTP ${status}` };
}

(async () => {
  const urls = collectUrls();
  if (urls.size === 0) {
    console.log('No external links found in pages/ — nothing to check.');
    process.exit(0);
  }

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  let failures = 0;
  let checked = 0;
  try {
    const page = await browser.newPage();
    for (const [u, sources] of urls) {
      checked++;
      let r;
      try {
        r = await checkWithPage(page, u);
      } catch (e) {
        r = { ok: false, status: 'ERR', reason: (e.name === 'TimeoutError' ? 'timeout' : e.message) };
      }
      const srcLabel = [...sources].join(', ');
      if (r.ok) {
        if (r.warn) {
          console.log(`warn  ${r.status}  ${u}  ${r.reason}\n      <- ${srcLabel}`);
        } else {
          console.log(`ok    ${r.status}  ${u}\n      <- ${srcLabel}`);
        }
      } else {
        failures++;
        const why = r.reason ? ` (${r.reason})` : '';
        console.log(`FAIL  ${r.status}${why}  ${u}\n      <- ${srcLabel}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${checked} link(s) checked, ${failures} failed.`);
  process.exit(failures > 0 ? 1 : 0);
})();

function collectUrls() {
  const urls = new Map();
  const re = /https?:\/\/[^\s"'<>\)\]]+/g;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(rst|md|html?)$/.test(e.name)) {
        const txt = fs.readFileSync(p, 'utf8');
        let m;
        while ((m = re.exec(txt)) !== null) {
          const u = m[0].replace(/&amp;/g, '&').replace(/[.,;]+$/, '');
          if (!urls.has(u)) urls.set(u, new Set());
          urls.get(u).add(path.relative(PAGES_DIR, p));
        }
      }
    }
  };
  walk(PAGES_DIR);
  return urls;
}