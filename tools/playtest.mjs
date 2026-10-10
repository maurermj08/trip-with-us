// Headless play-test: drives the running dev server and saves screenshots.
//
//   npm run dev                      # in another terminal
//   npm run playtest -- <out.png> [step ...]
//
// Steps (colon separated):
//   jump:X          teleport the car to world x (skips the leave step)
//   wait:MS         wait
//   key:KEY:MS      hold a key (ArrowRight, ArrowLeft, Space, h)
//   keydown:KEY / keyup:KEY
//   tap:X:Y         click at CSS px          hold:X:Y:MS   press and hold at CSS px
//   tapw:WX:WY      click at a world point   tapcar        click the car
//   mdown:X:Y / mmove:X:Y / mup              manual drag
//   shot:FILE       screenshot now
//   pick:KEY        garage: tap a chip by key (brand:subaru, model:<id>, wheel:<id>, acc:<id>, crumb-brand)
//   go              garage: drive out to start the trip
// I95_GARAGE=1 starts in the garage (otherwise ?car=mini-countryman-2019 skips it).
// Screenshots go to playtest/ (git-ignored). The final screenshot is <out.png>.
//
// Env: I95_URL (default http://localhost:5173), I95_PAGE (e.g. lab.html), I95_QUERY (extra params),
//      I95_W / I95_H viewport (default 1024x768),
//      I95_BROWSER path to a Chromium binary (default: installed Google Chrome).
// Note: headless WebGL is software-rendered and often < 20fps; the game clamps dt to 1/20s,
// so game time runs slower than wall time. Wait longer than you would on a device.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'playtest';
mkdirSync(OUT, { recursive: true });
// The game opens in the garage; trip playtests skip it with ?car= unless I95_GARAGE is set.
const q = [process.env.I95_QUERY, !process.env.I95_PAGE && !process.env.I95_GARAGE && !/car=/.test(process.env.I95_QUERY ?? '') ? 'car=mini-countryman-2019' : ''].filter(Boolean).join('&');
const url = (process.env.I95_URL ?? 'http://localhost:5173') + '/' + (process.env.I95_PAGE ?? '') + '?debug=1' + (q ? '&' + q : '');
const [, , out = 'shot.png', ...steps] = process.argv;

const launch = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] };
if (process.env.I95_BROWSER) launch.executablePath = process.env.I95_BROWSER;
else launch.channel = 'chrome';
const browser = await chromium.launch(launch);
const page = await browser.newPage({
  viewport: { width: +(process.env.I95_W ?? 1024), height: +(process.env.I95_H ?? 768) },
  deviceScaleFactor: 1,
});
const logs = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && !m.text().includes('GL Driver') && logs.push(`${m.type()}: ${m.text()}`));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto(url);
await page.waitForFunction(() => window.game || window.lab, null, { timeout: 15000 });
await page.waitForTimeout(800);

const toScreen = (wx, wy) => page.evaluate(([x, y]) => window.game.debugToScreen(x, y), [wx, wy]);
for (const s of steps) {
  const [cmd, a, b, c] = s.split(':');
  switch (cmd) {
    case 'jump': await page.evaluate((x) => window.game.debugJump(x), +a); break;
    case 'wait': await page.waitForTimeout(+a); break;
    case 'key': await page.keyboard.down(a); await page.waitForTimeout(+b); await page.keyboard.up(a); break;
    case 'keydown': await page.keyboard.down(a); break;
    case 'keyup': await page.keyboard.up(a); break;
    case 'tap': await page.mouse.click(+a, +b); break;
    case 'hold': await page.mouse.move(+a, +b); await page.mouse.down(); await page.waitForTimeout(+c); await page.mouse.up(); break;
    case 'tapw': { const p = await toScreen(+a, +b); await page.mouse.click(p.x, p.y); break; }
    case 'tapcar': {
      const p = await page.evaluate(() => window.game.debugToScreen(window.game.car.x, -window.game.car.alt - 40));
      await page.mouse.click(p.x, p.y);
      break;
    }
    case 'pick': { const ok = await page.evaluate((k) => window.game.debugPick(k), s.slice(5)); if (!ok) console.error('no chip', s); break; }
    case 'go': await page.evaluate(() => window.game.debugGo()); break;
    case 'mdown': await page.mouse.move(+a, +b); await page.mouse.down(); break;
    case 'mmove': await page.mouse.move(+a, +b, { steps: 8 }); break;
    case 'mup': await page.mouse.up(); break;
    case 'shot': await page.screenshot({ path: join(OUT, a) }); break;
    default: console.error('unknown step', s);
  }
}
await page.screenshot({ path: join(OUT, out) });
console.log(await page.evaluate(() => (window.game ? window.game.debugInfo() : 'lab')));
if (logs.length) console.log(logs.join('\n'));
await browser.close();
