import { describe, expect, it } from 'vitest';
import { ENEMIES, type EnemyKind } from '../../src/data/enemies';
import { enemyThreatTiles, moveEnemies } from '../../src/sim/ai';
import { manhattan } from '../../src/sim/spatial';
import { hasStatus } from '../../src/sim/status';
import { combatArena, lastLog, makeEnemy } from './fixtures';

type Arena = ReturnType<typeof combatArena>;

/** Clear a straight corridor so charge distance is the only variable. */
function corridor(st: Arena, y: number, from: number, to: number): void {
  for (let x = from; x <= to; x++) {
    st.tiles[y]![x] = { kind: 'floor', walkable: true, transparent: true };
  }
}

function arenaWith(kind: EnemyKind, dist: number): { st: Arena; enemy: ReturnType<typeof makeEnemy> } {
  const st = combatArena();
  st.player.x = 5;
  st.player.y = 5;
  corridor(st, 5, 4, 12);
  const enemy = makeEnemy({ kind, x: 5 + dist, y: 5 });
  st.enemies = [enemy];
  return { st, enemy };
}

describe('hunt styles pose different questions', () => {
  it('lunge telegraphs at two tiles and closes one', () => {
    const { st, enemy } = arenaWith('serpent', 2);

    moveEnemies(st);
    expect(enemy.intent).toBe('pounce');
    expect(lastLog(st, 'LOG-TELE-POUNCE')).toBeTruthy();

    moveEnemies(st);
    expect(manhattan(enemy.x, enemy.y, st.player.x, st.player.y)).toBe(1);
    expect(hasStatus(enemy, 'stun')).toBe(false);
  });

  it('lunge cannot telegraph from three tiles out', () => {
    const { st, enemy } = arenaWith('serpent', 3);
    moveEnemies(st);
    expect(enemy.intent).toBeUndefined();
  });

  it('reach telegraphs from three tiles, so backing off does not break it', () => {
    const { st, enemy } = arenaWith('wraith', 3);

    moveEnemies(st);
    expect(enemy.intent).toBe('reach');
    expect(lastLog(st, 'LOG-TELE-REACH')).toBeTruthy();

    const hp = st.player.hp;
    moveEnemies(st);
    expect(manhattan(enemy.x, enemy.y, st.player.x, st.player.y)).toBe(1);
    expect(st.player.hp).toBeLessThan(hp);
  });

  it('a two-tile charge lands winded, giving up the next turn', () => {
    const { st, enemy } = arenaWith('wraith', 3);
    moveEnemies(st);
    moveEnemies(st);

    expect(hasStatus(enemy, 'stun')).toBe(true);
    expect(lastLog(st, 'LOG-CHARGE-WINDED')).toBeTruthy();

    // The punish window: it cannot act on the turn after overcommitting.
    const { x, y } = enemy;
    const hp = st.player.hp;
    moveEnemies(st);
    expect(enemy.x).toBe(x);
    expect(enemy.y).toBe(y);
    expect(st.player.hp).toBe(hp);
  });

  it('zone pulses without closing', () => {
    const { st, enemy } = arenaWith('rift', 2);

    moveEnemies(st);
    expect(enemy.intent).toBe('zone');
    expect(lastLog(st, 'LOG-TELE-ZONE')).toBeTruthy();

    const hp = st.player.hp;
    const { x, y } = enemy;
    moveEnemies(st);

    expect(enemy.x).toBe(x);
    expect(enemy.y).toBe(y);
    expect(st.player.hp).toBeLessThan(hp);
    expect(st.player.statuses.expose ?? 0).toBeGreaterThan(0);
    expect(lastLog(st, 'LOG-ZONE-PULSE')).toBeTruthy();
  });

  it('zone pulse fizzles when the player has left the ring', () => {
    const { st, enemy } = arenaWith('rift', 2);
    moveEnemies(st);
    expect(enemy.intent).toBe('zone');

    // Step outside the pulse radius before it resolves.
    st.player.x = enemy.x + 4;
    const hp = st.player.hp;
    moveEnemies(st);

    expect(st.player.hp).toBe(hp);
    expect(lastLog(st, 'LOG-ZONE-FIZZLE')).toBeTruthy();
  });
});

