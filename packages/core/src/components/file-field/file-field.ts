import { html, nothing } from 'lit';
import type { PropertyDeclarations } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { PunkFieldBase } from '../../internal/field-base.ts';
import type { FormValue } from '../../internal/form-control.ts';
import { msg } from '../../internal/localize.ts';
import { resolveLang } from '../../utilities/locale.ts';
import { acceptsFile, formatFileSize } from './file-kinds.ts';
import { fileFieldStyles } from './file-field.styles.ts';

/**
 * A field for choosing files, with a native `<input type="file">` in its shadow tree that takes
 * the focus, and a list of the chosen files' names and sizes below it. The input's button opens
 * the platform's file chooser, so the keyboard and every pointer can always choose.
 *
 * With `drop-zone` the field is also a place to drop files: an enhancement, never the only way.
 * Dropped files that `accept` does not name are left out, and only the first is kept unless
 * `multiple` is set. It takes part in a form: it submits each chosen file under `name`, a form
 * reset clears the choice, and `required` is its validity.
 *
 * `label` is its name, with the same fallbacks as the text field's.
 *
 * @tagname punk-file-field
 *
 * @slot hint - Help below the field, such as the kinds and sizes allowed. It describes the field.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native input.
 * @csspart drop - The words that say files can be dropped, with `drop-zone`.
 * @csspart list - The list of chosen files, while there are any.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @fires input - The user chose or dropped files. Sent by the native input and crossing the shadow boundary.
 * @fires change - The user chose or dropped files, from the host.
 */
export class PunkFileField extends PunkFieldBase {
  static override styles = fileFieldStyles;

  static override properties: PropertyDeclarations = {
    accept: { reflect: true },
    multiple: { type: Boolean, reflect: true },
    dropZone: { attribute: 'drop-zone', type: Boolean, reflect: true },
    chosen: { attribute: false },
    dragging: { attribute: false },
  };

  /** The kinds of file to offer, as the native attribute: extensions, MIME types, or `type/*`. */
  accept = '';

  /** Lets the user choose more than one file. */
  multiple = false;

  /** Makes the field a place to drop files, as well as the input's button. */
  dropZone = false;

  private chosen: File[] = [];
  private dragging = false;

  /** The chosen files, as the native input holds them. */
  get files(): FileList | null {
    return (this.control as HTMLInputElement | null)?.files ?? null;
  }

  protected override formValue(): FormValue {
    if (this.chosen.length === 0 || !this.name) return null;
    if (this.chosen.length === 1) return this.chosen[0] as File;
    const data = new FormData();
    for (const file of this.chosen) data.append(this.name, file);
    return data;
  }

  protected override resetToDefault(): void {
    const input = this.control as HTMLInputElement | null;
    if (input) input.value = '';
    this.chosen = [];
  }

  // A browser keeps no files across navigation for a form-associated element to restore.
  protected override restoreState(): void {}

  #read(): void {
    this.chosen = [...(this.files ?? [])];
    this.commit();
  }

  readonly #onInput = (): void => {
    this.#read();
  };

  readonly #onDragOver = (event: DragEvent): void => {
    if (this.isDisabled || !event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dragging = true;
  };

  readonly #onDragLeave = (event: DragEvent): void => {
    const to = event.relatedTarget as Node | null;
    if (!to || !this.renderRoot.contains(to)) this.dragging = false;
  };

  readonly #onDrop = (event: DragEvent): void => {
    this.dragging = false;
    const input = this.control as HTMLInputElement | null;
    if (this.isDisabled || !input || !event.dataTransfer?.files.length) return;
    // A drop the field does not take still must not open the file in place of the page.
    event.preventDefault();
    const accepted = [...event.dataTransfer.files].filter((file) => acceptsFile(file, this.accept));
    if (accepted.length === 0) return;
    const transfer = new DataTransfer();
    for (const file of this.multiple ? accepted : accepted.slice(0, 1)) transfer.items.add(file);
    input.files = transfer.files;
    this.#read();
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.forwardChange();
  };

  protected override render() {
    const aria = this.ariaBindings();
    const lang = resolveLang(this);
    const zone = this.dropZone && !this.isDisabled;
    const field = this.renderField({
      control: html`<input
          part="control"
          class="control"
          id="control"
          type="file"
          accept=${ifDefined(this.accept || undefined)}
          ?multiple=${this.multiple}
          ?disabled=${this.isDisabled}
          ?required=${this.required}
          aria-label=${aria.label}
          aria-describedby=${aria.describedby}
          aria-invalid=${aria.invalid}
          @input=${this.#onInput}
          @change=${this.forwardChange}
        />${
          this.dropZone
            ? html`<span part="drop" class="drop"
                >${msg('or drop files here', {
                  id: 'dropFiles',
                  desc: 'Shown beside the button of a file field that also takes files dropped on it.',
                })}</span
              >`
            : nothing
        }`,
      after: html`<ul part="list" class="list" ?hidden=${this.chosen.length === 0}>
        ${this.chosen.map(
          (file) =>
            html`<li>
              <span class="name">${file.name}</span>
              <span class="size">${formatFileSize(file.size, lang)}</span>
            </li>`,
        )}
      </ul>`,
    });
    return html`<div
      class=${classMap({ zone: this.dropZone, dragging: this.dragging })}
      @dragenter=${zone ? this.#onDragOver : nothing}
      @dragover=${zone ? this.#onDragOver : nothing}
      @dragleave=${zone ? this.#onDragLeave : nothing}
      @drop=${zone ? this.#onDrop : nothing}
    >
      ${field}
    </div>`;
  }
}
