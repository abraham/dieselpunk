<script lang="ts">
  import type {
    PunkCloseDetail,
    PunkDialog,
    PunkSlider,
    PunkSwitch,
    PunkTabChangeDetail,
    PunkTextField,
  } from '@dieselpunk/core';

  let callsign = $state('');
  let restart = $state(false);
  let power = $state(40);
  let submitted: Array<[string, string]> | null = $state(null);
  let tab: string | null = $state(null);
  let dialog: string | null = $state(null);
  let closed: string | null = $state(null);
  let confirm: PunkDialog | undefined = $state();

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    submitted = [...new FormData(form)].map(([name, value]) => [name, String(value)]);
  }
</script>

<punk-window
  heading="Assembler 03"
  open
  dismissible
  onpunk-close={(event: CustomEvent<PunkCloseDetail>) => (closed = event.detail.reason)}
>
  <punk-tabs
    aria-label="Machine details"
    onpunk-tab-change={(event: CustomEvent<PunkTabChangeDetail>) => (tab = event.detail.value)}
  >
    <punk-tab slot="tab" panel="production">Production</punk-tab>
    <punk-tab slot="tab" panel="modules">Modules</punk-tab>
  </punk-tabs>

  <section id="production">
    <form onsubmit={submit}>
      <!-- A property is set when the element has one, so `value` and `checked` are properties. -->
      <punk-text-field
        name="callsign"
        label="Callsign"
        value={callsign}
        oninput={(event: Event) => (callsign = (event.target as PunkTextField).value)}
      ></punk-text-field>
      <punk-switch
        name="restart"
        checked={restart}
        onchange={(event: Event) => (restart = (event.target as PunkSwitch).checked)}
        >Restart</punk-switch
      >
      <punk-slider
        name="power"
        label="Power"
        value={power}
        oninput={(event: Event) => (power = (event.target as PunkSlider).value)}
      ></punk-slider>
      <punk-button type="submit" variant="primary">Apply</punk-button>
      <punk-button onclick={() => (power = 90)}>Boost</punk-button>
    </form>
    <output id="greeting">Hello, {callsign || 'nobody'}</output>
  </section>
  <section id="modules">Speed module, 2 installed</section>
</punk-window>

<punk-button onclick={() => confirm?.show()}>Stop machine</punk-button>
<punk-dialog
  bind:this={confirm}
  heading="Discard the run?"
  alert
  onpunk-close={(event: CustomEvent<PunkCloseDetail>) =>
    (dialog = `${event.detail.reason}:${event.detail.returnValue ?? ''}`)}
>
  <p>Stopping now throws away the progress.</p>
  <punk-button slot="footer" data-punk-close="cancel">Keep crafting</punk-button>
  <punk-button slot="footer" variant="danger" data-punk-close="discard">Discard</punk-button>
</punk-dialog>

<!-- What the app received, for the check to read. -->
<pre id="report">{JSON.stringify({ callsign, restart, power, submitted, tab, dialog, window: closed })}</pre>
