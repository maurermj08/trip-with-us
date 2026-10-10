import '@fontsource/overpass/700.css';
import '@fontsource/overpass/800.css';
import '@fontsource/overpass/900.css';
import { Application } from 'pixi.js';
import { Game } from './core/Game';
import { installDebug } from './core/debug';

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
  installDebug(game);
  (window as unknown as { game: Game }).game = game;
}

void start();
