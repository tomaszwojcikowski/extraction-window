import { lore } from '../../data/lore';
import { extractTrack, type GameState } from '../../sim';
import { armorDefBonus, flankPenalty, toolAtkBonus } from '../../sim/combat';
import { EM_HIGH, EM_WARN } from '../../sim/emStress';
import { FAVOR_LABEL } from '../../sim/extractFavor';
import { encumbered, fieldPosition, playerHudStance } from '../../sim/stance';
import { hasStatus, statusHud } from '../../sim/status';
import { Theme } from '../../scenes/theme';
import { lightBadgeSpec } from './HudBadges';

export type HudChip = { label: string; fill: number };

export function formatExtractBoxes(state: GameState): string {
  const boxes = extractTrack(state);
  const pad = boxes.pad || Boolean(state.uplink?.active);
  const cell = (on: boolean) => (on ? '#' : '-');
  return `${lore('UI-EXTRACT')} ${cell(boxes.key)}${cell(boxes.handshake)}${cell(boxes.lattice)}${cell(pad)}`;
}

export function formatPositionWord(state: GameState): string {
  const pos = fieldPosition(flankPenalty(state), hasStatus(state.player, 'expose'));
  if (pos === 'desperate') return lore('UI-POS-DESPERATE');
  if (pos === 'risky') return lore('UI-POS-RISKY');
  return '';
}

/** Combat/EM + active timers. Position only when not Controlled. Stance chips own Enhanced/Impaired. */
export function formatHudMeta(state: GameState, opts?: { shearPrimary?: boolean }): string {
  const shearPrimary = opts?.shearPrimary ?? false;
  const stance = playerHudStance(state);
  const atkBonus = toolAtkBonus(state);
  const defBonus = armorDefBonus(state);
  const flanked = flankPenalty(state);
  const defPart = `${state.player.def}${defBonus ? `+${defBonus}` : ''}${flanked ? `−${flanked}` : ''}`;
  const posWord = formatPositionWord(state);
  const downed = (state.player.statuses.downed ?? 0) > 0;
  const atkPart =
    !downed && stance === 'normal'
      ? `${lore('UI-ATK')} ${state.player.atk}${atkBonus ? `+${atkBonus}` : ''}`
      : '';
  const probe = state.player.probeTurns > 0 ? `Probe ${state.player.probeTurns}` : '';
  const stim = state.player.stimTurns > 0 ? `Stim ${state.player.stimTurns}` : '';
  const filter = state.player.filterTurns > 0 ? `Filter ${state.player.filterTurns}` : '';
  const desync =
    state.patternDesync > 0 ? `Desync ${state.patternDesync} · Power Cell` : '';
  const allyRole = state.allies.some((a) => a.alive && a.kind === 'probe_drone')
    ? lore('UI-ALLY-DRONE')
    : state.allies.some(
          (a) =>
            a.alive &&
            a.kind === 'away_escort' &&
            Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y) === 1,
        )
      ? lore('UI-ALLY-ESCORT')
      : '';
  const sysBits = [probe, stim, filter, desync, allyRole].filter(Boolean);
  const systems = sysBits.length ? ` · ${sysBits.join(' · ')}` : '';
  const statuses = statusHud(state.player.statuses);
  const statusLine = statuses ? ` · ${statuses}` : '';
  let emPart = '';
  if (state.emStress >= EM_HIGH) emPart = ` · EM CRIT ${state.emStress}`;
  else if (state.emStress >= EM_WARN) emPart = ` · EM WARN ${state.emStress}`;
  else if (!shearPrimary) emPart = ` · ${lore('UI-EM')} ${state.emStress}`;
  return [
    `${lore('UI-LEVEL')} ${state.level}`,
    posWord,
    atkPart,
    `${lore('UI-DEF')} ${defPart}`,
  ]
    .filter(Boolean)
    .join('  ')
    .concat(emPart, systems, statusLine);
}

/**
 * Signal-rail chips. Extract boxes replace KEY/CORE/BEACON OPEN.
 * Enhanced/Impaired is this bump (adjacent helpless foe wins).
 */
export function fieldHudChips(state: GameState): HudChip[] {
  const chips: HudChip[] = [];
  const downed = state.player.statuses.downed ?? 0;
  if (downed > 0) chips.push({ label: `${lore('UI-DOWNED')} ${downed}`, fill: Theme.rust });

  const light = lightBadgeSpec(state);
  if (light) chips.push(light);

  if (!state.tutorialActive) {
    chips.push({ label: formatExtractBoxes(state), fill: Theme.flag });
  }

  const stance = playerHudStance(state);
  if (downed === 0) {
    if (stance === 'enhanced') chips.push({ label: lore('UI-STANCE-ENHANCED'), fill: Theme.safe });
    else if (stance === 'impaired') chips.push({ label: lore('UI-STANCE-IMPAIRED'), fill: Theme.rust });
  }

  if (encumbered(state)) chips.push({ label: lore('UI-ENCUMBERED'), fill: Theme.tape });
  if (state.keepCalmCooldown > 0) {
    chips.push({ label: `${lore('UI-FRITZ')} ${state.keepCalmCooldown}`, fill: Theme.arc });
  }

  if (state.ionFrontTurns > 0) {
    chips.push({
      label:
        state.ionFrontTurns <= 1
          ? lore('UI-FRONT-CLEARING')
          : `${lore('UI-ION-FRONT')} ${state.ionFrontTurns}`,
      fill: state.ionFrontTurns <= 1 ? Theme.inkMute : Theme.rust,
    });
  }
  if (state.player.mapperTurns > 0) {
    chips.push({ label: `${lore('UI-MAPPER')} ${state.player.mapperTurns}`, fill: Theme.tape });
  }
  if (state.roomQuest && !state.roomQuest.done) {
    const n = state.roomQuest.steps.length;
    const i = state.roomQuest.stepIndex + 1;
    chips.push({
      label: n > 1 ? `${lore('UI-QUEST-BADGE')} ${i}/${n}` : lore('UI-QUEST-BADGE'),
      fill: Theme.tape,
    });
  }
  if (state.extractFavor) {
    chips.push({ label: FAVOR_LABEL[state.extractFavor.kind], fill: Theme.safe });
  }
  if (state.handshake?.active) {
    chips.push({
      label: `${lore('UI-HANDSHAKE')} ${state.handshake.progress}/2`,
      fill: Theme.safe,
    });
  }
  if (state.uplink?.active) {
    chips.push({
      label: `${lore('UI-UPLINK')} ${state.uplink.progress}/3`,
      fill: Theme.arc,
    });
    if (state.uplink.progress === 1 && !state.uplink.repelled) {
      chips.push({ label: lore('UI-WAVE-NEXT'), fill: Theme.rust });
    }
  }
  if (state.codexPages > 0) {
    chips.push({ label: `${lore('UI-CODEX')} ${state.codexPages}`, fill: Theme.inkMute });
  }
  return chips;
}
