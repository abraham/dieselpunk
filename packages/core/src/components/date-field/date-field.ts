import { PunkDateTimeFieldBase } from '../../internal/date-time-field.ts';
import { dateTimeFieldStyles } from '../../styles/date-time-field.ts';

/**
 * A field for a date, with a native `<input type="date">` in its shadow tree that takes the
 * focus. The picker, and how the date is shown and typed, are the platform's, in the browser's
 * language. `value`, `min`, and `max` are dates in the form `YYYY-MM-DD`; a value that is not one
 * is cleared and warns in development. It takes part in a form as the text field does: it submits
 * `value` under `name`, a form reset puts back the `value` attribute, and `required`, `min`,
 * `max`, `step`, and an incomplete date the user typed (`badInput`) are its validity.
 *
 * `label` is its name, with the same fallbacks as the text field's.
 *
 * @tagname punk-date-field
 *
 * @slot prefix - Inside the field before the date, such as an icon.
 * @slot suffix - Inside the field after the date.
 * @slot hint - Help below the field, such as the format to type. It describes the field.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native input.
 * @csspart prefix - The wrapper around the prefix.
 * @csspart suffix - The wrapper around the suffix.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @fires input - The user changed the date. Sent by the native input and crossing the shadow boundary.
 * @fires change - The user committed a change, from the host.
 */
export class PunkDateField extends PunkDateTimeFieldBase {
  static override styles = dateTimeFieldStyles;

  protected override readonly inputType = 'date';
  protected override readonly valueFormat = 'YYYY-MM-DD';
}
