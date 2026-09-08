import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { enemyTextureKey, npcTextureKey, allyTextureKey } from '../scenes/textures';
import { BIOME_AMBIENT, Material, Theme } from '../scenes/theme';
import { itemTextureKey } from '../game/presenters/itemTexture';
import { inShadow, SHADOW_THRESHOLD, tileBrightness } from '../sim/light';
import type { GameState, TileKind } from '../sim/types';
import { tileTextureKey } from './tileKey';
import { createSurveyor, disposeSurveyor, poseSurveyor, tintSurveyor, SURVEYOR_HOP_MS } from './surveyorMesh';

const FALLBACK_KEY = '__v2_fallback';

type TileHandle = {
  x: number;
  y: number;
  kind: TileKind;
  mesh: THREE.Mesh;
};

/**
 * Slice 1 field: constrained 3/4 orbit, extruded tiles, hop stride.
 * Lighting is MeshBasicMaterial × sim flood — no PointLights, no bloom pass.
 */
export class V2Field {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly world = new THREE.Group();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private atlas: Map<string, THREE.Texture>;
  private tiles: TileHandle[] = [];
  private actors: THREE.Sprite[] = [];
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
  private strideSign = 1;
  private follow = { x: 0.5, z: 0.5 };
  private planeGeo = new THREE.PlaneGeometry(1, 1);
  private wallGeo = new THREE.BoxGeometry(1, 1.15, 1);
  private propGeo = new THREE.BoxGeometry(0.92, 0.55, 0.92);
  private state: GameState | null = null;
  private fallback: THREE.Texture;

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
    this.scene.background = new THREE.Color(Theme.groundDeep);
    this.scene.fog = new THREE.Fog(Theme.groundDeep, 12, 28);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.minPolarAngle = Math.PI * 0.22;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 22;

    this.planeGeo.rotateX(-Math.PI / 2);
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
    this.strideSign = 1;
    this.syncActors(state);
    this.syncItems(state);
    this.syncLighting(state);
    this.followCamera(true);
  }

  sync(state: GameState): void {
    this.state = state;
    this.syncActors(state);
    this.syncItems(state);
    this.syncLighting(state);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    const now = performance.now();
    this.tickMotion(now);
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
    mesh.userData = { x, y };
    return mesh;
  }

  private syncLighting(state: GameState): void {
    for (const tile of this.tiles) {
      const mat = tile.mesh.material as THREE.MeshBasicMaterial;
      const explored = state.explored[tile.y]?.[tile.x] ?? false;
      const visible = state.visible[tile.y]?.[tile.x] ?? false;
      if (!explored) {
        mat.map = this.tex('t_fog');
        mat.color.setHex(0xffffff);
        mat.opacity = 1;
        continue;
      }
      mat.map = this.tex(tileTextureKey(state, tile.kind, tile.x, tile.y));
      applySimTint(mat.color, state, tile.x, tile.y);
      mat.opacity = visible ? 1 : 0.42;
    }
  }

  private syncActors(state: GameState): void {
    for (const spr of this.actors) {
      this.world.remove(spr);
      (spr.material as THREE.SpriteMaterial).dispose();
    }
    this.actors = [];
    const spawn = (key: string, x: number, y: number, show: boolean): void => {
      if (!show) return;
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.tex(key),
          transparent: true,
        }),
      );
      spr.scale.set(1, 1, 1);
      spr.position.set(x + 0.5, 0.85, y + 0.5);
      this.world.add(spr);
      this.actors.push(spr);
    };
    const seen = (x: number, y: number): boolean =>
      (state.visible[y]?.[x] ?? false) || (state.explored[y]?.[x] ?? false);

    this.syncSurveyor(state);
    for (const en of state.enemies) {
      if (!en.alive) continue;
      spawn(enemyTextureKey(en.kind, 0), en.x, en.y, seen(en.x, en.y));
    }
    for (const npc of state.npcs) {
      spawn(npcTextureKey(npc.kind, 0), npc.x, npc.y, seen(npc.x, npc.y));
    }
    for (const ally of state.allies) {
      if (!ally.alive) continue;
      spawn(allyTextureKey(ally.kind, 0), ally.x, ally.y, seen(ally.x, ally.y));
    }
  }

  private syncSurveyor(state: GameState): void {
    if (!this.playerRig) {
      this.playerRig = createSurveyor();
      this.world.add(this.playerRig);
      this.playerRig.position.set(state.player.x + 0.5, 0, state.player.y + 0.5);
    }
    const x = state.player.x;
    const y = state.player.y;
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
    }
    this.playerRig.rotation.y = Math.atan2(this.face.dx, this.face.dy);
    const shade = new THREE.Color(0xffffff);
    applySimTint(shade, state, x, y);
    tintSurveyor(this.playerRig, shade);
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
    if (!this.playerRig) return;
    let hopT: number | null = null;
    let sign = this.strideSign;
    if (this.hop) {
      const u = Math.min(1, (now - this.hop.started) / SURVEYOR_HOP_MS);
      const e = 1 - (1 - u) ** 3;
      this.playerRig.position.x = this.hop.fromX + (this.hop.toX - this.hop.fromX) * e;
      this.playerRig.position.z = this.hop.fromZ + (this.hop.toZ - this.hop.fromZ) * e;
      hopT = u;
      sign = this.hop.strideSign;
      if (u >= 1) this.hop = null;
    }
    poseSurveyor(this.playerRig, now, hopT, sign);
  }

  /**
   * Keep the orbit offset while the surveyor hops — translate camera and
   * target together so a drag orbit is not reset every frame.
   */
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
    for (const tile of this.tiles) {
      const mat = tile.mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
    this.tiles = [];
    for (const spr of this.actors) (spr.material as THREE.SpriteMaterial).dispose();
    for (const spr of this.items) (spr.material as THREE.SpriteMaterial).dispose();
    this.actors = [];
    this.items = [];
    if (this.playerRig) {
      disposeSurveyor(this.playerRig);
      this.playerRig = null;
    }
    this.hop = null;
    this.world.clear();
  }
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
