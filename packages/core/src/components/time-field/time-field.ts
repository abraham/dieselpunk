import { PunkDateTimeFieldBase } from '../../internal/date-time-field.ts';
import { dateTimeFieldStyles } from '../../styles/date-time-field.ts';

/**
 * A field for a time of day, with a native `<input type="time">` in its shadow tree that takes
 * the focus. The picker, and whether the time is shown on a 12- or 24-hour clock, are the
 * platform's, in the browser's language. `value`, `min`, and `max` are times in the form `HH:MM`,
 * or `HH:MM:SS` with seconds; a value that is not one is cleared and warns in development.
 * `step` is in seconds, and one below 60 lets the user set seconds. It takes part in a form as
 * the text field does, with `required`, `min`, `max`, `step`, and an incomplete time
 * (`badInput`) as its validity.
 *
 * `label` is its name, with the same fallbacks as the text field's.
 *
 * @tagname punk-time-field
 *
 * @slot prefix - Inside the field before the time, such as an icon.
 * @slot suffix - Inside the field after the time, such as a time zone.
 * @slot hint - Help below the field. It describes the field.
 *
 * @csspart field - The wrapper around everything.
 * @csspart label - The label above the field.
 * @csspart control - The native input.
 * @csspart prefix - The wrapper around the prefix.
 * @csspart suffix - The wrapper around the suffix.
 * @csspart hint - The wrapper around the hint.
 * @csspart message - The validation message, while it shows.
 *
 * @fires input - The user changed the time. Sent by the native input and crossing the shadow boundary.
 * @fires change - The user committed a change, from the host.
 */
export class PunkTimeField extends PunkDateTimeFieldBase {
  static override styles = dateTimeFieldStyles;

  protected override readonly inputType = 'time';
  protected override readonly valueFormat = 'HH:MM';
}
