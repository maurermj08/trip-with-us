import '@fontsource/overpass/700.css';
import '@fontsource/overpass/800.css';
import '@fontsource/overpass/900.css';
import { Application } from 'pixi.js';
import { Game } from './core/Game';
import { installDebug } from './core/debug';
import { art } from './vehicle/art/registry';
import { defaultChoice } from './vehicle/art/schema';

async function loadFonts(): Promise<void> {
  const fonts = ['700 32px Overpass', '800 32px Overpass', '900 32px Overpass'];
  await Promise.race([
    Promise.all(fonts.map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

async function start(): Promise<void> {
  await loadFonts();
  const app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    background: 0x6fb8f0,
    powerPreference: 'high-performance',
  });
  document.body.appendChild(app.canvas);
  const game = new Game(app);
  // ?car=<vehicle-id> picks the vehicle directly (debug / playtests).
  // Without it, every visit starts in the garage.
  const carId = new URLSearchParams(location.search).get('car');
  const fallback = art.vehicles.get('mini-countryman-2019') ?? [...art.vehicles.values()][0];
  if (carId && art.vehicles.get(carId)) await game.start(defaultChoice(art.vehicles.get(carId)!));
  else game.openGarage(defaultChoice(fallback));
  installDebug(game);
  (window as unknown as { game: Game }).game = game;
}

void start();
