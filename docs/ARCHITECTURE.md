# Extraction Window — Architecture

Target shape for future mechanics (pattern buffer, quiet stance, beacon handshake, ion fronts). Keep the headless sim; shrink the Phaser shell.

## Layers

```mermaid
flowchart TB
  subgraph L0["L0 Content"]
    data["data/"]
    campaign["campaign/"]
  end
  subgraph L1["L1 World gen"]
    map["map/"]
  end
  subgraph L2["L2 Rules"]
    sim["sim/"]
    mech["sim/mechanics/"]
  end
  subgraph L3["L3 Headless clients"]
    ai["ai/"]
    playtest["scripts/playtest*"]
  end
  subgraph L4["L4 Presentation"]
    game["game/"]
    scenes["scenes/"]
    audio["audio/"]
  end
  map --> data
  map --> campaign
  sim --> data
  sim --> campaign
  sim --> map
  mech --> sim
  ai --> sim
  playtest --> ai
  playtest --> sim
  game --> sim
  game --> audio
  scenes --> data
  audio --> data
```

### Hard rules

1. **`sim/**` never imports Phaser, `game/`, `scenes/`, `audio/`, or `ai/`.**
2. **`data/` does not import `sim/`.**
3. **`ai/` imports only `sim` (+ `data` tables).**
4. **`game/` is the Phaser bridge** — `applyAction` + GameObjects live here (Boot texture bake excepted).
5. **Presenters call `audio/`; views do not play SFX.**
6. **Overlays read state + `lore()`; they do not mutate** — input issues `Action`s.
7. **Multi-turn systems register in `sim/mechanics/`** — `actions.ts` / `turn.ts` call the registry, not each mechanic by name.
8. **Logging stays in `sim/log.ts`** — status / mechanics / turn must not import `combat.ts` just to push a log line. Enemy death credit lives in `sim/death.ts` (`killEnemy` vs `markEnemyDead`).

## Directory map

| Path | Owns |
|------|------|
| `data/`, `campaign/`, `map/` | Content + generation |
| `sim/` | Rules, mutations, win/lose, logs |
| `sim/log.ts` | Mission log push + combat detail formatting (no combat rules) |
| `sim/spatial.ts` | Shared manhattan / entity-at queries |
| `sim/death.ts` | Enemy death: `markEnemyDead` (no credit) vs `killEnemy` (XP/drops) |
| `sim/mechanics/` | Multi-step systems (hooks into action/turn) |
| `ai/` | Headless policy over `GameState` |
| `game/` | Input, HUD/map/overlays, feedback presenters |
| `scenes/` | Boot (PNG atlas load) / Title / End + theme/atmosphere |
| `audio/` | Web Audio buses |

## Mechanic contract

```ts
export interface Mechanic {
  id: string;
  tryAction?(state: GameState, action: Action): boolean;
  onEndTurn?(state: GameState): void;
  onSectorEnter?(state: GameState): void;
  modifyFov?(state: GameState, base: number): number;
  contextHint?(state: GameState): LoreId | null;
  autopilotHint?(state: GameState): Action | null;
}
```

- Prefer reusing `exit` / `wait` / `use` / `move` with phase on `GameState` over growing the `Action` union.
- Autopilot asks `autopilotHint` before generic pathing.
- HUD hints: `ContextHints` consults mechanics first.

## Presentation split

L4 shell runs **Phaser 4** (`phaser@^4.2.1`). Field light is sim illumination → `LightView` (tint / bloom graphics), not Phaser Light2D / Filters.

`scenes/GameScene.ts` is the Phaser `Scene` host. It should shrink toward an orchestrator; logic lives in:

| Module | Role |
|--------|------|
| `game/GameHost.ts` | Shared HUD insets (`HUD_TOP`, `HUD_BOTTOM_LOG`) |
| `game/input/Keymap.ts` | Pure key → action / chrome commands (incl. `toggle_log`) |
| `game/input/InputController.ts` | Keydown switchboard (mute / overlays / log / slots / commit) |
| `game/presenters/ContextHints.ts` | State → lore hint |
| `game/presenters/ActionFeedback.ts` | SFX, flashes, move / bump tweens, action lights, causal floats |
| `game/presenters/SignalRail.ts` | Docked chip layout when the mission log is closed |
| `game/views/HudView.ts` | Bars, badges, log (when open), objective |
| `game/views/MapView.ts` | FOV frame / map chrome |
| `game/views/overlays/*` | Kit / PADD / Help panels |
| `scenes/atmosphere.ts` | Field-kit draw primitives (plates, meters, title window, menu chrome) |

**Pull-sync:** after every `applyAction`, views read `GameState`. No shadow rules in the scene. Autopilot-visible UI (`inventoryOpen`, `aimingDart`, `skillPick`, future handshake) stays on `GameState`.

## Migration

| Step | Status | Notes |
|------|--------|--------|
| PR1 — Extract `game/` views / keymap / hints | Done | Behavior-identical; playtests green |
| PR2 — `InputController` + `ActionFeedback` | Done | `onKey` → `InputController`; SFX / flashes / move tweens in `ActionFeedback` |
| PR3 — Mechanic registry + room quest behind hooks | Done | Multiroom quests + trio + scripted events |
| PR4 — First new mechanic (beacon handshake) | Done | Multi-turn sync; interrupt on leave |
| Phaser 3 → 4 | Done | `phaser@4.2.1`; no pipeline/FX rewrites; LightView unchanged |

Each step: `npm run build && npm run playtest:smoke` (full `playtest` before merge).

## Do not

- Full ECS / Redux / React HUD beside Phaser
- Animation state in `GameState`
- Meta unlocks / cross-run progression
- One-off `Action` keys per mechanic when `exit`/`wait` suffice
- Big-bang GameScene rewrite in one PR
- Import `game/` from `sim/`
