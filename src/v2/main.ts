/**
 * v2 slice 1 — playable Three.js field over the same sim as v1.
 * Constrained orbit camera, honest flood tint, WASD hops. No Phaser, no bloom.
 */
import { ThemeCss } from '../scenes/theme';
import { SECTORS } from '../data/encounters';
import { applyAction, createGame, loadSector, type Action, type GameState } from '../sim';
import { actionFromKey } from '../game/input/Keymap';
import { loadFieldAtlas } from './atlas';
import { playerLightReadout, V2Field } from './field';

const canvas = document.querySelector('#field') as HTMLCanvasElement;
const statusEl = document.querySelector('#status') as HTMLElement;

paintCssVars();

const params = new URLSearchParams(window.location.search);
let seed = Number(params.get('seed'));
if (!Number.isFinite(seed) || seed <= 0) seed = 42;
let state: GameState = createGame(seed, { skipTutorial: true });
const sectorParam = Number(params.get('sector'));
if (Number.isFinite(sectorParam) && sectorParam > 0) {
  loadSector(state, Math.min(SECTORS.length - 1, Math.floor(sectorParam)));
}

const atlas = await loadFieldAtlas();
const field = new V2Field(canvas, atlas);
field.rebuild(state);
syncHud();
resize();

window.addEventListener('resize', resize);
window.addEventListener('keydown', onKey);

function tick(): void {
  field.render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function resize(): void {
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(240, window.innerHeight);
  canvas.width = w;
  canvas.height = h;
  field.resize(w, h);
}

function onKey(e: KeyboardEvent): void {
  if (e.key === ']' || e.key === '}') {
    loadSector(state, (state.sectorIndex + 1) % SECTORS.length);
    field.rebuild(state);
    writeUrl();
    syncHud();
    return;
  }
  if (e.key === '[' || e.key === '{') {
    loadSector(state, (state.sectorIndex + SECTORS.length - 1) % SECTORS.length);
    field.rebuild(state);
    writeUrl();
    syncHud();
    return;
  }
  if (e.key === 'r' || e.key === 'R') {
    seed = (Date.now() % 100000) + 1;
    state = createGame(seed, { skipTutorial: true });
    field.rebuild(state);
    writeUrl();
    syncHud();
    return;
  }

  const action = sliceAction(e);
  if (!action) return;
  e.preventDefault();
  applyAction(state, action);
  field.sync(state);
  syncHud();
}

/** Slice 1: move / wait / hatch only — kit and PADD land in a later HUD slice. */
function sliceAction(e: KeyboardEvent): Action | null {
  const action = actionFromKey(e);
  if (!action) return null;
  if (action.type === 'move' || action.type === 'wait' || action.type === 'exit') return action;
  return null;
}

function syncHud(): void {
  const light = playerLightReadout(state);
  const pct = Math.round(light.brightness * 100);
  statusEl.textContent = [
    `seed ${seed}`,
    `${state.sectorId} ${state.sectorIndex + 1}/${SECTORS.length}`,
    `turn ${state.turn}`,
    `sim ${light.band} ${pct}%`,
    'flood matches gameplay',
  ].join(' · ');
}

function writeUrl(): void {
  const next = new URL(window.location.href);
  next.searchParams.set('seed', String(seed));
  next.searchParams.set('sector', String(state.sectorIndex));
  history.replaceState(null, '', next);
}

function paintCssVars(): void {
  const root = document.documentElement.style;
  root.setProperty('--ground-deep', ThemeCss.groundDeep);
  root.setProperty('--panel', ThemeCss.panel);
  root.setProperty('--ink', ThemeCss.ink);
  root.setProperty('--ink-dim', ThemeCss.inkDim);
  root.setProperty('--ink-mute', ThemeCss.inkMute);
  root.setProperty('--tape', ThemeCss.tape);
  root.setProperty('--safe', ThemeCss.safe);
}
