<script setup lang="ts">
import { ref } from 'vue';
import type {
  PunkCloseDetail,
  PunkDialog,
  PunkSlider,
  PunkSwitch,
  PunkTabChangeDetail,
  PunkTextField,
} from '@dieselpunk/core';

const callsign = ref('');
const restart = ref(false);
const power = ref(40);
const submitted = ref<Array<[string, string]> | null>(null);
const tab = ref<string | null>(null);
const dialog = ref<string | null>(null);
const closed = ref<string | null>(null);
const confirm = ref<PunkDialog | null>(null);

function submit(event: SubmitEvent) {
  const form = event.currentTarget as HTMLFormElement;
  submitted.value = [...new FormData(form)].map(([name, value]) => [name, String(value)]);
}

const onCallsign = (event: Event) => (callsign.value = (event.target as PunkTextField).value);
const onRestart = (event: Event) => (restart.value = (event.target as PunkSwitch).checked);
const onPower = (event: Event) => (power.value = (event.target as PunkSlider).value);
const onTab = (event: CustomEvent<PunkTabChangeDetail>) => (tab.value = event.detail.value);
const onWindowClose = (event: CustomEvent<PunkCloseDetail>) => (closed.value = event.detail.reason);
const onDialogClose = (event: CustomEvent<PunkCloseDetail>) =>
  (dialog.value = `${event.detail.reason}:${event.detail.returnValue ?? ''}`);
</script>

<template>
  <punk-window heading="Assembler 03" open dismissible @punk-close="onWindowClose">
    <punk-tabs aria-label="Machine details" @punk-tab-change="onTab">
      <punk-tab slot="tab" panel="production">Production</punk-tab>
      <punk-tab slot="tab" panel="modules">Modules</punk-tab>
    </punk-tabs>

    <section id="production">
      <form @submit.prevent="submit">
        <!-- `.prop` sets a property, which is what a value or a state of an element is. -->
        <punk-text-field
          name="callsign"
          label="Callsign"
          :value.prop="callsign"
          @input="onCallsign"
        ></punk-text-field>
        <punk-switch name="restart" :checked.prop="restart" @change="onRestart"
          >Restart</punk-switch
        >
        <punk-slider name="power" label="Power" :value.prop="power" @input="onPower"></punk-slider>
        <punk-button type="submit" variant="primary">Apply</punk-button>
        <punk-button @click="power = 90">Boost</punk-button>
      </form>
      <output id="greeting">Hello, {{ callsign || 'nobody' }}</output>
    </section>
    <section id="modules">Speed module, 2 installed</section>
  </punk-window>

  <punk-button @click="confirm?.show()">Stop machine</punk-button>
  <punk-dialog ref="confirm" heading="Discard the run?" alert @punk-close="onDialogClose">
    <p>Stopping now throws away the progress.</p>
    <punk-button slot="footer" data-punk-close="cancel">Keep crafting</punk-button>
    <punk-button slot="footer" variant="danger" data-punk-close="discard">Discard</punk-button>
  </punk-dialog>

  <!-- What the app received, for the check to read. -->
  <pre id="report">{{
    JSON.stringify({ callsign, restart, power, submitted, tab, dialog, window: closed })
  }}</pre>
</template>
