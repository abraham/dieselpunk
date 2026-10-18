import { css } from 'lit';
import { token } from '../../tokens/token.ts';

// Comments live out here because CSS comments inside `css` ship to every consumer.
//
// The arrow tip is four stacked layers, each clipped to the tip grown by its offset `--_d` from
// the fill: the focus ring's two tones (`::before`, `.tip-ring`), the outline (`.tip-edge`), then
// the fill (`::after`). Growing by the same offsets as the body's outline and ring, with square
// shoulders, joins each to the body's without a seam. The sides are 45 degrees; a label that
// wraps gives the tip a flat nose (the vertical edge between the two nose points).
//
// - `--_r` is the ring's reach, `--_o` how far the tip overlaps the body to cover its edge bevel.
// - `--_s` is where a layer starts: only the fill starts inside the body, so no other layer's
//   anti-aliased edge shows there.
// - `--_x` is the shoulder: outward offsets keep it square, inward ones follow the side.
// - `--_n` is the nose: outward offsets keep a flat nose, inward ones keep it sharp.
// - Insets count from the body's padding box, where its fill starts.
// - The fill's background is sized to the body's height, so a gradient meets the body's.
//
// Forced colors: the body draws a border (`--_fb`) inside its box, which the tip continues, so
// the ring reaches further. The body's outline would cross the tip, so an arrow button draws its
// focus ring on `::after` instead, beneath the tip: a Canvas gap, then Highlight.
export const buttonStyles = css`
  .label {
    min-inline-size: 0;
  }

  .icon {
    display: inline-flex;
    align-items: center;
  }

  .icon ::slotted(*) {
    flex: none;
    inline-size: var(--_icon);
    block-size: var(--_icon);
  }

  .button {
    --_tip: calc(var(--_h) / 2);
  }

  :host([arrow='end']) .button {
    margin-inline-end: var(--_tip);
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  :host([arrow='start']) .button {
    margin-inline-start: var(--_tip);
    border-start-start-radius: 0;
    border-end-start-radius: 0;
  }

  .tip {
    --_r: calc(${token('border-width')} + 4px);
    --_o: ${token('border-width')};
    --_s: var(--_o);
    position: absolute;
    z-index: 1;
    inset-block: calc(-1 * var(--_r));
    inset-inline-start: calc(100% - var(--_o));
    inline-size: calc(var(--_o) + var(--_tip) + var(--_r));
    pointer-events: none;
  }

  :host([arrow='start']) .tip,
  :host(:dir(rtl)) .tip {
    transform: scaleX(-1);
  }

  :host([arrow='start']) .tip {
    inset-inline: auto calc(100% - var(--_o));
  }

  :host([arrow='start']:dir(rtl)) .tip {
    transform: none;
  }

  .tip::before,
  .tip::after,
  .tip-ring,
  .tip-edge {
    content: '';
    position: absolute;
    inset: 0;
    --_x: max(var(--_d), var(--_d) * 0.4142);
    --_n: calc(var(--_o) + var(--_tip) + min(var(--_d), var(--_d) * 1.4142));
    clip-path: polygon(
      var(--_s) calc(var(--_r) - var(--_d)),
      calc(var(--_o) + var(--_x)) calc(var(--_r) - var(--_d)),
      calc(var(--_o) + var(--_x)) calc(var(--_r) + var(--_x) - var(--_d) * 1.4142),
      var(--_n) min(50%, calc(var(--_r) + var(--_tip) - var(--_d) * 0.4142)),
      var(--_n) max(50%, calc(100% - var(--_r) - var(--_tip) + var(--_d) * 0.4142)),
      calc(var(--_o) + var(--_x)) calc(100% - var(--_r) - var(--_x) + var(--_d) * 1.4142),
      calc(var(--_o) + var(--_x)) calc(100% - var(--_r) + var(--_d)),
      var(--_s) calc(100% - var(--_r) + var(--_d))
    );
  }

  .tip::before {
    --_d: var(--_r);
  }

  .tip-ring {
    --_d: calc(${token('border-width')} + 2px);
  }

  .tip-edge {
    --_d: ${token('border-width')};
    background: ${token('color-edge-dark')};
    pointer-events: auto;
  }

  .tip::after {
    --_d: 0px;
    --_s: 0px;
    background: var(--_bg) 0 var(--_r) / 100% calc(100% - 2 * var(--_r)) no-repeat;
    pointer-events: auto;
  }

  .button:focus-visible .tip::before {
    background: ${token('color-focus')};
  }

  .button:focus-visible .tip-ring {
    background: ${token('color-focus-inner')};
  }

  @media (forced-colors: active) {
    .button {
      --_fb: 2px;
    }

    .variant-primary,
    .variant-confirm {
      --_fb: 4px;
    }

    :host([arrow='end']) .button {
      border-inline-end-width: 0;
    }

    :host([arrow='start']) .button {
      border-inline-start-width: 0;
    }

    :host([arrow='end']) .button:focus-visible,
    :host([arrow='start']) .button:focus-visible {
      outline: none;
    }

    :host([arrow='end']) .button:focus-visible::after,
    :host([arrow='start']) .button:focus-visible::after {
      display: block;
      inset: calc(-1 * var(--_fb));
      forced-color-adjust: none;
      box-shadow:
        0 0 0 2px Canvas,
        0 0 0 4px Highlight;
    }

    .tip::before,
    .tip::after,
    .tip-ring,
    .tip-edge {
      forced-color-adjust: none;
    }

    .tip {
      --_r: calc(var(--_fb) + 4px);
    }

    .tip-ring {
      --_d: calc(var(--_fb) + 2px);
    }

    .tip-edge {
      --_d: var(--_fb);
      background: ButtonText;
    }

    .tip::after {
      background: ButtonFace;
    }

    .disabled .tip-edge {
      background: GrayText;
    }

    .button:focus-visible .tip::before {
      background: Highlight;
    }

    .button:focus-visible .tip-ring {
      background: Canvas;
    }
  }
`;
