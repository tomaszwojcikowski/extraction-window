/**
 * v2 slice 2 — orbit field plus combat tells (threat paints, floats, bump/death, lamp carry).
 */
import { ThemeCss } from '../scenes/theme';
import { SECTORS } from '../data/encounters';
import { applyAction, createGame, loadSector, type Action, type GameState } from '../sim';
import { flankPenalty } from '../sim/combat';
import { actionFromKey } from '../game/input/Keymap';
import { causalActionFloats } from '../game/presenters/actionFloats';
import { loadFieldAtlas } from './atlas';
import { playerLightReadout, V2Field } from './field';

const ACTION_FLOAT_MS = 1200;

const canvas = document.querySelector('#field') as HTMLCanvasElement;
const statusEl = document.querySelector('#status') as HTMLElement;
const floatsEl = document.querySelector('#floats') as HTMLElement;
const flashEl = document.querySelector('#flash') as HTMLElement;

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
  commit(action);
}

function commit(action: Action): void {
  const prevHp = state.player.hp;
  const prevEnergy = state.player.energy;
  const prevArmor = state.player.armor;
  const prevFlank = flankPenalty(state);
  const prevLogLen = state.log.length;
  const from = { x: state.player.x, y: state.player.y };
  applyAction(state, action);
  const moved = from.x !== state.player.x || from.y !== state.player.y;
  field.sync(state);
  if (action.type === 'move' && !moved) field.bumpToward(action.dx, action.dy);
  if (state.player.hp < prevHp) flashHurt();
  spawnFloats(state.log.slice(prevLogLen), {
    vitals: {
      hpDelta: state.player.hp - prevHp,
      energyDelta: state.player.energy - prevEnergy,
      armorDelta: state.player.armor - prevArmor,
    },
    flankBefore: prevFlank,
    flankAfter: flankPenalty(state),
  });
  syncHud();
}

/** Slice 1–2: move / wait / hatch — kit and PADD land in the HUD slice. */
function sliceAction(e: KeyboardEvent): Action | null {
  const action = actionFromKey(e);
  if (!action) return null;
  if (action.type === 'move' || action.type === 'wait' || action.type === 'exit') return action;
  return null;
}

function spawnFloats(
  logs: GameState['log'],
  opts: Parameters<typeof causalActionFloats>[1],
): void {
  const labels = causalActionFloats(logs, opts);
  if (labels.length === 0) return;
  const pos = field.projectTile(state.player.x, state.player.y);
  const originX = pos?.x ?? window.innerWidth / 2;
  const originY = pos?.y ?? 140;
  labels.forEach((label, i) => {
    const el = document.createElement('div');
    el.className = 'float';
    el.textContent = label.label;
    el.style.color = label.color;
    el.style.left = `${originX}px`;
    el.style.top = `${originY - 18 - i * 16}px`;
    floatsEl.appendChild(el);
    el.animate(
      [
        { transform: 'translate(-50%, 0)', opacity: 1 },
        { transform: 'translate(-50%, -22px)', opacity: 0 },
      ],
      { duration: ACTION_FLOAT_MS, easing: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)', fill: 'forwards' },
    );
    window.setTimeout(() => el.remove(), ACTION_FLOAT_MS);
  });
}

function flashHurt(): void {
  flashEl.style.background = 'rgba(192, 81, 47, 0.32)';
  flashEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
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
  root.setProperty('--rust', ThemeCss.rust);
}
