import { css, unsafeCSS } from 'lit';
import { token } from '../tokens/token.ts';

// Procedural noise drawn by the browser; no image asset is bundled or derived from any game.
const noiseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
<filter id="n" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
<feColorMatrix type="saturate" values="0"/>
</filter>
<rect width="100%" height="100%" filter="url(#n)"/>
</svg>`;

const noiseImage = unsafeCSS(`url("data:image/svg+xml,${encodeURIComponent(noiseSvg)}")`);

/** Declarations for a `::before` that overlays tiled noise without catching pointer events. */
export const textureOverlay = css`
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image: ${noiseImage};
  background-size: 128px 128px;
  opacity: ${token('texture-opacity')};
`;
