// A made-up factory for the dashboard example: a few series that drift, and a few machines whose
// status changes. It is deterministic, so a screenshot and a test see the same first numbers.

export type DemoStatus = 'success' | 'warning' | 'danger' | 'info';

export interface DemoGroup {
  name: string;
  status: DemoStatus;
  text: string;
}

export interface DemoState {
  /** Items a minute, oldest first. */
  series: Record<'iron' | 'copper' | 'gears' | 'circuits', number[]>;
  /** Percent. */
  power: number;
  fluid: number;
  heat: number;
  progress: number[];
  groups: DemoGroup[];
  ticks: number;
}

const POINTS = 20;

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export function createProductionDemo(seed = 7) {
  const random = mulberry32(seed);
  const walk = (start: number, step: number): number[] => {
    const values = [start];
    while (values.length < POINTS) {
      values.push(
        clamp((values.at(-1) as number) + (random() - 0.5) * step, start * 0.5, start * 1.6),
      );
    }
    return values;
  };
  const state: DemoState = {
    series: {
      iron: walk(1200, 160),
      copper: walk(860, 120),
      gears: walk(310, 50),
      circuits: walk(145, 30),
    },
    power: 64,
    fluid: 48,
    heat: 52,
    progress: [22, 61, 87],
    groups: [
      { name: 'Smelters', status: 'success', text: 'Running' },
      { name: 'Assemblers', status: 'success', text: 'Running' },
      { name: 'Boilers', status: 'warning', text: 'Fuel low' },
      { name: 'Pumps', status: 'info', text: 'Waiting for input' },
    ],
    ticks: 0,
  };

  /** One second of the factory. */
  function step(): void {
    for (const values of Object.values(state.series)) {
      const last = values.at(-1) as number;
      values.push(clamp(last + (random() - 0.5) * last * 0.12, last * 0.6, last * 1.5));
      values.shift();
    }
    state.power = clamp(state.power + (random() - 0.5) * 8, 10, 98);
    state.fluid = clamp(state.fluid + (random() - 0.5) * 6, 5, 95);
    state.heat = clamp(state.heat + (random() - 0.5) * 7, 10, 98);
    state.progress = state.progress.map((value) => (value >= 100 ? 0 : value + 1 + random() * 4));
    const boilers = state.groups[2] as DemoGroup;
    if (state.heat > 80) Object.assign(boilers, { status: 'danger', text: 'Overheating' });
    else if (state.power < 30) Object.assign(boilers, { status: 'warning', text: 'Fuel low' });
    else Object.assign(boilers, { status: 'success', text: 'Running' });
    state.ticks++;
  }

  return { state, step };
}
