/**
 * v2 slice 5 — orbit field, HTML HUD, title / end / audio, and splice overlay.
 */
import { ThemeCss } from '../scenes/theme';
import { SECTORS } from '../data/encounters';
import { lore } from '../data/lore';
import { applyAction, createGame, loadSector, type Action, type GameState } from '../sim';
import { forceOpenHackLab } from '../sim/mechanics/consoleHack';
import { flankPenalty } from '../sim/combat';
import { ambient, music, sfx } from '../audio';
import { causalActionFloats } from '../game/presenters/actionFloats';
import { playActionSfx, playEnemyMotionSfx, type EnemySnap } from '../game/presenters/actionSfx';
import { computeShearPressure } from '../game/presenters/ShearPressure';
import { loadFieldAtlas } from './atlas';
import { playerLightReadout, V2Field } from './field';
import { bindHud, hudSnapshot, paintHud, type HudChrome } from './hud';
import { fieldLocked, routeV2Key, type V2ChromeKind, type V2InputHost } from './input';
import {
  bindMenu,
  endSnapshot,
  hideMenu,
  paintMenu,
  routeEndKey,
  routeTitleKey,
  titleModalBody,
  titleSnapshot,
  type TitleChrome,
} from './menu';
import { stepToward } from './screenMove';

const ACTION_FLOAT_MS = 1200;

type Screen = 'title' | 'play' | 'end';

const canvas = document.querySelector('#field') as HTMLCanvasElement;
const floatsEl = document.querySelector('#floats') as HTMLElement;
const flashEl = document.querySelector('#flash') as HTMLElement;
const hudEls = bindHud(document);
const menuEls = bindMenu(document);

paintCssVars();

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const deepLink = Number.isFinite(seedParam) && seedParam > 0;
const hackLab = params.get('hack') === '1';
let seed = deepLink ? seedParam : (Date.now() % 90000) + 1000;
let state: GameState = createGame(seed, { skipTutorial: true });
const sectorParam = Number(params.get('sector'));
if (deepLink && Number.isFinite(sectorParam) && sectorParam > 0) {
  loadSector(state, Math.min(SECTORS.length - 1, Math.floor(sectorParam)));
}
if (hackLab) forceOpenHackLab(state);

const chrome: HudChrome = { helpOpen: false, pagesOpen: false, logOpen: false };
const titleChrome: TitleChrome = { helpOpen: false, changelogOpen: false };
let queued: Action | null = null;
let screen: Screen = deepLink ? 'play' : 'title';
let muteHintUntil = 0;
let audioPrimed = false;
let field: V2Field | null = null;

document.body.dataset.screen = screen;

const atlasReady = loadFieldAtlas();
bindPointer(canvas);
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
new ResizeObserver(resize).observe(canvas);
window.addEventListener('keydown', onKey);
requestAnimationFrame(tick);

if (deepLink) {
  const atlas = await atlasReady;
  field = new V2Field(canvas, atlas);
  field.rebuild(state);
  resize();
  enterPlay(false);
} else {
  enterTitle();
  void atlasReady;
}

function tick(): void {
  field?.render();
  if (screen === 'play' && queued && field && !field.isAnimating()) {
    const next = queued;
    queued = null;
    commit(next);
  }
  requestAnimationFrame(tick);
}

function resize(): void {
  field?.fitToCanvas();
}

function hostNow(): V2InputHost {
  const look = field?.lookXZ() ?? { x: 0, z: -1 };
  return {
    helpOpen: chrome.helpOpen,
    pagesOpen: chrome.pagesOpen,
    logOpen: chrome.logOpen,
    animating: field?.isAnimating() ?? false,
    lookX: look.x,
    lookZ: look.z,
  };
}

