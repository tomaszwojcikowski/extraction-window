import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { enemyTextureKey, npcTextureKey, allyTextureKey } from '../scenes/textures';
import { BIOME_AMBIENT, Material, Theme } from '../scenes/theme';
import { itemTextureKey } from '../game/presenters/itemTexture';
import { shroudRevealEase } from '../game/views/moveBlendDirty';
import { inShadow, SHADOW_THRESHOLD, tileBrightness } from '../sim/light';
import type { GameState, TileKind } from '../sim/types';
import { tileTextureKey } from './tileKey';
import { createSurveyor, disposeSurveyor, poseSurveyor, tintSurveyor, SURVEYOR_HOP_MS } from './surveyorMesh';
import { collectThreatMarks } from './threat';

const FALLBACK_KEY = '__v2_fallback';
const ACTOR_HOP_MS = 160;
const DEATH_MS = 220;
const COMBAT_BUMP_MS = 65;
const COMBAT_BUMP = 0.16;
const HIT_FLASH_MS = 140;

type TileHandle = {
  x: number;
  y: number;
  kind: TileKind;
  mesh: THREE.Mesh;
};

type Wash = { r: number; g: number; b: number; a: number; shroud: boolean };

type ActorKind = 'enemy' | 'npc' | 'ally';

type ActorView = {
  id: number;
  kind: ActorKind;
  sprite: THREE.Sprite;
  tileX: number;
  tileY: number;
  hop: { fromX: number; fromZ: number; toX: number; toZ: number; started: number } | null;
  dying: boolean;
  dieAt: number;
  hitUntil: number;
};

type LightBlend = {
  from: Wash[];
  to: Wash[];
  dirty: number[];
};

/**
 * Slice 2 field: orbit + flood tint, plus combat tells.
 * Lighting stays MeshBasicMaterial × sim flood — no PointLights, no bloom pass.
 */
