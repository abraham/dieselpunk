import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PunkDialog } from '@dieselpunk/core';

export function App() {
  const [callsign, setCallsign] = useState('');
  const [restart, setRestart] = useState(false);
  const [power, setPower] = useState(40);
  const [submitted, setSubmitted] = useState<Array<[string, string]> | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const [closed, setClosed] = useState<string | null>(null);
  const confirm = useRef<PunkDialog>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(
      [...new FormData(event.currentTarget)].map(([name, value]) => [name, String(value)]),
    );
  };

  return (
    <>
      <punk-window
        heading="Assembler 03"
        open
        dismissible
        onpunk-close={(event) => setClosed(event.detail.reason)}
      >
        <punk-tabs
          aria-label="Machine details"
          onpunk-tab-change={(event) => setTab(event.detail.value)}
        >
          <punk-tab slot="tab" panel="production">
            Production
          </punk-tab>
          <punk-tab slot="tab" panel="modules">
            Modules
          </punk-tab>
        </punk-tabs>

        <section id="production">
          <form onSubmit={submit}>
            {/* A property is set when the element has one, so `value` and `checked` are properties. */}
            <punk-text-field
              name="callsign"
              label="Callsign"
              value={callsign}
              oninput={(event) => setCallsign(event.target.value)}
            />
            <punk-switch
              name="restart"
              checked={restart}
              onchange={(event) => setRestart(event.target.checked)}
            >
              Restart
            </punk-switch>
            <punk-slider
              name="power"
              label="Power"
              value={power}
              oninput={(event) => setPower(event.target.value)}
            />
            <punk-button type="submit" variant="primary">
              Apply
            </punk-button>
            <punk-button onClick={() => setPower(90)}>Boost</punk-button>
          </form>
          <output id="greeting">Hello, {callsign || 'nobody'}</output>
        </section>
        <section id="modules">Speed module, 2 installed</section>
      </punk-window>

      <punk-button onClick={() => confirm.current?.show()}>Stop machine</punk-button>
      <punk-dialog
        ref={confirm}
        heading="Discard the run?"
        alert
        onpunk-close={(event) =>
          setDialog(`${event.detail.reason}:${event.detail.returnValue ?? ''}`)
        }
      >
        <p>Stopping now throws away the progress.</p>
        <punk-button slot="footer" data-punk-close="cancel">
          Keep crafting
        </punk-button>
        <punk-button slot="footer" variant="danger" data-punk-close="discard">
          Discard
        </punk-button>
      </punk-dialog>

      {/* What the app received, for the check to read. */}
      <pre id="report">
        {JSON.stringify({ callsign, restart, power, submitted, tab, dialog, window: closed })}
      </pre>
    </>
  );
}
