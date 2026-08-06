/**
 * Presentation re-exports — light math and gameplay illumination live in sim/.
 * @deprecated Import from `sim/light` for new code.
 */
export {
  LIGHT_NEAR,
  LIT_THRESHOLD,
  irradiance,
  lightTransmittance,
  toneMap,
  accumulateLight,
  floodAddLight,
} from '../../sim/light';