describe('declared behaviour is the behaviour that runs', () => {
  it('every sentinel-behaviour enemy that declares overwatch actually arms it', () => {
    const armed = (Object.keys(ENEMIES) as EnemyKind[]).filter((k) => ENEMIES[k].overwatch);
    expect(armed.length).toBeGreaterThan(1);

    for (const kind of armed) {
      const { st, enemy } = arenaWith(kind, 3);
      enemy.tier = 'normal';
      moveEnemies(st);
      expect(enemy.intent, `${kind} should arm overwatch`).toBe('overwatch');
    }
  });

  it('no two enemies share a glyph', () => {
    const seen = new Map<string, EnemyKind>();
    for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
      const glyph = ENEMIES[kind].glyph;
      expect(seen.has(glyph), `${kind} reuses glyph "${glyph}" from ${seen.get(glyph)}`).toBe(false);
      seen.set(glyph, kind);
    }
  });

  it('no two enemies share a colour', () => {
    const seen = new Map<number, EnemyKind>();
    for (const kind of Object.keys(ENEMIES) as EnemyKind[]) {
      const color = ENEMIES[kind].color;
      expect(seen.has(color), `${kind} reuses colour from ${seen.get(color)}`).toBe(false);
      seen.set(color, kind);
    }
  });

  it('enemies drawn with the same body plan are far apart in colour', () => {
    // Silhouette is chosen from these fields, so two kinds that agree on all of
    // them render as the same shape and colour is the only thing left to tell
    // them apart. Kinds that already look different may sit closer.
    const bodyPlan = (kind: EnemyKind): string => {
      const d = ENEMIES[kind];
      return `${d.behavior}/${d.hunt ?? ''}/${d.overwatch ? 'ow' : ''}/${d.beam ? 'beam' : ''}`;
    };
    const distance = (a: number, b: number): number =>
      Math.hypot(
        ((a >> 16) & 0xff) - ((b >> 16) & 0xff),
        ((a >> 8) & 0xff) - ((b >> 8) & 0xff),
        (a & 0xff) - (b & 0xff),
      );

    const kinds = Object.keys(ENEMIES) as EnemyKind[];
    for (let i = 0; i < kinds.length; i++) {
      for (let j = i + 1; j < kinds.length; j++) {
        const a = kinds[i]!;
        const b = kinds[j]!;
        if (bodyPlan(a) !== bodyPlan(b)) continue;
        // The two beam drones are deliberately a matched pair: same silhouette,
        // same threat, same answer. Everything else has to be separable.
        if ([a, b].every((k) => ENEMIES[k].beam)) continue;

        // An elite is meant to read as the crowned version of its base family,
        // so it only has to avoid looking like the same creature. Two kinds at
        // the same tier have nothing but colour to separate them.
        const elitePair = !ENEMIES[a].brand !== !ENEMIES[b].brand;
        const floor = elitePair ? 40 : 70;
        const gap = distance(ENEMIES[a].color, ENEMIES[b].color);
        expect(
          gap,
          `${a} and ${b} share a body plan but sit ${Math.round(gap)} apart`,
        ).toBeGreaterThan(floor);
      }
    }
  });
});

describe('threat tiles match what the resolve does', () => {
  it('reports nothing for an unarmed enemy', () => {
    const { st, enemy } = arenaWith('serpent', 2);
    expect(enemyThreatTiles(st, enemy)).toHaveLength(0);
  });

  it('covers further ground for reach than for lunge', () => {
    const lunge = arenaWith('serpent', 2);
    moveEnemies(lunge.st);
    const reach = arenaWith('wraith', 3);
    moveEnemies(reach.st);

    const spread = (st: Arena, e: ReturnType<typeof makeEnemy>): number =>
      Math.max(...enemyThreatTiles(st, e).map((t) => manhattan(t.x, t.y, e.x, e.y)));

    expect(spread(reach.st, reach.enemy)).toBeGreaterThan(spread(lunge.st, lunge.enemy));
  });

  it('only marks walkable ground', () => {
    const { st, enemy } = arenaWith('rift', 2);
    moveEnemies(st);
    for (const t of enemyThreatTiles(st, enemy)) {
      expect(st.tiles[t.y]![t.x]!.walkable).toBe(true);
    }
  });
});