export class V2Field {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly world = new THREE.Group();
  private readonly threatRoot = new THREE.Group();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private atlas: Map<string, THREE.Texture>;
  private tiles: TileHandle[] = [];
  private actors = new Map<string, ActorView>();
  private items: THREE.Sprite[] = [];
  private playerRig: THREE.Group | null = null;
  private lastPlayer = { x: 0, y: 0 };
  private face = { dx: 0, dy: 1 };
  private hop: {
    fromX: number;
    fromZ: number;
    toX: number;
    toZ: number;
    started: number;
    strideSign: number;
  } | null = null;
  private bump: { dx: number; dy: number; started: number } | null = null;
  private strideSign = 1;
  private follow = { x: 0.5, z: 0.5 };
  private lightBlend: LightBlend | null = null;
  private planeGeo = new THREE.PlaneGeometry(1, 1);
  private wallGeo = new THREE.BoxGeometry(1, 1.15, 1);
  private propGeo = new THREE.BoxGeometry(0.92, 0.55, 0.92);
  private threatGeo = new THREE.PlaneGeometry(0.92, 0.92);
  private state: GameState | null = null;
  private fallback: THREE.Texture;
  private readonly lerpFrom = new THREE.Color();
  private readonly lerpTo = new THREE.Color();
  private readonly projectScratch = new THREE.Vector3();
  private readonly lookScratch = new THREE.Vector3();
  private readonly pickRay = new THREE.Raycaster();
  private readonly pickNdc = new THREE.Vector2();
  private readonly pickHit = new THREE.Vector3();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly sizeScratch = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement, atlas: Map<string, THREE.Texture>) {
    this.atlas = atlas;
    this.fallback = makeFallbackTexture();
    atlas.set(FALLBACK_KEY, this.fallback);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(Theme.groundDeep, 1);

    this.scene.add(this.world);
    this.world.add(this.threatRoot);
    this.scene.background = new THREE.Color(Theme.groundDeep);
    this.scene.fog = new THREE.Fog(Theme.groundDeep, 12, 28);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.fitToCanvas();

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.minPolarAngle = Math.PI * 0.22;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 22;
    this.controls.mouseButtons.LEFT = -1 as unknown as typeof THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;

    this.planeGeo.rotateX(-Math.PI / 2);
    this.threatGeo.rotateX(-Math.PI / 2);
  }

  rebuild(state: GameState): void {
    this.state = state;
    this.clearWorld();

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const kind = state.tiles[y]![x]!.kind;
        const mesh = this.makeTileMesh(kind, x, y, state);
        this.world.add(mesh);
        this.tiles.push({ x, y, kind, mesh });
      }
    }

    this.lastPlayer = { x: state.player.x, y: state.player.y };
    this.face = { dx: 0, dy: 1 };
    this.hop = null;
    this.bump = null;
    this.lightBlend = null;
    this.strideSign = 1;
    this.syncActors(state, true);
    this.syncItems(state);
    this.applyLighting(state);
    this.followCamera(true);
  }

  sync(state: GameState): void {
    this.state = state;
    const hopping = this.armSurveyorHop(state);
    this.syncActors(state, false);
    this.syncItems(state);
    if (hopping) this.lockLampCarry(state);
    else this.applyLighting(state);
  }

  /** Blocked move / melee — short yoyo along the attack axis. */
  bumpToward(dx: number, dy: number): void {
    this.bump = { dx, dy, started: performance.now() };
  }

  /** True while the surveyor hop is in flight — field input queues one-deep. */
  isAnimating(): boolean {
    return this.hop !== null;
  }

  /** Flattened look on XZ — WASD snaps this to a grid cardinal. */
  lookXZ(): { x: number; z: number } {
    this.lookScratch.copy(this.controls.target).sub(this.camera.position);
    return { x: this.lookScratch.x, z: this.lookScratch.z };
  }

  /** Snap-yaw the orbit camera around the surveyor (radians, +Y). */
  yawBy(radians: number): void {
    const t = this.controls.target;
    const ox = this.camera.position.x - t.x;
    const oy = this.camera.position.y - t.y;
    const oz = this.camera.position.z - t.z;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    this.camera.position.set(t.x + ox * c - oz * s, t.y + oy, t.z + ox * s + oz * c);
    this.camera.lookAt(t.x, t.y, t.z);
    this.controls.update();
  }

  /** Grid cell under a canvas pointer, or null if the ray misses the deck. */
  pickTile(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pickNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.pickRay.setFromCamera(this.pickNdc, this.camera);
    const hit = this.pickRay.ray.intersectPlane(this.groundPlane, this.pickHit);
    if (!hit) return null;
    return { x: Math.floor(hit.x), y: Math.floor(hit.z) };
  }

  /** Tile center in CSS pixels for HTML floats. */
  projectTile(gx: number, gy: number, lift = 1.15): { x: number; y: number } | null {
    const canvas = this.renderer.domElement;
    this.projectScratch.set(gx + 0.5, lift, gy + 0.5).project(this.camera);
    if (this.projectScratch.z > 1) return null;
    return {
      x: (this.projectScratch.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-this.projectScratch.y * 0.5 + 0.5) * canvas.clientHeight,
    };
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Match the CSS box so a wide canvas is not a square frustum stretched by CSS. */
  fitToCanvas(): void {
    const { width, height } = canvasViewSize(this.renderer.domElement);
    this.resize(width, height);
  }

  private fitIfCanvasChanged(): void {
    const { width, height } = canvasViewSize(this.renderer.domElement);
    const prev = this.renderer.getSize(this.sizeScratch);
    if (prev.x === width && prev.y === height) return;
    this.resize(width, height);
  }

  render(): void {
    this.fitIfCanvasChanged();
    const now = performance.now();
    this.tickMotion(now);
    this.tickLampCarry();
    this.syncThreat(now);
    this.followCamera(false);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearWorld();
    this.controls.dispose();
    this.renderer.dispose();
    this.planeGeo.dispose();
    this.wallGeo.dispose();
    this.propGeo.dispose();
    this.threatGeo.dispose();
  }

  private tex(key: string): THREE.Texture {
    return this.atlas.get(key) ?? this.fallback;
  }

  private makeTileMesh(kind: TileKind, x: number, y: number, state: GameState): THREE.Mesh {
    const wall = kind === 'wall' || kind === 'sealed';
    const prop =
      kind === 'beacon' ||
      kind === 'exit' ||
      kind === 'shuttle' ||
      kind === 'landmark' ||
      kind === 'quest' ||
      kind === 'console' ||
      kind === 'rubble' ||
      kind === 'scrub' ||
      kind === 'scrub_nest';
    const geo = wall ? this.wallGeo : prop ? this.propGeo : this.planeGeo;
    const mat = new THREE.MeshBasicMaterial({
      map: this.tex(tileTextureKey(state, kind, x, y)),
      transparent: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, wall ? 0.575 : prop ? 0.275 : 0, y + 0.5);
    if (wall) mesh.scale.set(1.01, 1, 1.01);
    mesh.userData = { x, y, shroud: false };
    return mesh;
  }

  private applyLighting(state: GameState): void {
    this.lightBlend = null;
    for (const tile of this.tiles) {
      this.paintTile(tile, tileLook(state, tile.kind, tile.x, tile.y));
    }
  }

  private paintTile(tile: TileHandle, look: TileLook): void {
    const mat = tile.mesh.material as THREE.MeshBasicMaterial;
    mat.map = this.tex(look.mapKey);
    mat.color.copy(look.color);
    mat.opacity = look.opacity;
    tile.mesh.userData.shroud = look.shroud;
  }

  private lockLampCarry(state: GameState): void {
    const from: Wash[] = [];
    const to: Wash[] = [];
    const dirty: number[] = [];
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i]!;
      const mat = tile.mesh.material as THREE.MeshBasicMaterial;
      const prevShroud = tile.mesh.userData.shroud === true;
      from.push({
        r: mat.color.r,
        g: mat.color.g,
        b: mat.color.b,
        a: mat.opacity,
        shroud: prevShroud,
      });
      const look = tileLook(state, tile.kind, tile.x, tile.y);
      to.push({
        r: look.color.r,
        g: look.color.g,
        b: look.color.b,
        a: look.opacity,
        shroud: look.shroud,
      });
      mat.map = this.tex(look.mapKey);
      if (prevShroud) {
        mat.color.setHex(0xffffff);
        mat.opacity = 1;
      }
      tile.mesh.userData.shroud = look.shroud;
      const f = from[i]!;
      const d = to[i]!;
      if (f.r !== d.r || f.g !== d.g || f.b !== d.b || f.a !== d.a || f.shroud !== d.shroud) {
        dirty.push(i);
      }
    }
    this.lightBlend = { from, to, dirty };
    this.tickLampCarry();
  }

  private tickLampCarry(): void {
    const blend = this.lightBlend;
    if (!blend) return;
    const u = this.hop
      ? Math.min(1, (performance.now() - this.hop.started) / SURVEYOR_HOP_MS)
      : 1;
    for (const i of blend.dirty) {
      const tile = this.tiles[i];
      const f = blend.from[i];
      const d = blend.to[i];
      if (!tile || !f || !d) continue;
      const s = f.shroud ? shroudRevealEase(u) : u;
      const mat = tile.mesh.material as THREE.MeshBasicMaterial;
      this.lerpFrom.setRGB(f.r, f.g, f.b);
      this.lerpTo.setRGB(d.r, d.g, d.b);
      mat.color.copy(this.lerpFrom).lerp(this.lerpTo, s);
      mat.opacity = f.a + (d.a - f.a) * s;
    }
    if (u >= 1) this.lightBlend = null;
  }

  private actorKey(kind: ActorKind, id: number): string {
    return `${kind}:${id}`;
  }

  private syncActors(state: GameState, snap: boolean): void {
    const now = performance.now();
    const seen = (x: number, y: number): boolean =>
      (state.visible[y]?.[x] ?? false) || (state.explored[y]?.[x] ?? false);
    const live = new Set<string>();

    this.syncSurveyorPose(state, snap);

    const place = (
      kind: ActorKind,
      id: number,
      x: number,
      y: number,
      tex: string,
      show: boolean,
      hpDropped: boolean,
      died: boolean,
    ): void => {
      const key = this.actorKey(kind, id);
      let view = this.actors.get(key);
      if (died) {
        if (view && !view.dying) {
          view.dying = true;
          view.dieAt = now;
          view.hop = null;
        }
        if (view) live.add(key);
        return;
      }
      if (!show) {
        if (view && !view.dying) this.dropActor(key);
        return;
      }
      live.add(key);
      if (!view) {
        const spr = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: this.tex(tex), transparent: true }),
        );
        spr.scale.set(1, 1, 1);
        spr.position.set(x + 0.5, 0.85, y + 0.5);
        this.world.add(spr);
        view = {
          id,
          kind,
          sprite: spr,
          tileX: x,
          tileY: y,
          hop: null,
          dying: false,
          dieAt: 0,
          hitUntil: 0,
        };
        this.actors.set(key, view);
      }
      const mat = view.sprite.material as THREE.SpriteMaterial;
      mat.map = this.tex(tex);
      if (hpDropped) view.hitUntil = now + HIT_FLASH_MS;
      if (!snap && (view.tileX !== x || view.tileY !== y)) {
        view.hop = {
          fromX: view.sprite.position.x,
          fromZ: view.sprite.position.z,
          toX: x + 0.5,
          toZ: y + 0.5,
          started: now,
        };
      } else if (snap || !view.hop) {
        view.sprite.position.set(x + 0.5, 0.85, y + 0.5);
      }
      view.tileX = x;
      view.tileY = y;
    };

    for (const en of state.enemies) {
      const key = this.actorKey('enemy', en.id);
      const view = this.actors.get(key);
      const wasAlive = Boolean(view && !view.dying);
      const prevHp = typeof view?.sprite.userData.hp === 'number' ? view.sprite.userData.hp : en.hp;
      const died = wasAlive && !en.alive;
      const hpDropped = wasAlive && en.alive && en.hp < prevHp;
      place(
        'enemy',
        en.id,
        en.x,
        en.y,
        enemyTextureKey(en.kind, 0),
        en.alive && seen(en.x, en.y),
        hpDropped,
        died,
      );
      const next = this.actors.get(key);
      if (next && en.alive) next.sprite.userData.hp = en.hp;
    }
    for (const npc of state.npcs) {
      place('npc', npc.id, npc.x, npc.y, npcTextureKey(npc.kind, 0), seen(npc.x, npc.y), false, false);
    }
    for (const ally of state.allies) {
      const key = this.actorKey('ally', ally.id);
      const view = this.actors.get(key);
      const wasAlive = view ? !view.dying : false;
      place(
        'ally',
        ally.id,
        ally.x,
        ally.y,
        allyTextureKey(ally.kind, 0),
        ally.alive && seen(ally.x, ally.y),
        false,
        wasAlive && !ally.alive,
      );
    }

    for (const key of [...this.actors.keys()]) {
      if (!live.has(key) && !this.actors.get(key)?.dying) this.dropActor(key);
    }
  }

  private dropActor(key: string): void {
    const view = this.actors.get(key);
    if (!view) return;
    this.world.remove(view.sprite);
    (view.sprite.material as THREE.SpriteMaterial).dispose();
    this.actors.delete(key);
  }

  /** Returns true when a new hop started this sync. */
  private armSurveyorHop(state: GameState): boolean {
    if (!this.playerRig) {
      this.playerRig = createSurveyor();
      this.world.add(this.playerRig);
      this.playerRig.position.set(state.player.x + 0.5, 0, state.player.y + 0.5);
    }
    const x = state.player.x;
    const y = state.player.y;
    let hopping = false;
    if (x !== this.lastPlayer.x || y !== this.lastPlayer.y) {
      this.face.dx = x - this.lastPlayer.x;
      this.face.dy = y - this.lastPlayer.y;
      this.strideSign *= -1;
      const from = this.visualPos();
      this.hop = {
        fromX: from.x,
        fromZ: from.z,
        toX: x + 0.5,
        toZ: y + 0.5,
        started: performance.now(),
        strideSign: this.strideSign,
      };
      this.lastPlayer = { x, y };
      hopping = true;
    }
    this.playerRig.rotation.y = Math.atan2(this.face.dx, this.face.dy);
    const shade = new THREE.Color(0xffffff);
    applySimTint(shade, state, x, y);
    tintSurveyor(this.playerRig, shade);
    return hopping;
  }

  private syncSurveyorPose(state: GameState, snap: boolean): void {
    if (snap) {
      if (!this.playerRig) {
        this.playerRig = createSurveyor();
        this.world.add(this.playerRig);
      }
      this.playerRig.position.set(state.player.x + 0.5, 0, state.player.y + 0.5);
    }
  }

  private visualPos(): { x: number; z: number } {
    if (this.playerRig) {
      return { x: this.playerRig.position.x, z: this.playerRig.position.z };
    }
    const s = this.state;
    if (!s) return { x: 0.5, z: 0.5 };
    return { x: s.player.x + 0.5, z: s.player.y + 0.5 };
  }

  private tickMotion(now: number): void {
    if (this.playerRig) {
      let hopT: number | null = null;
      let sign = this.strideSign;
      let ox = 0;
      let oz = 0;
      if (this.hop) {
        const u = Math.min(1, (now - this.hop.started) / SURVEYOR_HOP_MS);
        const e = 1 - (1 - u) ** 3;
        this.playerRig.position.x = this.hop.fromX + (this.hop.toX - this.hop.fromX) * e;
        this.playerRig.position.z = this.hop.fromZ + (this.hop.toZ - this.hop.fromZ) * e;
        hopT = u;
        sign = this.hop.strideSign;
        if (u >= 1) this.hop = null;
      } else if (this.bump) {
        const u = Math.min(1, (now - this.bump.started) / COMBAT_BUMP_MS);
        const mag = Math.sin(u * Math.PI) * COMBAT_BUMP;
        ox = this.bump.dx * mag;
        oz = this.bump.dy * mag;
        const baseX = this.lastPlayer.x + 0.5;
        const baseZ = this.lastPlayer.y + 0.5;
        this.playerRig.position.x = baseX + ox;
        this.playerRig.position.z = baseZ + oz;
        if (u >= 1) {
          this.playerRig.position.x = baseX;
          this.playerRig.position.z = baseZ;
          this.bump = null;
        }
      }
      poseSurveyor(this.playerRig, now, hopT, sign);
    }

    for (const [key, view] of [...this.actors]) {
      if (view.dying) {
        const u = Math.min(1, (now - view.dieAt) / DEATH_MS);
        const e = u * u;
        view.sprite.scale.set(1 - 0.28 * e, 1 - 0.82 * e, 1);
        view.sprite.position.y = 0.85 - 0.55 * e;
        (view.sprite.material as THREE.SpriteMaterial).opacity = 1 - e;
        (view.sprite.material as THREE.SpriteMaterial).color.setHex(Theme.rust);
        if (u >= 1) this.dropActor(key);
        continue;
      }
      if (view.hop) {
        const u = Math.min(1, (now - view.hop.started) / ACTOR_HOP_MS);
        const e = 1 - (1 - u) ** 3;
        view.sprite.position.x = view.hop.fromX + (view.hop.toX - view.hop.fromX) * e;
        view.sprite.position.z = view.hop.fromZ + (view.hop.toZ - view.hop.fromZ) * e;
        if (u >= 1) view.hop = null;
      }
      const mat = view.sprite.material as THREE.SpriteMaterial;
      if (now < view.hitUntil) {
        const flash = (view.hitUntil - now) / HIT_FLASH_MS;
        mat.color.setHex(0xffffff).lerp(new THREE.Color(Theme.rust), 0.45 * flash);
      } else {
        mat.color.setHex(0xffffff);
      }
    }
  }

  private syncThreat(now: number): void {
    if (!this.state) return;
    const marks = collectThreatMarks(this.state, Math.floor(now / 420));
    while (this.threatRoot.children.length > marks.length) {
      const mesh = this.threatRoot.children[this.threatRoot.children.length - 1] as THREE.Mesh;
      this.threatRoot.remove(mesh);
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i]!;
      let mesh = this.threatRoot.children[i] as THREE.Mesh | undefined;
      if (!mesh) {
        mesh = new THREE.Mesh(
          this.threatGeo,
          new THREE.MeshBasicMaterial({
            color: mark.color,
            transparent: true,
            depthWrite: false,
          }),
        );
        this.threatRoot.add(mesh);
      }
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(mark.color);
      mat.opacity = Math.min(1, Math.max(mark.fill, mark.stroke * 0.45, mark.spine * 0.35));
      mesh.position.set(mark.x + 0.5, 0.04, mark.y + 0.5);
      mesh.visible = mat.opacity > 0.02;
    }
  }

  private followCamera(snap: boolean): void {
    const vis = this.visualPos();
    if (snap) {
      this.follow.x = vis.x;
      this.follow.z = vis.z;
      this.controls.target.set(vis.x, 0.55, vis.z);
      this.camera.position.set(vis.x + 9.5, 11, vis.z + 10.5);
      this.camera.updateProjectionMatrix();
      this.controls.update();
      return;
    }
    const dx = vis.x - this.follow.x;
    const dz = vis.z - this.follow.z;
    if (dx === 0 && dz === 0) return;
    this.follow.x = vis.x;
    this.follow.z = vis.z;
    this.controls.target.x += dx;
    this.controls.target.z += dz;
    this.camera.position.x += dx;
    this.camera.position.z += dz;
  }

  private syncItems(state: GameState): void {
    for (const spr of this.items) {
      this.world.remove(spr);
      (spr.material as THREE.SpriteMaterial).dispose();
    }
    this.items = [];
    for (const item of state.items) {
      if (!(state.visible[item.y]?.[item.x] || state.explored[item.y]?.[item.x])) continue;
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.tex(itemTextureKey(item.kind)),
          transparent: true,
        }),
      );
      spr.scale.set(0.72, 0.72, 0.72);
      spr.position.set(item.x + 0.5, 0.42, item.y + 0.5);
      this.world.add(spr);
      this.items.push(spr);
    }
  }

  private clearWorld(): void {
    this.lightBlend = null;
    for (const tile of this.tiles) {
      const mat = tile.mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
    this.tiles = [];
    for (const key of [...this.actors.keys()]) this.dropActor(key);
    for (const spr of this.items) (spr.material as THREE.SpriteMaterial).dispose();
    this.items = [];
    while (this.threatRoot.children.length) {
      const mesh = this.threatRoot.children[0] as THREE.Mesh;
      this.threatRoot.remove(mesh);
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    if (this.playerRig) {
      disposeSurveyor(this.playerRig);
      this.playerRig = null;
    }
    this.hop = null;
    this.bump = null;
    this.world.clear();
    this.world.add(this.threatRoot);
  }
}

type TileLook = {
  mapKey: string;
  color: THREE.Color;
  opacity: number;
  shroud: boolean;
};

function tileLook(state: GameState, kind: TileKind, x: number, y: number): TileLook {
  const explored = state.explored[y]?.[x] ?? false;
  const visible = state.visible[y]?.[x] ?? false;
  if (!explored) {
    return {
      mapKey: 't_fog',
      color: new THREE.Color(0xffffff),
      opacity: 1,
      shroud: true,
    };
  }
  const color = new THREE.Color(0xffffff);
  applySimTint(color, state, x, y);
  return {
    mapKey: tileTextureKey(state, kind, x, y),
    color,
    opacity: visible ? 1 : 0.42,
    shroud: false,
  };
}

function makeFallbackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = `#${Material.rock.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 8, 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function applySimTint(color: THREE.Color, state: GameState, x: number, y: number): void {
  const visible = state.visible[y]?.[x] ?? false;
  const b = tileBrightness(state, x, y);
  const lift = 0.1 + b * 0.9;
  color.setScalar(lift);
  if (b < SHADOW_THRESHOLD) color.lerp(new THREE.Color(Theme.shadowWash), 0.32);
  const biome = new THREE.Color(BIOME_AMBIENT[state.sectorId].tint);
  if (visible) color.lerp(biome, 0.1);
  else color.lerp(new THREE.Color(Theme.memoryWash), 0.5);
}

/** CSS-pixel size the camera frustum must match, or a wide canvas stretches the orbit view. */
export function canvasViewSize(el: { clientWidth: number; clientHeight: number }): {
  width: number;
  height: number;
} {
  return {
    width: Math.max(1, el.clientWidth),
    height: Math.max(1, el.clientHeight),
  };
}

export function playerLightReadout(state: GameState): {
  brightness: number;
  band: 'LIT' | 'SHADOW';
} {
  const brightness = tileBrightness(state, state.player.x, state.player.y);
  return {
    brightness,
    band: inShadow(state, state.player.x, state.player.y) ? 'SHADOW' : 'LIT',
  };
}

/** Hop wash progress — linear, or quadratic when revealing FOW. */
export function lampCarryT(u: number, fromShroud: boolean): number {
  const t = Math.min(1, Math.max(0, u));
  return fromShroud ? shroudRevealEase(t) : t;
}
