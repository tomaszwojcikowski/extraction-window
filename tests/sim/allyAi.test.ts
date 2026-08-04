import { describe, expect, it } from 'vitest';
import { lore } from '../../src/data/lore';
import { ALLIES } from '../../src/data/npcs';
import { ENEMIES } from '../../src/data/enemies';
import {
  applyAllyDamage,
  moveAllies,
  tryEnemyMeleePreferPlayer,
} from '../../src/sim/allyAi';
import { combatArena, lastLog, makeAlly, makeEnemy } from './fixtures';

describe('applyAllyDamage', () => {
  it('logs source → ally detail and downs at 0 hp', () => {
    const st = combatArena();
    const ally = makeAlly({ kind: 'probe_drone', hp: 3, maxHp: 8 });
    st.allies = [ally];
    applyAllyDamage(st, ally, 4, { source: 'EM Mite' });
    expect(ally.alive).toBe(false);
    expect(lastLog(st, 'LOG-ALLY-HURT')?.detail).toMatch(/^EM Mite → /);
    expect(lastLog(st, 'LOG-ALLY-DOWN')?.detail).toBe(lore(ALLIES.probe_drone.loreName));
  });
});

describe('moveAllies', () => {
  it('melees adjacent foe with named hit log; no player XP on kill', () => {
    const st = combatArena();
    st.player.x = 1;
    st.player.y = 1;
    const ally = makeAlly({
      kind: 'probe_drone',
      x: 5,
      y: 5,
      atk: 10,
      turnsLeft: 10,
    });
    const foe = makeEnemy({ kind: 'mite', x: 6, y: 5, hp: 2, maxHp: 3, def: 0 });
    st.allies = [ally];
    st.enemies = [foe];
    // Keep path clear
    st.tiles[5]![5]!.walkable = true;
    st.tiles[5]![6]!.walkable = true;
    const xp = st.xp;
    moveAllies(st);
    expect(foe.alive).toBe(false);
    expect(st.xp).toBe(xp);
    expect(st.log.some((l) => l.loreId === 'LOG-ALLY-HIT')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-ALLY-KILL')).toBe(true);
    expect(st.log.some((l) => l.loreId === 'LOG-KILL')).toBe(false);
  });

  it('expires when turnsLeft hits zero', () => {
    const st = combatArena();
    const ally = makeAlly({ turnsLeft: 1, x: 3, y: 3 });
    st.allies = [ally];
    st.enemies = [];
    moveAllies(st);
    expect(ally.alive).toBe(false);
    expect(lastLog(st, 'LOG-ALLY-EXPIRE')?.detail).toBe(lore(ALLIES.probe_drone.loreName));
  });
});

describe('tryEnemyMeleePreferPlayer', () => {
  it('attacks player when adjacent', () => {
    const st = combatArena();
    st.player.x = 5;
    st.player.y = 5;
    const foe = makeEnemy({ x: 6, y: 5 });
    let hitPlayer = false;
    const acted = tryEnemyMeleePreferPlayer(st, foe, () => {
      hitPlayer = true;
      return true;
    });
    expect(acted).toBe(true);
    expect(hitPlayer).toBe(true);
  });

  it('strikes adjacent ally when player is out of melee', () => {
    const st = combatArena();
    st.player.x = 1;
    st.player.y = 1;
    const ally = makeAlly({ kind: 'away_escort', x: 6, y: 5, hp: 12, maxHp: 12 });
    const foe = makeEnemy({ kind: 'mite', x: 5, y: 5, atk: 3 });
    st.allies = [ally];
    st.enemies = [foe];
    const acted = tryEnemyMeleePreferPlayer(st, foe, () => false);
    expect(acted).toBe(true);
    expect(ally.hp).toBeLessThan(12);
    expect(lastLog(st, 'LOG-ALLY-HURT')?.detail).toContain(lore(ENEMIES.mite.loreName));
  });
});
