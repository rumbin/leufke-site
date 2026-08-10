#!/usr/bin/env node
/**
 * Integration test: carousel slide heights must not jump.
 *
 * A Bootstrap carousel sizes its container to the active slide's image.
 * If the images inside a carousel have different aspect ratios, the
 * rendered height changes from slide to slide, "jumping" the content
 * below the carousel — a visible layout bug.
 *
 * This test:
 *   1. Loads every rendered page under output/.
 *   2. Finds every carousel (.carousel / #myCarousel).
 *   3. Cycles through each slide and records the carousel's rendered height.
 *   4. FAILS if the heights vary by more than CAROUSEL_HEIGHT_TOLERANCE px.
 *
 * Run against the local Nikola output (deterministic, no live server):
 *     node tests/carousel-heights.test.js
 *
 * Exit code 0 = pass, 1 = fail. Intended to be wired into CI after `nikola build`.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// A few px of tolerance absorbs JPEG rounding (e.g. 760 vs 761) while still
// catching a real aspect-ratio jump (the bug here is ~58px).
const CAROUSEL_HEIGHT_TOLERANCE = 3;

// Path to a system Chrome/Chromium binary.
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

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

(async () => {
  const outputDir = path.resolve(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    console.error(`X  No output/ dir. Run \`nikola build\` first. (looked at ${outputDir})`);
    process.exit(2);
  }
  const pages = walk(outputDir);
  console.log(`Loaded ${pages.length} rendered pages from output/`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  let failures = 0;
  let checked = 0;

  try {
    const page = await browser.newPage();
    for (const file of pages) {
      const url = 'file://' + file;
      await page.goto(url, { waitUntil: 'networkidle0' });
      const result = await page.evaluate(() => {
        const cars = Array.from(document.querySelectorAll('.carousel'));
        return cars.map((carousel, carIdx) => {
          const items = Array.from(carousel.querySelectorAll('.item'));
          const heights = [];
          // Measure each slide independently (force active, measure, measure the
          // container's natural height).
          items.forEach((item, i) => {
            items.forEach((it) => it.classList.remove('active'));
            item.classList.add('active');
            heights.push(carousel.offsetHeight);
          });
          // restore
          items.forEach((it, i) => it.classList.toggle('active', i === 0));
          return { carousel: carIdx, slides: items.length, heights };
        });
      });

      for (const car of result) {
        checked++;
        if (car.slides === 0) continue;
        const min = Math.min(...car.heights);
        const max = Math.max(...car.heights);
        const jump = max - min;
        const pageRel = path.relative(outputDir, file);
        if (jump > CAROUSEL_HEIGHT_TOLERANCE) {
          failures++;
          console.log(
            `FAIL  ${pageRel}  carousel#${car.carousel}  heights=[${car.heights.join(', ')}]  `
              + `jump=${jump}px (>${CAROUSEL_HEIGHT_TOLERANCE}px)`
          );
        } else {
          console.log(
            `ok    ${pageRel}  carousel#${car.carousel}  ${car.slides} slides  `
              + `{min=${min}px max=${max}px jump=${jump}px}`
          );
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(
    `\n${checked} carousel(s) checked, ${failures} failed.`
  );
  process.exit(failures > 0 ? 1 : 0);
})();