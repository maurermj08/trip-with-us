import type { Game } from './Game';
import { BRIDGE, RAMPS, ZONES, mileMarkerX } from '../world/Route';

/** ?debug=1 overlay: position readout and jump-to-section buttons (dev only). */
export function installDebug(game: Game): void {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:6px;left:6px;z-index:10;font:12px monospace;color:#fff;background:rgba(0,0,0,.45);padding:6px 8px;border-radius:8px;user-select:none;touch-action:auto';
  const info = document.createElement('div');
  el.appendChild(info);
  const jumps: [string, number][] = [
    ['home', 860], ['boxes', 5600], ['farm', 11000], ['billboard', 17000], ['puddles', 19500],
    ['duckies', ZONES.duckies[0] + 200], ['ramp', RAMPS[0].x - 1500], ['mud', 40800], ['SC', 56000],
    ['guide', 63600], ['mile1', mileMarkerX(1) - 400], ['bridge', BRIDGE.start - 600], ['charleston', 81000], ['fountain', 84300],
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
