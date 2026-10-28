import { createSand, createRocks } from './seabed.js';
import { createKelp, createCorals } from './plants.js';
import { createBubbles } from './bubbles.js';

// Everything on the seabed, by name. All of it is touchable particles except the bubbles.
export function createEnvironment(scale = 1) {
  const [coralBranch, coralFan] = createCorals(scale);
  return {
    sand: createSand(scale),
    rocks: createRocks(scale),
    kelp: createKelp(scale),
    coralBranch,
    coralFan,
    bubbles: createBubbles(scale),
  };
}
