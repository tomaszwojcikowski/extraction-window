/**
 * v2 slice 3 — orbit field plus HTML HUD (bars, kit, PADD, help, log).
 */
import { ThemeCss } from '../scenes/theme';
import { SECTORS } from '../data/encounters';
import { applyAction, createGame, loadSector, type Action, type GameState } from '../sim';
import { flankPenalty } from '../sim/combat';
import { causalActionFloats } from '../game/presenters/actionFloats';
import { loadFieldAtlas } from './atlas';
import { playerLightReadout, V2Field } from './field';
import { bindHud, hudSnapshot, paintHud, type HudChrome } from './hud';
import { fieldLocked, routeV2Key, type V2ChromeKind, type V2InputHost } from './input';
import { stepToward } from './screenMove';

const ACTION_FLOAT_MS = 1200;

const canvas = document.querySelector('#field') as HTMLCanvasElement;
const floatsEl = document.querySelector('#floats') as HTMLElement;
const flashEl = document.querySelector('#flash') as HTMLElement;
const hudEls = bindHud(document);

paintCssVars();

const params = new URLSearchParams(window.location.search);
let seed = Number(params.get('seed'));
if (!Number.isFinite(seed) || seed <= 0) seed = 42;
let state: GameState = createGame(seed, { skipTutorial: true });
const sectorParam = Number(params.get('sector'));
if (Number.isFinite(sectorParam) && sectorParam > 0) {
  loadSector(state, Math.min(SECTORS.length - 1, Math.floor(sectorParam)));
}

const chrome: HudChrome = { helpOpen: false, pagesOpen: false, logOpen: false };
let queued: Action | null = null;

const atlas = await loadFieldAtlas();
const field = new V2Field(canvas, atlas);
field.rebuild(state);
syncHud();
resize();

window.addEventListener('resize', resize);
window.addEventListener('keydown', onKey);
bindPointer(canvas);

function tick(): void {
  field.render();
  if (queued && !field.isAnimating()) {
    const next = queued;
    queued = null;
    commit(next);
  }
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

function hostNow(): V2InputHost {
  const look = field.lookXZ();
  return {
    helpOpen: chrome.helpOpen,
    pagesOpen: chrome.pagesOpen,
    logOpen: chrome.logOpen,
    animating: field.isAnimating(),
    lookX: look.x,
    lookZ: look.z,
  };
}

function onKey(e: KeyboardEvent): void {
  const cmd = routeV2Key(e, state, hostNow());
  if (cmd.type === 'noop') return;
  e.preventDefault();
  switch (cmd.type) {
    case 'debug_sector': {
      const len = SECTORS.length;
      loadSector(state, (state.sectorIndex + cmd.dir + len) % len);
      field.rebuild(state);
      writeUrl();
      syncHud();
      return;
    }
    case 'debug_reseed':
      seed = (Date.now() % 100000) + 1;
      state = createGame(seed, { skipTutorial: true });
      chrome.helpOpen = false;
      chrome.pagesOpen = false;
      chrome.logOpen = false;
      queued = null;
      field.rebuild(state);
      writeUrl();
      syncHud();
      return;
    case 'yaw':
      field.yawBy((cmd.dir * Math.PI) / 2);
      return;
    case 'chrome':
      queued = null;
      setChrome(cmd.key, cmd.force);
      syncHud();
      return;
    case 'ui':
      queued = null;
      applyAction(state, cmd.action);
      field.sync(state);
      syncHud();
      return;
    case 'queue':
      queued = cmd.action;
      return;
    case 'turn':
      queued = null;
      commit(cmd.action);
      return;
  }
}

function setChrome(key: V2ChromeKind, force?: boolean): void {
  if (key === 'pages' && chrome.helpOpen) chrome.helpOpen = false;
  const field = key === 'help' ? 'helpOpen' : key === 'pages' ? 'pagesOpen' : 'logOpen';
  if (force === undefined) chrome[field] = !chrome[field];
  else chrome[field] = force;
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

function bindPointer(el: HTMLCanvasElement): void {
  let down: { x: number; y: number; button: number } | null = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button === 2) el.style.cursor = 'grabbing';
    down = { x: e.clientX, y: e.clientY, button: e.button };
  });
  el.addEventListener('pointerup', (e) => {
    el.style.cursor = '';
    const start = down;
    down = null;
    if (!start || start.button !== 0 || e.button !== 0) return;
    if (fieldLocked(state, hostNow())) return;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (dist > 6) return;
    const tile = field.pickTile(e.clientX, e.clientY);
    if (!tile) return;
    const step = stepToward(state.player.x, state.player.y, tile.x, tile.y);
    if (!step) return;
    commit({ type: 'move', dx: step.dx, dy: step.dy });
  });
  el.addEventListener('pointerleave', () => {
    el.style.cursor = '';
    down = null;
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
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
  const debug = [
    `v2`,
    `turn ${state.turn}`,
    `sim ${light.band} ${pct}%`,
  ].join(' · ');
  paintHud(hudEls, hudSnapshot(state, chrome), debug);
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
  root.setProperty('--ink-bright', ThemeCss.inkBright);
  root.setProperty('--ink-dim', ThemeCss.inkDim);
  root.setProperty('--ink-mute', ThemeCss.inkMute);
  root.setProperty('--tape', ThemeCss.tape);
  root.setProperty('--safe', ThemeCss.safe);
  root.setProperty('--rust', ThemeCss.rust);
  root.setProperty('--flag', ThemeCss.flag);
  root.setProperty('--biolum', ThemeCss.biolum);
  root.setProperty('--hint-bg', ThemeCss.hintBg);
}
