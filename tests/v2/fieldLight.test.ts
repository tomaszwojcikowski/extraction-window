import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createFieldHemi, createFieldKeyLight, FIELD_HEMI_INTENSITY, FIELD_KEY_INTENSITY, FIELD_KEY_OFFSET, FIELD_SHADOW_EXTENT, placeFieldKeyLight } from '../../src/v2/fieldLight';
import { litPaint } from '../../src/v2/litMaterial';

describe('v2 field key light', () => {
  it('casts a tight ortho shadow frustum that follows the surveyor', () => {
    const light = createFieldKeyLight();
    expect(light.castShadow).toBe(true);
    expect(light.shadow.mapSize.x).toBe(2048);
    placeFieldKeyLight(light, 10, 4);
    expect(light.position.x).toBe(10 + FIELD_KEY_OFFSET.x);
    expect(light.position.z).toBe(4 + FIELD_KEY_OFFSET.z);
    expect(light.target.position.x).toBe(10);
    expect(light.target.position.z).toBe(4);
    expect(light.shadow.camera.right).toBe(FIELD_SHADOW_EXTENT);
    expect(light.shadow.camera.left).toBe(-FIELD_SHADOW_EXTENT);
  });

  it('keeps the key and hemi bright enough that Lambert fill is not crushed', () => {
    expect(FIELD_KEY_INTENSITY).toBeGreaterThan(1.2);
    expect(FIELD_HEMI_INTENSITY).toBeGreaterThan(0.8);
    expect(createFieldHemi().intensity).toBe(FIELD_HEMI_INTENSITY);
    expect(createFieldKeyLight().intensity).toBe(FIELD_KEY_INTENSITY);
  });
});

describe('v2 lit materials', () => {
  it('uses Lambert so meshes receive the key light, with emissive only on glow parts', () => {
    const suit = litPaint(0x3a82b4);
    expect(suit).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect(suit.emissiveIntensity).toBe(0);
    const visor = litPaint(0x1e3e5a, { glow: 0x7dffce });
    expect(visor.emissiveIntensity).toBeGreaterThan(0);
    expect(visor.color.getHex()).toBe(0x7dffce);
  });
});
