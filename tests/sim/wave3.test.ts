import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { noticeVisibleBrands } from '../../src/sim/brands';
import { killEnemy } from '../../src/sim/death';
import { collectLightSources } from '../../src/sim/light';
import { applyAllyFieldRoles } from '../../src/sim/allyAi';
import { enemyAttack } from '../../src/sim/combat';
import { useSelected } from '../../src/sim/inventory';
import { effectiveAggro } from '../../src/sim/ai';
import { combatArena, makeAlly, makeEnemy } from './fixtures';

describe('Wave 3 branded rewards', () => {
  it('tags elite families with a readable deterministic drop', () => {
    expect(ENEMIES.elite_skirmisher.brand).toBe('flarebound');
    expect(ENEMIES.elite_skirmisher.brandDrop).toBe('flare');
    expect(ENEMIES.elite_ward.brandDrop).toBe('plate');
    expect(ENEMIES.elite_apex.brandDrop).toBe('probe');
  });

  it('grants exactly one deterministic branded item on elite death', () => {
    const st = combatArena();
    st.items = [];
    const elite = makeEnemy({ kind: 'elite_ward', tier: 'elite', x: 4, y: 5 });
    st.enemies = [elite];
    killEnemy(st, elite);

    expect(st.items).toHaveLength(1);
    expect(st.items[0]?.kind).toBe('plate');
    expect(st.log.some((entry) => entry.loreId === 'LOG-BRAND-DROP')).toBe(true);
  });

  it('logs a brand tell only on first visible contact', () => {
    const st = combatArena();
    const elite = makeEnemy({ kind: 'elite_apex', tier: 'elite', x: 4, y: 5 });
    st.enemies = [elite];
    st.visible[elite.y]![elite.x] = true;

    noticeVisibleBrands(st);
    noticeVisibleBrands(st);

    expect(st.log.filter((entry) => entry.loreId === 'LOG-BRAND-SIGHT')).toHaveLength(1);
    expect(st.log[0]?.detail).toContain('SHADOWBOUND');
  });

  it('makes flarebound targets take extra flare damage and a longer stun', () => {
    const st = combatArena();
    const elite = makeEnemy({ kind: 'elite_skirmisher', x: st.player.x + 1, y: st.player.y });
    st.enemies = [elite];
    st.inventory = [{ kind: 'flare', count: 1 }];
    st.ui.selectedSlot = 0;

    expect(useSelected(st)).toBe(true);
    expect(elite.hp).toBe(elite.maxHp - 6);
    expect(elite.statuses.stun).toBe(3);
  });

  it('softens warded ion attacks and sharpens shadowbound dark aggro', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.def = 0;
    const ward = makeEnemy({ kind: 'isolinear_warden', atk: 5, x: st.player.x + 1, y: st.player.y });
    enemyAttack(st, ward, 0);
    expect(st.player.hp).toBe(16);

    const shadow = makeEnemy({ kind: 'elite_apex', x: st.player.x + 3, y: st.player.y });
    st.illumination[st.player.y]![st.player.x] = 0;
    expect(effectiveAggro(st, shadow)).toBe(ENEMIES.elite_apex.aggroRange + 1);
  });
});

describe('Wave 3 companion field roles', () => {
  it('adds a small drone lamp while the probe is alive', () => {
    const st = combatArena();
    st.allies = [makeAlly({ kind: 'probe_drone', x: 4, y: 5 })];
    expect(collectLightSources(st)).toContainEqual(
      expect.objectContaining({ x: 4, y: 5, radius: 3.2, intensity: 0.65 }),
    );
  });

  it('gives adjacent escort cover during enemy attacks', () => {
    const st = combatArena();
    st.player.hp = 20;
    st.player.def = 0;
    st.allies = [makeAlly({ kind: 'away_escort', x: st.player.x + 1, y: st.player.y })];
    const foe = makeEnemy({ kind: 'mite', x: st.player.x - 1, y: st.player.y, atk: 3 });

    enemyAttack(st, foe, 0);

    expect(st.player.hp).toBe(18);
  });

  it('interrupts one visible overwatch then begins a cooldown', () => {
    const st = combatArena();
    const drone = makeAlly({ kind: 'probe_drone', x: 4, y: 5, roleCooldown: 0 });
    const sentinel = makeEnemy({
      kind: 'sentinel',
      x: 7,
      y: 5,
      windup: 1,
      intent: 'overwatch',
    });
    st.allies = [drone];
    st.enemies = [sentinel];
    st.visible[sentinel.y]![sentinel.x] = true;

    applyAllyFieldRoles(st);

    expect(sentinel.windup).toBe(0);
    expect(sentinel.intent).toBeUndefined();
    expect(drone.roleCooldown).toBe(3);
    expect(st.log.some((entry) => entry.loreId === 'LOG-DRONE-INTERRUPT')).toBe(true);
  });
});
