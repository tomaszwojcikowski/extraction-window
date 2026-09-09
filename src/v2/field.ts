import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { floorVariantAt } from '../scenes/textures';
import { BIOME_AMBIENT, Material, Theme, floorTextureKey } from '../scenes/theme';
import { shroudRevealEase } from '../game/views/moveBlendDirty';
import { PHASER_BEAM_MS, phaserTrackMarks } from '../game/presenters/phaserTells';
import { handshakePadView } from '../game/presenters/handshakeTells';
import { collectWakeTells, wakeTellColor, wakeTellPulse } from '../game/presenters/wakeTellMarks';
import { computeShearPressure } from '../game/presenters/ShearPressure';
import { inShadow, SHADOW_THRESHOLD, tileBrightness, LIGHT_TEMP } from '../sim/light';
import { HANDSHAKE_TURNS } from '../sim/mechanics/beaconHandshake';
import { hasPhaserEquipped } from '../sim/phaser';
import type { EnemyTier, GameState, TileKind } from '../sim/types';
import type { NpcKind, AllyKind } from '../data/npcs';
import { tileTextureKey } from './tileKey';
import { createSurveyor, disposeSurveyor, poseSurveyor, setSurveyorArmed, tintSurveyor, SURVEYOR_HOP_MS } from './surveyorMesh';
import { createFauna, disposeFauna, poseFauna, tintFauna } from './faunaMesh';
import { createContact, disposeContact, poseContact, tintContact } from './contactMesh';
import { createLoot, disposeLoot, poseLoot, tintLoot } from './lootMesh';
import { createProp, disposeProp, isFieldProp, poseProp, tintProp } from './propMesh';
import { hopEase } from './poseHumanoid';
import { collectThreatMarks } from './threat';
import { wallGhostAmount, applyWallGhostMaterial, wallGhostCastsShadow } from './wallGhost';
import {
  createFieldFillLight,
  createFieldFog,
  createFieldHemi,
  createFieldKeyLight,
  placeFieldFillLight,
  placeFieldKeyLight,
} from './fieldLight';
import { markMeshShadows } from './litMaterial';
import { createSconce, disposeSconce, poseSconce, tintSconce } from './sconceMesh';
import {
  applyLocalLight,
  localLightPoses,
  MAX_POINT_LIGHTS,
  MAX_SCONCE_SPOTS,
  sconceWorldPose,
} from './fieldSources';
import type { EnemyKind } from '../data/enemies';

const FALLBACK_KEY = '__v2_fallback';
const ACTOR_HOP_MS = 250;
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
type ActorRig = 'fauna' | 'contact';

type ActorView = {
  id: number;
  kind: ActorKind;
  root: THREE.Object3D;
  rig: ActorRig;
  tileX: number;
  tileY: number;
  hop: { fromX: number; fromZ: number; toX: number; toZ: number; started: number } | null;
  dying: boolean;
  dieAt: number;
  hitUntil: number;
  hp: number;
  strideSign: number;
  windup: boolean;
};

type PropView = {
  x: number;
  y: number;
  kind: TileKind;
  root: THREE.Group;
};

type SconceView = {
  mountX: number;
  mountY: number;
  root: THREE.Group;
};

type LightBlend = {
  from: Wash[];
  to: Wash[];
  dirty: number[];
};

export type FieldMapStamp = {
  sectorIndex: number;
  tutorialActive: boolean;
  width: number;
  height: number;
};

/** Phaser rebuilds the field when the hatch (or drill bay) swaps the whole map. */
export function fieldMapStamp(
  state: Pick<GameState, 'sectorIndex' | 'tutorialActive' | 'width' | 'height'>,
): FieldMapStamp {
  return {
    sectorIndex: state.sectorIndex,
    tutorialActive: state.tutorialActive,
    width: state.width,
    height: state.height,
  };
}

export function fieldMapStale(
  drawn: FieldMapStamp,
  state: Pick<GameState, 'sectorIndex' | 'tutorialActive' | 'width' | 'height'>,
): boolean {
  return (
    drawn.sectorIndex !== state.sectorIndex ||
    drawn.tutorialActive !== state.tutorialActive ||
    drawn.width !== state.width ||
    drawn.height !== state.height
  );
}

/**
 * Slice 2 field: orbit + flood tint, plus combat tells.
 * Sim flood still owns LIT/SHADOW. Form comes from a directional key light
 * with shadows — no PointLights that would shine through walls.
 */
