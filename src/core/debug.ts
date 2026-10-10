import type { Game } from './Game';
import { AIRPORTS, BRIDGES, CITIES, GREET_X, RAMPS, ROUTE, ZONES, mileMarkerX } from '../world/Route';

/** ?debug=1 overlay: position readout and jump-to-section buttons (dev only). */
export function installDebug(game: Game): void {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:6px;left:6px;z-index:10;font:12px monospace;color:#fff;background:rgba(0,0,0,.45);padding:6px 8px;border-radius:8px;user-select:none;touch-action:auto';
  const info = document.createElement('div');
  el.appendChild(info);
  // Generated from the trip data so new cities, bridges and airports show up automatically.
  const welcome = (st: string) => ROUTE.find((p) => p.kind === 'welcome' && p.state === st)!.x - 600;
  const jumps: [string, number][] = [
    ['home', 860], ['farm', 11000], ['duckies', ZONES.duckies[0] + 200], ['ramp', RAMPS[0].x - 1500], ['SC', welcome('SC')],
    ...BRIDGES.map((b): [string, number] => [b.id, b.start - 600]),
    ...CITIES.map((c): [string, number] => [c.id, c.x0 + 600]),
    ...AIRPORTS.map((a): [string, number] => [`airport-${a.id}`, a.x0 - 600]),
    ['GA', welcome('GA')], ['FL', welcome('FL')],
    ['I-4', ROUTE.find((p) => p.kind === 'shield' && p.shield === '4')!.x - 600],
    ['mile50', mileMarkerX(50) - 400], ['mile1', mileMarkerX(1) - 400], ['greet', GREET_X - 1200],
  ];
  const row = document.createElement('div');
  for (const [name, x] of jumps) {
    const b = document.createElement('button');
    b.textContent = name;
    b.style.cssText = 'margin:2px;font:11px monospace';
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      game.debugJump(x);
    });
    row.appendChild(b);
  }
  el.appendChild(row);
  document.body.appendChild(el);
  const tick = () => {
    info.textContent = game.debugInfo();
    requestAnimationFrame(tick);
  };
  tick();
}