function onKey(e: KeyboardEvent): void {
  sfx.unlock();
  music.prefetch();
  if (screen === 'title') {
    handleTitleKey(e);
    return;
  }
  if (screen === 'end') {
    handleEndKey(e);
    return;
  }
  const cmd = routeV2Key(e, state, hostNow());
  if (cmd.type === 'noop') return;
  e.preventDefault();
  switch (cmd.type) {
    case 'debug_sector': {
      const len = SECTORS.length;
      loadSector(state, (state.sectorIndex + cmd.dir + len) % len);
      field?.rebuild(state);
      writeUrl();
      syncHud();
      syncFieldAudio();
      sfx.play('ui');
      return;
    }
    case 'debug_reseed':
      bootPlay((Date.now() % 100000) + 1, true);
      return;
    case 'yaw':
      field?.yawBy((cmd.dir * Math.PI) / 2);
      return;
    case 'mute':
      toggleMute();
      return;
    case 'chrome':
      queued = null;
      setChrome(cmd.key, cmd.force);
      sfx.play('ui');
      syncHud();
      return;
    case 'ui':
      queued = null;
      applyUi(cmd.action);
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

function handleTitleKey(e: KeyboardEvent): void {
  const cmd = routeTitleKey(e, titleChrome);
  if (cmd.type === 'noop') return;
  e.preventDefault();
  switch (cmd.type) {
    case 'mute':
      toggleMute();
      paintTitle();
      return;
    case 'help':
      titleChrome.helpOpen = cmd.force;
      if (cmd.force) titleChrome.changelogOpen = false;
      primeTitleAudio();
      sfx.play('ui');
      paintTitle();
      return;
    case 'changelog':
      titleChrome.changelogOpen = cmd.force;
      if (cmd.force) titleChrome.helpOpen = false;
      primeTitleAudio();
      sfx.play('ui');
      paintTitle();
      return;
    case 'seed':
      seed = (seed + cmd.delta + 100000) % 100000;
      primeTitleAudio();
      sfx.play('ui');
      paintTitle();
      return;
    case 'seed_random':
      seed = Math.floor(Math.random() * 100000);
      primeTitleAudio();
      sfx.play('ui');
      paintTitle();
      return;
    case 'start':
      primeTitleAudio();
      sfx.play('start');
      void bootPlay(seed, false);
      return;
  }
}

function handleEndKey(e: KeyboardEvent): void {
  const cmd = routeEndKey(e);
  if (cmd.type === 'noop') return;
  e.preventDefault();
  if (cmd.type === 'mute') {
    toggleMute();
    paintEnd();
    return;
  }
  if (cmd.type === 'retry') {
    sfx.play('start');
    void bootPlay((state.seed + 1) % 100000, false);
    return;
  }
  sfx.play('ui');
  enterTitle();
}

function setChrome(key: V2ChromeKind, force?: boolean): void {
  if (key === 'pages' && chrome.helpOpen) chrome.helpOpen = false;
  const fieldKey = key === 'help' ? 'helpOpen' : key === 'pages' ? 'pagesOpen' : 'logOpen';
  if (force === undefined) chrome[fieldKey] = !chrome[fieldKey];
  else chrome[fieldKey] = force;
}

function applyUi(action: Action): void {
  const prev = capturePrev(action);
  applyAction(state, action);
  field?.sync(state);
  if (action.type === 'use' || action.type === 'move' || action.type === 'close_ui') {
    playActionSfx(state, prev, flashTint);
  } else {
    sfx.play('ui');
  }
  syncHud();
}

function commit(action: Action): void {
  const prev = capturePrev(action);
  const prevEnergy = state.player.energy;
  const prevArmor = state.player.armor;
  const prevFlank = flankPenalty(state);
  const enemies = snapEnemies(state);
  applyAction(state, action);
  const moved = prev.fromPlayer.x !== state.player.x || prev.fromPlayer.y !== state.player.y;
  field?.sync(state);
  if (action.type === 'move' && !moved) field?.bumpToward(action.dx, action.dy);
  if (state.player.hp < prev.prevHp) flashTint(0xc0512f, 0.32);
  playActionSfx(state, prev, flashTint);
  playEnemyMotionSfx(
    state,
    enemies,
    state.log.slice(prev.prevLogLen).map((l) => l.loreId),
  );
  spawnFloats(state.log.slice(prev.prevLogLen), {
    vitals: {
      hpDelta: state.player.hp - prev.prevHp,
      energyDelta: state.player.energy - prevEnergy,
      armorDelta: state.player.armor - prevArmor,
    },
    flankBefore: prevFlank,
    flankAfter: flankPenalty(state),
  });
  if (state.status !== 'playing') {
    enterEnd();
    return;
  }
  syncHud();
  syncFieldAudio();
}

function capturePrev(action: Action) {
  return {
    action,
    prevSector: state.sectorIndex,
    prevHp: state.player.hp,
    prevLogLen: state.log.length,
    prevAlive: state.enemies.filter((en) => en.alive).length,
    fromPlayer: { x: state.player.x, y: state.player.y },
  };
}

function snapEnemies(st: GameState): EnemySnap[] {
  return st.enemies.map((en) => ({
    id: en.id,
    x: en.x,
    y: en.y,
    hp: en.hp,
    alive: en.alive,
    kind: en.kind,
  }));
}

async function bootPlay(nextSeed: number, skipTutorial: boolean): Promise<void> {
  seed = nextSeed;
  state = createGame(seed, { skipTutorial });
  if (hackLab) forceOpenHackLab(state);
  chrome.helpOpen = false;
  chrome.pagesOpen = false;
  chrome.logOpen = false;
  titleChrome.helpOpen = false;
  titleChrome.changelogOpen = false;
  queued = null;
  const atlas = await atlasReady;
  if (!field) field = new V2Field(canvas, atlas);
  field.rebuild(state);
  resize();
  writeUrl();
  enterPlay(true);
}

function enterPlay(fromMenu: boolean): void {
  screen = 'play';
  document.body.dataset.screen = 'play';
  hideMenu(menuEls);
  if (fromMenu) {
    music.stop();
    audioPrimed = false;
  }
  syncHud();
  syncFieldAudio(true);
}

function enterTitle(): void {
  screen = 'title';
  document.body.dataset.screen = 'title';
  titleChrome.helpOpen = false;
  titleChrome.changelogOpen = false;
  queued = null;
  audioPrimed = false;
  music.stop();
  ambient.stop();
  hideHudModal();
  paintTitle();
}

function enterEnd(): void {
  screen = 'end';
  document.body.dataset.screen = 'end';
  queued = null;
  chrome.helpOpen = false;
  chrome.pagesOpen = false;
  chrome.logOpen = false;
  hideHudModal();
  ambient.stop();
  const won = state.status === 'won';
  music.setMood(won ? 'end_win' : 'end_lose');
  sfx.play(won ? 'win' : 'lose');
  paintEnd();
}

function paintTitle(): void {
  const modal = titleModalBody(titleChrome);
  const accent = modal.kind === 'help' ? ThemeCss.biolum : ThemeCss.tape;
  paintMenu(menuEls, titleSnapshot(seed, sfx.isMuted()), modal.kind);
  paintOverlayModal(modal.kind === 'none' ? null : { kind: modal.kind, body: modal.body, accent });
}

function paintEnd(): void {
  paintMenu(menuEls, endSnapshot(state, sfx.isMuted()), 'none');
}

function hideHudModal(): void {
  hudEls.modal.hidden = true;
  hudEls.modalBody.hidden = false;
  hudEls.hackBoard.hidden = true;
  hudEls.hackBoard.replaceChildren();
}

function paintOverlayModal(
  spec: { kind: string; body: string; accent: string } | null,
): void {
  if (!spec) {
    hideHudModal();
    return;
  }
  hudEls.modal.hidden = false;
  hudEls.modal.dataset.kind = spec.kind;
  hudEls.modal.style.setProperty('--accent', spec.accent);
  hudEls.modalBody.hidden = false;
  hudEls.hackBoard.hidden = true;
  hudEls.hackBoard.replaceChildren();
  hudEls.modalBody.textContent = spec.body;
}

function primeTitleAudio(): void {
  if (audioPrimed || sfx.isMuted()) return;
  audioPrimed = true;
  ambient.startTitle();
  music.setMood('title');
}

function toggleMute(): void {
  const muted = sfx.toggleMute();
  muteHintUntil = performance.now() + 900;
  if (muted) {
    ambient.stop();
    music.stop();
    audioPrimed = false;
  } else if (screen === 'title') {
    primeTitleAudio();
  } else if (screen === 'end') {
    music.setMood(state.status === 'won' ? 'end_win' : 'end_lose');
  } else {
    syncFieldAudio(true);
  }
  if (screen === 'play') syncHud();
}

function threatNearby(st: GameState): boolean {
  const px = st.player.x;
  const py = st.player.y;
  return st.enemies.some((e) => {
    if (!e.alive) return false;
    const d = Math.abs(e.x - px) + Math.abs(e.y - py);
    if (d <= 4) return true;
    if (e.alerted && (st.visible[e.y]?.[e.x] ?? false) && d <= 8) return true;
    return false;
  });
}

function syncFieldAudio(force = false): void {
  if (screen !== 'play') return;
  if (sfx.isMuted()) {
    ambient.stop();
    music.stop();
    return;
  }
  sfx.unlock();
  ambient.startSector(state.sectorId);
  void force;
  const shear = computeShearPressure(state);
  music.syncField({
    sectorId: state.sectorId,
    sectorIndex: state.sectorIndex,
    playerEnergy: state.player.energy,
    maxEnergy: state.player.maxEnergy,
    inCombat: threatNearby(state),
    shearState: shear.state,
    ionFrontTurns: state.ionFrontTurns,
  });
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
    if (screen !== 'play' || !field) return;
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
  if (labels.length === 0 || !field) return;
  const pos = field.projectTile(state.player.x, state.player.y);
  const originX = pos?.x ?? window.innerWidth / 2;
  const originY = pos?.y ?? 140;
  labels.forEach((label, i) => {
    const node = document.createElement('div');
    node.className = 'float';
    node.textContent = label.label;
    node.style.color = label.color;
    node.style.left = `${originX}px`;
    node.style.top = `${originY - 18 - i * 16}px`;
    floatsEl.appendChild(node);
    node.animate(
      [
        { transform: 'translate(-50%, 0)', opacity: 1 },
        { transform: 'translate(-50%, -22px)', opacity: 0 },
      ],
      { duration: ACTION_FLOAT_MS, easing: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)', fill: 'forwards' },
    );
    window.setTimeout(() => node.remove(), ACTION_FLOAT_MS);
  });
}

function flashTint(color: number, alpha: number): void {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  flashEl.style.background = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  flashEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
}

function syncHud(): void {
  const light = playerLightReadout(state);
  const pct = Math.round(light.brightness * 100);
  const debug = [`v2`, `turn ${state.turn}`, `sim ${light.band} ${pct}%`].join(' · ');
  const snap = hudSnapshot(state, chrome);
  if (performance.now() < muteHintUntil) {
    snap.hint = sfx.isMuted() ? lore('UI-MUTE-ON') : lore('UI-MUTE-OFF');
  }
  paintHud(hudEls, snap, debug);
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
