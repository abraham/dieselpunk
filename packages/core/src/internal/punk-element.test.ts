import { css, html } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, track } from '../../test/browser/helpers.ts';
import { registerElement } from '../utilities/register-element.ts';
import { PunkElement } from './punk-element.ts';

// A server-rendered element, before its definition loads: a host with a filled shadow root.
function serverRendered(tag: string, markup: string, delegatesFocus = false): HTMLElement {
  const host = track(document.createElement(tag));
  host.attachShadow({ mode: 'open', delegatesFocus }).innerHTML = markup;
  return host;
}

afterEach(cleanup);

describe('upgrading over a server-rendered shadow root (ssr.md §4)', () => {
  it('replaces the server tree and adopts the shared sheets instead of its style', async () => {
    class TestReplaced extends PunkElement {
      static override styles = css`
        p {
          margin: 0;
        }
      `;
      protected override render() {
        return html`<p part="client">Client</p>`;
      }
    }
    const host = serverRendered(
      'test-replaced',
      '<style>p { color: red }</style><p part="server">Server</p>',
    );
    const root = host.shadowRoot!;
    registerElement('test-replaced', TestReplaced);
    await (host as TestReplaced).updateComplete;

    expect(host.shadowRoot).toBe(root);
    expect(root.querySelector('style')).toBeNull();
    expect(root.querySelector('[part="server"]')).toBeNull();
    expect(root.querySelector('[part="client"]')?.textContent).toBe('Client');
    expect(root.adoptedStyleSheets).toEqual(
      TestReplaced.elementStyles.map(
        (style) => (style as { styleSheet: CSSStyleSheet }).styleSheet,
      ),
    );
  });

  it('moves focus from the server tree to the component', async () => {
    class TestFocused extends PunkElement {
      static override shadowRootOptions = {
        ...PunkElement.shadowRootOptions,
        delegatesFocus: true,
      };
      protected override render() {
        return html`<button part="client">Go</button>`;
      }
    }
    const host = serverRendered('test-focused', '<button>Go</button>', true);
    host.shadowRoot!.querySelector('button')!.focus();
    registerElement('test-focused', TestFocused);
    await (host as TestFocused).updateComplete;
    await Promise.resolve();

    expect(document.activeElement).toBe(host);
    expect(host.shadowRoot!.activeElement).toBe(host.shadowRoot!.querySelector('[part="client"]'));
  });

  it('keeps text typed into a field before the upgrade, with no event', async () => {
    const typed = serverRendered('punk-text-field', '<input class="control" value="">', true);
    typed.shadowRoot!.querySelector('input')!.value = 'Ada';
    const untouched = serverRendered('punk-text-field', '<input class="control" value="">', true);
    const events: string[] = [];
    for (const type of ['input', 'change']) typed.addEventListener(type, () => events.push(type));

    await import('../components/text-field/register.ts');
    const fields = [typed, untouched] as Array<HTMLElement & { value: string }>;
    await Promise.all(fields.map((field) => (field as unknown as PunkElement).updateComplete));

    expect(fields.map((field) => field.value)).toEqual(['Ada', '']);
    expect(typed.shadowRoot!.querySelector('input')!.value).toBe('Ada');
    expect(events).toEqual([]);
  });
});