export class V2Field {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly world = new THREE.Group();
  private readonly threatRoot = new THREE.Group();
  private readonly phaserTrackRoot = new THREE.Group();
  private readonly beamRoot = new THREE.Group();
  private readonly wakeRoot = new THREE.Group();
  private readonly handshakeRoot = new THREE.Group();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly hemi: THREE.HemisphereLight;
  private readonly keyLight: THREE.DirectionalLight;
  private readonly fillLight: THREE.DirectionalLight;
  private readonly sconceSpots: THREE.SpotLight[] = [];
  private readonly poolPoints: THREE.PointLight[] = [];
  private atlas: Map<string, THREE.Texture>;
  private tiles: TileHandle[] = [];
  private actors = new Map<string, ActorView>();
  private items: THREE.Group[] = [];
  private props = new Map<string, PropView>();
  private sconces: SconceView[] = [];
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
  private beam: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    started: number;
  } | null = null;
  private strideSign = 1;
  private follow = { x: 0.5, z: 0.5 };
  private lightBlend: LightBlend | null = null;
  private drawnMap: FieldMapStamp = {
    sectorIndex: -1,
    tutorialActive: false,
    width: 0,
    height: 0,
  };
  private planeGeo = new THREE.PlaneGeometry(1, 1);
  private wallGeo = new RoundedBoxGeometry(1, 1.15, 1, 3, 0.08);
  private threatGeo = new THREE.PlaneGeometry(0.92, 0.92);
  private phaserTrackGeo = new THREE.PlaneGeometry(0.42, 0.42);
  private beamCoreGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 8);
  private beamGlowGeo = new THREE.CylinderGeometry(0.075, 0.075, 1, 8);
  private beamImpactGeo = new THREE.SphereGeometry(0.18, 10, 8);
  private wakeLineGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6);
  private wakeRingGeo = floorRing(0.3, 0.36);
  private wakeHaloGeo = floorRing(0.38, 0.42);
  private handshakeBaseGeo = floorRing(0.38, 0.44);
  private handshakeArcGeos = handshakeArcGeos(HANDSHAKE_TURNS);
  private readonly wakeFrom = new THREE.Vector3();
  private readonly wakeTo = new THREE.Vector3();
  private readonly beamFrom = new THREE.Vector3();
  private readonly beamTip = new THREE.Vector3();
  private readonly beamDir = new THREE.Vector3();
  private readonly beamY = new THREE.Vector3(0, 1, 0);
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
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(Theme.groundDeep, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.add(this.world);
    this.world.add(this.threatRoot);
    this.world.add(this.phaserTrackRoot);
    this.world.add(this.beamRoot);
    this.world.add(this.wakeRoot);
    this.world.add(this.handshakeRoot);
    this.scene.background = new THREE.Color(Theme.groundDeep);
    this.scene.fog = createFieldFog();

    this.hemi = createFieldHemi();
    this.keyLight = createFieldKeyLight();
    this.fillLight = createFieldFillLight();
    this.scene.add(this.hemi);
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);
    this.scene.add(this.fillLight);
    this.scene.add(this.fillLight.target);
    for (let i = 0; i < MAX_SCONCE_SPOTS; i++) {
      const spot = new THREE.SpotLight(0xffffff, 0, 3.4, 1.05, 0.55, 1.4);
      spot.castShadow = false;
      this.scene.add(spot);
      this.scene.add(spot.target);
      this.sconceSpots.push(spot);
    }
    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const point = new THREE.PointLight(0xffffff, 0, 5.6, 1.4);
      point.castShadow = false;
      this.scene.add(point);
      this.poolPoints.push(point);
    }

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    this.fitToCanvas();

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.14;
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
    this.phaserTrackGeo.rotateX(-Math.PI / 2);
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
    this.beam = null;
    this.lightBlend = null;
    this.strideSign = 1;
    this.syncActors(state, true);
    this.syncItems(state);
    this.syncProps(state);
    this.rebuildSconces(state);
    this.applyLighting(state);
    this.drawnMap = fieldMapStamp(state);
    this.followCamera(true);
  }

  /** True when the map was rebuilt (hatch / drill bay) instead of a step hop. */
  sync(state: GameState): boolean {
    this.state = state;
    if (fieldMapStale(this.drawnMap, state)) {
      this.rebuild(state);
      return true;
    }
    const hopping = this.armSurveyorHop(state);
    this.syncActors(state, false);
    this.syncItems(state);
    this.syncProps(state);
    if (hopping) this.lockLampCarry(state);
    else this.applyLighting(state);
    if (hopping) {
      this.tintOverlays(state);
      this.syncSconceVisibility(state);
    }
    return false;
  }

  /** Blocked move / melee — short yoyo along the attack axis. */
  bumpToward(dx: number, dy: number): void {
    this.bump = { dx, dy, started: performance.now() };
  }

  /** Cardinal lance from the surveyor tile to the impact tile. */
  playPhaserBeam(from: { x: number; y: number }, to: { x: number; y: number }): void {
    this.face.dx = Math.sign(to.x - from.x);
    this.face.dy = Math.sign(to.y - from.y);
    if (this.playerRig) {
      this.playerRig.rotation.y = Math.atan2(this.face.dx, this.face.dy);
    }
    this.beam = {
      fromX: from.x,
      fromY: from.y,
      toX: to.x,
      toY: to.y,
      started: performance.now(),
    };
  }

  /** True while a hop or phaser beam is in flight — field input queues one-deep. */
  isAnimating(): boolean {
    return this.hop !== null || this.beam !== null;
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
    this.syncPhaserTracks();
    this.syncWake(now);
    this.syncHandshake(now);
    this.tickBeam(now);
    this.poseOverlays(now);
    this.followCamera(false);
    this.controls.update();
    placeFieldFillLight(this.fillLight, this.camera, this.controls.target);
    this.tickWallGhost();
    this.tickLocalLights();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearWorld();
    this.controls.dispose();
    this.renderer.dispose();
    this.planeGeo.dispose();
    this.wallGeo.dispose();
    this.threatGeo.dispose();
    this.phaserTrackGeo.dispose();
    this.beamCoreGeo.dispose();
    this.beamGlowGeo.dispose();
    this.beamImpactGeo.dispose();
    this.wakeLineGeo.dispose();
    this.wakeRingGeo.dispose();
    this.wakeHaloGeo.dispose();
    this.handshakeBaseGeo.dispose();
    for (const geo of this.handshakeArcGeos) geo.dispose();
  }

  private tex(key: string): THREE.Texture {
    return this.atlas.get(key) ?? this.fallback;
  }

  private makeTileMesh(kind: TileKind, x: number, y: number, state: GameState): THREE.Mesh {
    const wall = kind === 'wall' || kind === 'sealed';
    const overlay = isFieldProp(kind);
    const geo = wall ? this.wallGeo : this.planeGeo;
    const mat = new THREE.MeshLambertMaterial({
      map: this.tex(overlay ? floorKey(state, x, y) : tileTextureKey(state, kind, x, y)),
      // Walls stay on the transparent shader so orbit cutaway opacity is not ignored.
      transparent: wall,
      depthWrite: !wall,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, wall ? 0.575 : 0, y + 0.5);
    if (wall) mesh.scale.set(1.12, 1, 1.12);
    mesh.castShadow = wall;
    // Walls in their own key shadow read as black cubes; floors still take form shadows.
    mesh.receiveShadow = !wall;
    mesh.userData = { x, y, shroud: false, litOpacity: 1, ghost: 0 };
    return mesh;
  }

  private applyLighting(state: GameState): void {
    this.lightBlend = null;
    for (const tile of this.tiles) {
      this.paintTile(tile, tileLook(state, tile.kind, tile.x, tile.y));
    }
    this.tintOverlays(state);
    this.syncSconceVisibility(state);
  }

  private paintTile(tile: TileHandle, look: TileLook): void {
    const mat = tile.mesh.material as THREE.MeshLambertMaterial;
    mat.map = this.tex(look.mapKey);
    mat.color.copy(look.color);
    tile.mesh.userData.litOpacity = look.opacity;
    tile.mesh.userData.shroud = look.shroud;
    const wall = tile.kind === 'wall' || tile.kind === 'sealed';
    if (wall) {
      applyWallGhostMaterial(mat, look.opacity, tile.mesh.userData.ghost ?? 0);
    } else {
      const transparent = look.opacity < 1;
      if (mat.transparent !== transparent) mat.needsUpdate = true;
      mat.opacity = look.opacity;
      mat.transparent = transparent;
      mat.depthWrite = look.opacity >= 1;
    }
  }

  private lockLampCarry(state: GameState): void {
    const from: Wash[] = [];
    const to: Wash[] = [];
    const dirty: number[] = [];
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i]!;
      const mat = tile.mesh.material as THREE.MeshLambertMaterial;
      const prevShroud = tile.mesh.userData.shroud === true;
      const prevLit =
        typeof tile.mesh.userData.litOpacity === 'number' ? tile.mesh.userData.litOpacity : mat.opacity;
      from.push({
        r: mat.color.r,
        g: mat.color.g,
        b: mat.color.b,
        a: prevLit,
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
      const s = lampCarryT(u, f.shroud);
      const mat = tile.mesh.material as THREE.MeshLambertMaterial;
      this.lerpFrom.setRGB(f.r, f.g, f.b);
      this.lerpTo.setRGB(d.r, d.g, d.b);
      mat.color.copy(this.lerpFrom).lerp(this.lerpTo, s);
      const lit = f.a + (d.a - f.a) * s;
      tile.mesh.userData.litOpacity = lit;
      if (tile.kind !== 'wall' && tile.kind !== 'sealed') mat.opacity = lit;
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
      show: boolean,
      hpDropped: boolean,
      died: boolean,
      fauna: { enemyKind: EnemyKind; tier: EnemyTier; windup: boolean; hp: number } | null,
      contact: NpcKind | AllyKind | null,
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
        const rig: ActorRig = fauna ? 'fauna' : 'contact';
        const root = fauna
          ? createFauna(fauna.enemyKind, fauna.tier)
          : createContact(contact ?? 'survey_contact');
        root.position.set(x + 0.5, 0, y + 0.5);
        setRenderOrder(root, 3);
        markMeshShadows(root, true, true);
        this.world.add(root);
        view = {
          id,
          kind,
          root,
          rig,
          tileX: x,
          tileY: y,
          hop: null,
          dying: false,
          dieAt: 0,
          hitUntil: 0,
          hp: fauna?.hp ?? 0,
          strideSign: 1,
          windup: fauna?.windup ?? false,
        };
        this.actors.set(key, view);
      }
      if (fauna) {
        view.hp = fauna.hp;
        view.windup = fauna.windup;
      }
      this.tintActor(view, state, x, y);
      if (hpDropped) view.hitUntil = now + HIT_FLASH_MS;
      if (!snap && (view.tileX !== x || view.tileY !== y)) {
        view.strideSign *= -1;
        view.root.rotation.y = Math.atan2(x - view.tileX, y - view.tileY);
        view.hop = {
          fromX: view.root.position.x,
          fromZ: view.root.position.z,
          toX: x + 0.5,
          toZ: y + 0.5,
          started: now,
        };
      } else if (snap || !view.hop) {
        view.root.position.set(x + 0.5, 0, y + 0.5);
      }
      view.tileX = x;
      view.tileY = y;
    };

    for (const en of state.enemies) {
      const key = this.actorKey('enemy', en.id);
      const view = this.actors.get(key);
      const wasAlive = Boolean(view && !view.dying);
      const prevHp = view?.hp ?? en.hp;
      const died = wasAlive && !en.alive;
      const hpDropped = wasAlive && en.alive && en.hp < prevHp;
      place(
        'enemy',
        en.id,
        en.x,
        en.y,
        en.alive && seen(en.x, en.y),
        hpDropped,
        died,
        { enemyKind: en.kind, tier: en.tier, windup: en.windup > 0, hp: en.hp },
        null,
      );
    }
    for (const npc of state.npcs) {
      place('npc', npc.id, npc.x, npc.y, seen(npc.x, npc.y), false, false, null, npc.kind);
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
        ally.alive && seen(ally.x, ally.y),
        false,
        wasAlive && !ally.alive,
        null,
        ally.kind,
      );
    }

    for (const key of [...this.actors.keys()]) {
      if (!live.has(key) && !this.actors.get(key)?.dying) this.dropActor(key);
    }
  }

  private tintActor(view: ActorView, state: GameState, x: number, y: number): void {
    const shade = new THREE.Color(0xffffff);
    applySimTint(shade, state, x, y);
    if (view.rig === 'fauna') tintFauna(view.root as THREE.Group, shade);
    else tintContact(view.root as THREE.Group, shade);
  }

  private dropActor(key: string): void {
    const view = this.actors.get(key);
    if (!view) return;
    this.world.remove(view.root);
    if (view.rig === 'fauna') disposeFauna(view.root as THREE.Group);
    else disposeContact(view.root as THREE.Group);
    this.actors.delete(key);
  }

  /** Returns true when a new hop started this sync. */
  private armSurveyorHop(state: GameState): boolean {
    if (!this.playerRig) {
      this.playerRig = createSurveyor();
      setRenderOrder(this.playerRig, 3);
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
    setSurveyorArmed(this.playerRig, hasPhaserEquipped(state));
    const shade = new THREE.Color(0xffffff);
    applySimTint(shade, state, x, y);
    tintSurveyor(this.playerRig, shade);
    return hopping;
  }

  private syncSurveyorPose(state: GameState, snap: boolean): void {
    if (snap) {
      if (!this.playerRig) {
        this.playerRig = createSurveyor();
        setRenderOrder(this.playerRig, 3);
        markMeshShadows(this.playerRig, true, true);
        this.world.add(this.playerRig);
      }
      this.playerRig.position.set(state.player.x + 0.5, 0, state.player.y + 0.5);
    }
    if (this.playerRig) setSurveyorArmed(this.playerRig, hasPhaserEquipped(state));
  }

  private surveyorArmed(): boolean {
    return this.state ? hasPhaserEquipped(this.state) : false;
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
        const e = hopEase(u);
        this.playerRig.position.x = this.hop.fromX + (this.hop.toX - this.hop.fromX) * e;
        this.playerRig.position.z = this.hop.fromZ + (this.hop.toZ - this.hop.fromZ) * e;
        hopT = e;
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
      poseSurveyor(this.playerRig, now, hopT, sign, this.surveyorArmed());
    }

    for (const [key, view] of [...this.actors]) {
      if (view.dying) {
        const u = Math.min(1, (now - view.dieAt) / DEATH_MS);
        const e = u * u;
        view.root.position.y = -0.45 * e;
        const base = (view.root.userData.baseScale as number) || 1;
        view.root.scale.setScalar(base * (1 - 0.55 * e));
        const rust = new THREE.Color(Theme.rust);
        if (view.rig === 'fauna') tintFauna(view.root as THREE.Group, rust);
        else tintContact(view.root as THREE.Group, rust);
        if (u >= 1) this.dropActor(key);
        continue;
      }
      let hopT: number | null = null;
      if (view.hop) {
        const u = Math.min(1, (now - view.hop.started) / ACTOR_HOP_MS);
        const e = hopEase(u);
        hopT = e;
        view.root.position.x = view.hop.fromX + (view.hop.toX - view.hop.fromX) * e;
        view.root.position.z = view.hop.fromZ + (view.hop.toZ - view.hop.fromZ) * e;
        if (u >= 1) view.hop = null;
      }
      if (view.rig === 'fauna') {
        poseFauna(view.root as THREE.Group, now, hopT, view.strideSign, view.windup);
      } else {
        poseContact(view.root as THREE.Group, now, hopT, view.strideSign);
      }
      if (this.state && now < view.hitUntil) {
        const flash = (view.hitUntil - now) / HIT_FLASH_MS;
        const shade = new THREE.Color(0xffffff);
        applySimTint(shade, this.state, view.tileX, view.tileY);
        shade.lerp(new THREE.Color(Theme.rust), 0.45 * flash);
        if (view.rig === 'fauna') tintFauna(view.root as THREE.Group, shade);
        else tintContact(view.root as THREE.Group, shade);
      }
    }
  }

  private syncThreat(now: number): void {
    if (!this.state) return;
    const marks = collectThreatMarks(this.state, Math.floor(now / 420));
    while (this.threatRoot.children.length > marks.length) {
      const mesh = this.threatRoot.children[this.threatRoot.children.length - 1] as THREE.Mesh;
      this.threatRoot.remove(mesh);
      (mesh.material as THREE.MeshLambertMaterial).dispose();
    }
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i]!;
      let mesh = this.threatRoot.children[i] as THREE.Mesh | undefined;
      if (!mesh) {
        mesh = new THREE.Mesh(
          this.threatGeo,
          new THREE.MeshLambertMaterial({
            color: mark.color,
            transparent: true,
            depthWrite: false,
          }),
        );
        mesh.receiveShadow = true;
        this.threatRoot.add(mesh);
      }
      const mat = mesh.material as THREE.MeshLambertMaterial;
      mat.color.setHex(mark.color);
      mat.opacity = Math.min(1, Math.max(mark.fill, mark.stroke * 0.45, mark.spine * 0.35));
      mesh.position.set(mark.x + 0.5, 0.04, mark.y + 0.5);
      mesh.visible = mat.opacity > 0.02;
    }
  }

  private syncPhaserTracks(): void {
    if (!this.state) return;
    const marks = phaserTrackMarks(this.state);
    while (this.phaserTrackRoot.children.length > marks.length) {
      const mesh = this.phaserTrackRoot.children[this.phaserTrackRoot.children.length - 1] as THREE.Mesh;
      this.phaserTrackRoot.remove(mesh);
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    for (let i = 0; i < marks.length; i++) {
      const mark = marks[i]!;
      let mesh = this.phaserTrackRoot.children[i] as THREE.Mesh | undefined;
      if (!mesh) {
        mesh = new THREE.Mesh(
          this.phaserTrackGeo,
          new THREE.MeshBasicMaterial({
            color: Theme.scanWash,
            transparent: true,
            depthWrite: false,
          }),
        );
        this.phaserTrackRoot.add(mesh);
      }
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (mark.role === 'target') {
        mat.color.setHex(Theme.arcWhite);
        mat.opacity = mark.live ? 0.55 : 0.18;
      } else {
        mat.color.setHex(mark.live ? Theme.scanWash : Theme.inkMute);
        mat.opacity = mark.live ? 0.28 : 0.12;
      }
      mesh.position.set(mark.x + 0.5, 0.05, mark.y + 0.5);
      mesh.visible = mat.opacity > 0.02;
    }
  }

  private tickBeam(now: number): void {
    if (!this.beam) {
      this.beamRoot.visible = false;
      return;
    }
    this.ensureBeamMeshes();
    const u = Math.min(1, (now - this.beam.started) / PHASER_BEAM_MS);
    const grow = 0.58;
    const progress = u < grow ? 1 - (1 - u / grow) ** 3 : 1;
    const fade = u < grow ? 1 : 1 - (u - grow) / (1 - grow);
    this.beamRoot.visible = fade > 0.02;

    this.beamFrom.set(this.beam.fromX + 0.5, 0.55, this.beam.fromY + 0.5);
    this.beamTip.set(this.beam.toX + 0.5, 0.55, this.beam.toY + 0.5);
    this.beamTip.lerp(this.beamFrom, 1 - progress);
    this.beamDir.subVectors(this.beamTip, this.beamFrom);
    const len = Math.max(0.08, this.beamDir.length());
    if (this.beamDir.lengthSq() < 1e-8) this.beamDir.set(0, 0, 1);
    else this.beamDir.normalize();

    const glow = this.beamRoot.getObjectByName('beamGlow') as THREE.Mesh;
    const core = this.beamRoot.getObjectByName('beamCore') as THREE.Mesh;
    const impact = this.beamRoot.getObjectByName('beamImpact') as THREE.Mesh;
    this.placeBeamSpan(glow, len, fade * 0.4);
    this.placeBeamSpan(core, len, fade * 0.95);
    impact.position.set(this.beam.toX + 0.5, 0.55, this.beam.toY + 0.5);
    const pulse = 0.7 + progress * 0.55;
    impact.scale.setScalar(pulse);
    (impact.material as THREE.MeshBasicMaterial).opacity = fade * 0.7;

    const path = cardinalBeamTiles(this.beam);
    const washCount = Math.max(1, Math.ceil(path.length * progress));
    while (this.beamRoot.children.length > 3 + washCount) {
      const mesh = this.beamRoot.children[this.beamRoot.children.length - 1] as THREE.Mesh;
      this.beamRoot.remove(mesh);
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    for (let i = 0; i < washCount; i++) {
      const tile = path[i]!;
      let mesh = this.beamRoot.children[3 + i] as THREE.Mesh | undefined;
      if (!mesh) {
        mesh = new THREE.Mesh(
          this.phaserTrackGeo,
          new THREE.MeshBasicMaterial({
            color: Theme.scanWash,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        mesh.name = 'beamWash';
        this.beamRoot.add(mesh);
      }
      (mesh.material as THREE.MeshBasicMaterial).opacity = (0.18 + progress * 0.16) * fade;
      mesh.position.set(tile.x + 0.5, 0.06, tile.y + 0.5);
    }

    if (u >= 1) {
      this.beam = null;
      this.beamRoot.visible = false;
    }
  }

  private ensureBeamMeshes(): void {
    if (this.beamRoot.getObjectByName('beamCore')) return;
    const glow = new THREE.Mesh(
      this.beamGlowGeo,
      additiveBeamMat(Theme.scanWash, 0.4),
    );
    glow.name = 'beamGlow';
    const core = new THREE.Mesh(
      this.beamCoreGeo,
      additiveBeamMat(Theme.arcWhite, 0.95),
    );
    core.name = 'beamCore';
    const impact = new THREE.Mesh(
      this.beamImpactGeo,
      additiveBeamMat(Theme.arcWhite, 0.7),
    );
    impact.name = 'beamImpact';
    this.beamRoot.add(glow, core, impact);
  }

  private placeBeamSpan(mesh: THREE.Mesh, len: number, opacity: number): void {
    mesh.position.copy(this.beamFrom).add(this.beamTip).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(this.beamY, this.beamDir);
    mesh.scale.set(1, len, 1);
    (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
  }

  private syncWake(now: number): void {
    if (!this.state) {
      this.wakeRoot.visible = false;
      return;
    }
    const px = this.state.player.x;
    const py = this.state.player.y;
    const shear = computeShearPressure(this.state);
    const { pulse } = wakeTellPulse(Math.floor(now / 420), shear);
    const tells = collectWakeTells(this.state, px, py);
    this.wakeRoot.visible = tells.length > 0;
    while (this.wakeRoot.children.length > tells.length) {
      const group = this.wakeRoot.children[this.wakeRoot.children.length - 1] as THREE.Group;
      this.dropOverlayGroup(this.wakeRoot, group);
    }
    this.wakeFrom.set(px + 0.5, 0.08, py + 0.5);
    for (let i = 0; i < tells.length; i++) {
      const tell = tells[i]!;
      let group = this.wakeRoot.children[i] as THREE.Group | undefined;
      if (!group) {
        group = this.makeWakeGroup();
        this.wakeRoot.add(group);
      }
      const color = wakeTellColor(tell.kind);
      const onFeet = tell.ex === px && tell.ey === py;
      this.wakeTo.set(tell.ex + 0.5, 0.08, tell.ey + 0.5);
      const line = group.getObjectByName('wakeLine') as THREE.Mesh;
      const ring = group.getObjectByName('wakeRing') as THREE.Mesh;
      const halo = group.getObjectByName('wakeHalo') as THREE.Mesh;
      this.beamDir.subVectors(this.wakeTo, this.wakeFrom);
      const len = this.beamDir.length();
      if (len < 0.08) {
        line.visible = false;
      } else {
        line.visible = true;
        this.beamDir.normalize();
        line.position.copy(this.wakeFrom).add(this.wakeTo).multiplyScalar(0.5);
        line.quaternion.setFromUnitVectors(this.beamY, this.beamDir);
        line.scale.set(1, len, 1);
        const lineMat = line.material as THREE.MeshBasicMaterial;
        lineMat.color.setHex(color);
        lineMat.opacity = Math.min(1, 0.42 * pulse);
      }
      const ringScale = 0.34 + 0.06 * Math.min(1.2, pulse);
      ring.position.set(tell.ex + 0.5, 0.08, tell.ey + 0.5);
      ring.scale.setScalar(ringScale / 0.33);
      halo.position.copy(ring.position);
      halo.scale.setScalar((ringScale + 0.06) / 0.4);
      const ringMat = ring.material as THREE.MeshBasicMaterial;
      const haloMat = halo.material as THREE.MeshBasicMaterial;
      ringMat.color.setHex(color);
      haloMat.color.setHex(color);
      ringMat.opacity = Math.min(1, (onFeet ? 0.95 : 0.72) * pulse);
      haloMat.opacity = Math.min(1, 0.35 * pulse);
    }
  }

  private makeWakeGroup(): THREE.Group {
    const group = new THREE.Group();
    const line = new THREE.Mesh(this.wakeLineGeo, overlayMat(Theme.scanWash, 0.4));
    line.name = 'wakeLine';
    const ring = new THREE.Mesh(this.wakeRingGeo, overlayMat(Theme.scanWash, 0.7));
    ring.name = 'wakeRing';
    const halo = new THREE.Mesh(this.wakeHaloGeo, overlayMat(Theme.scanWash, 0.35));
    halo.name = 'wakeHalo';
    group.add(line, ring, halo);
    return group;
  }

  private syncHandshake(now: number): void {
    const view = this.state ? handshakePadView(this.state, Math.floor(now / 420)) : null;
    if (!view) {
      this.handshakeRoot.visible = false;
      return;
    }
    this.ensureHandshakeMeshes(view.stages.length);
    this.handshakeRoot.visible = true;
    this.handshakeRoot.position.set(view.x + 0.5, 0.06, view.y + 0.5);
    const base = this.handshakeRoot.getObjectByName('hsBase') as THREE.Mesh;
    const baseMat = base.material as THREE.MeshBasicMaterial;
    baseMat.color.setHex(LIGHT_TEMP.beacon);
    baseMat.opacity = 0.35 * view.pulse;
    for (let i = 0; i < view.stages.length; i++) {
      const stage = view.stages[i]!;
      const mesh = this.handshakeRoot.getObjectByName(`hsArc${i}`) as THREE.Mesh;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.setHex(stage.color);
      mat.opacity = stage.alpha;
    }
  }

  private ensureHandshakeMeshes(stageCount: number): void {
    if (this.handshakeRoot.getObjectByName('hsBase')) return;
    const base = new THREE.Mesh(this.handshakeBaseGeo, overlayMat(LIGHT_TEMP.beacon, 0.35));
    base.name = 'hsBase';
    this.handshakeRoot.add(base);
    for (let i = 0; i < stageCount; i++) {
      const geo = this.handshakeArcGeos[i] ?? this.handshakeBaseGeo;
      const arc = new THREE.Mesh(geo, overlayMat(Theme.inkDim, 0.35));
      arc.name = `hsArc${i}`;
      this.handshakeRoot.add(arc);
    }
  }

  private dropOverlayGroup(parent: THREE.Group, group: THREE.Group): void {
    parent.remove(group);
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    });
  }

  private tickWallGhost(): void {
    const vis = this.visualPos();
    const cam = this.camera.position;
    for (const tile of this.tiles) {
      const wall = tile.kind === 'wall' || tile.kind === 'sealed';
      const target = wall
        ? wallGhostAmount(tile.x + 0.5, tile.y + 0.5, vis.x, vis.z, cam.x, cam.z)
        : 0;
      const prev = typeof tile.mesh.userData.ghost === 'number' ? tile.mesh.userData.ghost : 0;
      const ghost = prev + (target - prev) * 0.55;
      tile.mesh.userData.ghost = ghost;
      const lit =
        typeof tile.mesh.userData.litOpacity === 'number' ? tile.mesh.userData.litOpacity : 1;
      const mat = tile.mesh.material as THREE.MeshLambertMaterial;
      if (wall) {
        applyWallGhostMaterial(mat, lit, ghost);
        tile.mesh.castShadow = wallGhostCastsShadow(ghost);
        tile.mesh.renderOrder = ghost > 0.08 ? 2 : 0;
      } else {
        mat.opacity = lit;
      }
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
      placeFieldKeyLight(this.keyLight, vis.x, vis.z);
      return;
    }
    const dx = vis.x - this.follow.x;
    const dz = vis.z - this.follow.z;
    if (dx === 0 && dz === 0) {
      placeFieldKeyLight(this.keyLight, vis.x, vis.z);
      return;
    }
    this.follow.x = vis.x;
    this.follow.z = vis.z;
    this.controls.target.x += dx;
    this.controls.target.z += dz;
    this.camera.position.x += dx;
    this.camera.position.z += dz;
    placeFieldKeyLight(this.keyLight, vis.x, vis.z);
  }

  private rebuildSconces(state: GameState): void {
    this.dropSconces();
    for (const src of state.lightSources) {
      if (src.fixture !== 'sconce') continue;
      const mx = src.mountX ?? src.x;
      const my = src.mountY ?? src.y;
      if (state.tiles[my]?.[mx]?.kind !== 'wall') continue;
      const root = createSconce(src.color ?? 0xffc48a);
      const pose = sconceWorldPose(src);
      root.position.set(pose.x, pose.y, pose.z);
      root.rotation.y = pose.rotY;
      markMeshShadows(root, true, true);
      setRenderOrder(root, 2);
      this.world.add(root);
      this.sconces.push({ mountX: mx, mountY: my, root });
    }
    this.syncSconceVisibility(state);
  }

  private syncSconceVisibility(state: GameState): void {
    for (const view of this.sconces) {
      const explored = state.explored[view.mountY]?.[view.mountX] ?? false;
      const visible = state.visible[view.mountY]?.[view.mountX] ?? false;
      view.root.visible = explored;
      if (!explored) continue;
      const shade = new THREE.Color(visible ? 0xffffff : Theme.memoryWash);
      if (!visible) shade.multiplyScalar(0.45);
      tintSconce(view.root, shade);
    }
  }

  private tickLocalLights(): void {
    if (!this.state) return;
    const vis = this.visualPos();
    const { spots, points } = localLightPoses(this.state, vis.x, vis.z);
    for (let i = 0; i < this.sconceSpots.length; i++) {
      applyLocalLight(this.sconceSpots[i]!, spots[i] ?? null);
    }
    for (let i = 0; i < this.poolPoints.length; i++) {
      applyLocalLight(this.poolPoints[i]!, points[i] ?? null);
    }
  }

  private dropSconces(): void {
    for (const view of this.sconces) {
      this.world.remove(view.root);
      disposeSconce(view.root);
    }
    this.sconces = [];
  }

  private syncItems(state: GameState): void {
    for (const root of this.items) {
      this.world.remove(root);
      disposeLoot(root);
    }
    this.items = [];
    for (const item of state.items) {
      if (!(state.visible[item.y]?.[item.x] || state.explored[item.y]?.[item.x])) continue;
      const root = createLoot(item.kind);
      root.position.set(item.x + 0.5, 0, item.y + 0.5);
      setRenderOrder(root, 2);
      markMeshShadows(root, true, true);
      root.userData.tileX = item.x;
      root.userData.tileY = item.y;
      this.world.add(root);
      this.items.push(root);
    }
  }

  private syncProps(state: GameState): void {
    const live = new Set<string>();
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const kind = state.tiles[y]![x]!.kind;
        if (!isFieldProp(kind)) continue;
        if (!(state.visible[y]?.[x] || state.explored[y]?.[x])) continue;
        const key = `${x},${y}`;
        live.add(key);
        let view = this.props.get(key);
        if (!view || view.kind !== kind) {
          if (view) this.dropProp(key);
          const root = createProp(kind);
          if (!root) continue;
          root.position.set(x + 0.5, 0, y + 0.5);
          setRenderOrder(root, 2);
          markMeshShadows(root, true, true);
          this.world.add(root);
          view = { x, y, kind, root };
          this.props.set(key, view);
        }
      }
    }
    for (const key of [...this.props.keys()]) {
      if (!live.has(key)) this.dropProp(key);
    }
  }

  private dropProp(key: string): void {
    const view = this.props.get(key);
    if (!view) return;
    this.world.remove(view.root);
    disposeProp(view.root);
    this.props.delete(key);
  }

  private tintOverlays(state: GameState): void {
    for (const view of this.actors.values()) {
      if (view.dying) continue;
      this.tintActor(view, state, view.tileX, view.tileY);
    }
    for (const root of this.items) {
      const shade = new THREE.Color(0xffffff);
      applySimTint(shade, state, root.userData.tileX, root.userData.tileY);
      tintLoot(root, shade);
    }
    for (const view of this.props.values()) {
      const shade = new THREE.Color(0xffffff);
      applySimTint(shade, state, view.x, view.y);
      tintProp(view.root, shade);
    }
  }

  private poseOverlays(now: number): void {
    for (const root of this.items) poseLoot(root, now);
    for (const view of this.props.values()) poseProp(view.root, now);
    for (const view of this.sconces) poseSconce(view.root, now);
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
    for (const root of this.items) disposeLoot(root);
    this.items = [];
    for (const key of [...this.props.keys()]) this.dropProp(key);
    this.dropSconces();
    while (this.threatRoot.children.length) {
      const mesh = this.threatRoot.children[0] as THREE.Mesh;
      this.threatRoot.remove(mesh);
      (mesh.material as THREE.MeshLambertMaterial).dispose();
    }
    while (this.phaserTrackRoot.children.length) {
      const mesh = this.phaserTrackRoot.children[0] as THREE.Mesh;
      this.phaserTrackRoot.remove(mesh);
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    while (this.beamRoot.children.length) {
      const mesh = this.beamRoot.children[0] as THREE.Mesh;
      this.beamRoot.remove(mesh);
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
    while (this.wakeRoot.children.length) {
      this.dropOverlayGroup(this.wakeRoot, this.wakeRoot.children[0] as THREE.Group);
    }
    while (this.handshakeRoot.children.length) {
      const mesh = this.handshakeRoot.children[0] as THREE.Mesh;
      this.handshakeRoot.remove(mesh);
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
    if (this.playerRig) {
      disposeSurveyor(this.playerRig);
      this.playerRig = null;
    }
    this.hop = null;
    this.bump = null;
    this.beam = null;
    this.world.clear();
    this.world.add(this.threatRoot);
    this.world.add(this.phaserTrackRoot);
    this.world.add(this.beamRoot);
    this.world.add(this.wakeRoot);
    this.world.add(this.handshakeRoot);
  }
}

function setRenderOrder(root: THREE.Object3D, order: number): void {
  root.traverse((obj) => {
    obj.renderOrder = order;
  });
}

function additiveBeamMat(hex: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function overlayMat(hex: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function floorRing(
  inner: number,
  outer: number,
  thetaStart = 0,
  thetaLength = Math.PI * 2,
): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(inner, outer, 24, 1, thetaStart, thetaLength);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function handshakeArcGeos(stages: number): THREE.RingGeometry[] {
  const geos: THREE.RingGeometry[] = [];
  for (let i = 0; i < stages; i++) {
    const a0 = -Math.PI / 2 + (i / stages) * Math.PI * 2;
    const span = (0.72 / stages) * Math.PI * 2;
    geos.push(floorRing(0.46, 0.54, a0, span));
  }
  return geos;
}

function cardinalBeamTiles(beam: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}): { x: number; y: number }[] {
  const sx = Math.sign(beam.toX - beam.fromX);
  const sy = Math.sign(beam.toY - beam.fromY);
  const tiles: { x: number; y: number }[] = [];
  let x = beam.fromX + sx;
  let y = beam.fromY + sy;
  while (x !== beam.toX || y !== beam.toY) {
    tiles.push({ x, y });
    x += sx;
    y += sy;
  }
  tiles.push({ x: beam.toX, y: beam.toY });
  return tiles;
}

type TileLook = {
  mapKey: string;
  color: THREE.Color;
  opacity: number;
  shroud: boolean;
};

function floorKey(state: GameState, x: number, y: number): string {
  return floorTextureKey(state.sectorId, floorVariantAt(x, y, state.seed));
}

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
    mapKey: isFieldProp(kind) ? floorKey(state, x, y) : tileTextureKey(state, kind, x, y),
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
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Floor albedo so Lambert lighting still grades flood without crushing the playfield. */
export const SIM_ALBEDO_FLOOR = 0.62;
export const SIM_ALBEDO_SPAN = 0.38;

function applySimTint(color: THREE.Color, state: GameState, x: number, y: number): void {
  const visible = state.visible[y]?.[x] ?? false;
  const b = tileBrightness(state, x, y);
  // Albedo stays high — Lambert + the key/hemi do the dimming. Flood still grades LIT vs SHADOW.
  const lift = SIM_ALBEDO_FLOOR + b * SIM_ALBEDO_SPAN;
  color.setScalar(lift);
  if (b < SHADOW_THRESHOLD) color.lerp(new THREE.Color(Theme.shadowWash), 0.16);
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
  return fromShroud ? shroudRevealEase(t) : hopEase(t);
}
