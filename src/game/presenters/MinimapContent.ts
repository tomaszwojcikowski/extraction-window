import { Theme } from '../../scenes/theme';
import { describeObjective } from '../../sim/objectives';
import { activeQuestStep } from '../../sim/roomQuest';
import { cacheRoomList } from '../../sim/cacheSurvey';
import type { GameState } from '../../sim/types';

/** Inner map canvas size. Supports maps up to 64×64. */
export const MINIMAP_MAP = 128;
/** Map cell size in pixels, capped so large maps still fit. */
export const MINIMAP_CELL = 2;

export type MinimapDot = {
  x: number;
  y: number;
  color: number;
  alpha: number;
};

export type MinimapRing = {
  x: number;
  y: number;
  color: number;
};

export type MinimapSketch = {
  width: number;
  height: number;
  cells: MinimapDot[];
  pips: MinimapDot[];
  rings: MinimapRing[];
};

/** Local next-step cell for the minimap ring — seen, or revealed by Nav Ping. */
export function minimapGoalPos(state: GameState): { x: number; y: number } | null {
  const pos = describeObjective(state).pos;
  if (!pos) return null;
  if (state.player.mapperTurns > 0) return pos;
  if (state.explored[pos.y]?.[pos.x] || state.visible[pos.y]?.[pos.x]) return pos;
  return null;
}

export function minimapCellMetrics(width: number, height: number): {
  cellW: number;
  cellH: number;
  offX: number;
  offY: number;
} {
  const cellW = Math.min(MINIMAP_CELL, Math.floor(MINIMAP_MAP / width));
  const cellH = Math.min(MINIMAP_CELL, Math.floor(MINIMAP_MAP / height));
  return {
    cellW,
    cellH,
    offX: Math.floor((MINIMAP_MAP - width * cellW) / 2),
    offY: Math.floor((MINIMAP_MAP - height * cellH) / 2),
  };
}

/**
 * Phaser-free field-sketch marks. v1 Graphics and the v2 canvas both paint this.
 */
export function minimapSketch(state: GameState): MinimapSketch {
  const { tiles, explored, visible, width, height, enemies, player } = state;
  const cells: MinimapDot[] = [];
  const pips: MinimapDot[] = [];
  const rings: MinimapRing[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!explored[y]![x]) continue;
      const kind = tiles[y]![x]!.kind;
      const isVisible = visible[y]![x];
      let color: number;
      if (kind === 'wall' || kind === 'sealed') {
        color = isVisible ? Theme.panelEdge : Theme.memory;
      } else if (kind === 'exit' || kind === 'beacon' || kind === 'shuttle') {
        color = Theme.tape;
      } else if (kind === 'quest' || kind === 'console') {
        color = Theme.flag;
      } else if (kind === 'sump' || kind === 'vent' || kind === 'hazard') {
        color = isVisible ? Theme.arc : Theme.memory;
      } else {
        color = isVisible ? Theme.inkDim : Theme.memory;
      }
      cells.push({ x, y, color, alpha: isVisible ? 1 : 0.6 });
    }
  }

  const rq = state.roomQuest;
  if (rq && !rq.done) {
    const step = activeQuestStep(rq);
    if (step && explored[step.pos.y]?.[step.pos.x]) {
      pips.push({ x: step.pos.x, y: step.pos.y, color: Theme.flag, alpha: 1 });
    }
  }

  for (const room of cacheRoomList(state)) {
    if (room.cacheLooted) continue;
    if (!explored[room.cy]?.[room.cx]) continue;
    pips.push({ x: room.cx, y: room.cy, color: Theme.tape, alpha: 0.95 });
  }

  pips.push({ x: player.x, y: player.y, color: Theme.flag, alpha: 1 });

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    if (!explored[enemy.y]?.[enemy.x]) continue;
    const onScreen = visible[enemy.y]![enemy.x];
    const elite = enemy.tier === 'elite' || enemy.tier === 'boss';
    if (!onScreen && !elite) continue;
    pips.push({
      x: enemy.x,
      y: enemy.y,
      color: elite ? Theme.arcWhite : Theme.rust,
      alpha: onScreen ? 1 : 0.7,
    });
  }

  if (state.mapperPing) {
    const { x, y } = state.mapperPing;
    if (explored[y]?.[x]) rings.push({ x, y, color: Theme.tape });
  }

  const goal = minimapGoalPos(state);
  if (goal) rings.push({ x: goal.x, y: goal.y, color: Theme.flag });

  return { width, height, cells, pips, rings };
}
