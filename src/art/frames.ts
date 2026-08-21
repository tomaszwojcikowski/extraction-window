import type { Frame } from './pack';
import { actorFrames } from './paint/actors';
import { crackFrames, floorFrames } from './paint/floors';
import { itemFrames } from './paint/items';
import { propFrames } from './paint/props';
import { sconceFrames, wallFrames } from './paint/walls';

export function allAtlasFrames(): Record<'floors' | 'walls' | 'props' | 'items' | 'actors', Frame[]> {
  return {
    floors: [...floorFrames(), ...crackFrames()],
    walls: [...wallFrames(), ...sconceFrames()],
    props: propFrames(),
    items: itemFrames(),
    actors: actorFrames(),
  };
}
