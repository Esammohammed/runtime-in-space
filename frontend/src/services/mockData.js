// Sample data so the screens run with no backend (VITE_USE_MOCK=true).
// Shapes match contracts/README.md.
const now = () => new Date().toISOString();
const wobble = (base, spread) => Math.round((base + (Math.random() - 0.5) * spread) * 10) / 10;

export const mockCrew = [
  { id: 1, name: 'Crew 1', role: 'Commander', age: 41, baselines: { heart_rate: 62 } },
  { id: 2, name: 'Crew 2', role: 'Pilot', age: 37, baselines: { heart_rate: 68 } },
  { id: 3, name: 'Crew 3', role: 'Medical officer', age: 44, baselines: { heart_rate: 71 } },
  { id: 4, name: 'Crew 4', role: 'Mission specialist', age: 33, baselines: { heart_rate: 65 } },
];

export const mockIndicators = [
  { id: 'heart_rate', name: 'Heart rate', unit: 'bpm', body_area: 'heart', source: 'band', green: [60, 100], yellow: [50, 120] },
  { id: 'hrv', name: 'Heart rate variability', unit: 'ms', body_area: 'heart', source: 'band', green: [30, 150], yellow: [20, 200] },
  { id: 'spo2', name: 'Blood oxygen', unit: '%', body_area: 'lungs', source: 'band', green: [95, 100], yellow: [90, 100] },
  { id: 'skin_temp', name: 'Temperature', unit: '°C', body_area: 'body', source: 'band', green: [35.5, 37.5], yellow: [35, 38] },
  { id: 'sleep_hours', name: 'Sleep', unit: 'hours', body_area: 'head', source: 'band', green: [7, 9], yellow: [6, 10] },
  { id: 'bp_systolic', name: 'Blood pressure (systolic)', unit: 'mmHg', body_area: 'heart', source: 'manual', green: [90, 120], yellow: [85, 140] },
  { id: 'blood_glucose', name: 'Blood glucose', unit: 'mg/dL', body_area: 'metabolism', source: 'manual', green: [70, 100], yellow: [60, 126] },
  { id: 'mood', name: 'Mood', unit: 'of 5', body_area: 'head', source: 'manual', green: [3, 5], yellow: [2, 5] },
].map((item) => ({ how_to_measure: 'TODO', why_it_matters: 'TODO', actions: { yellow: 'TODO', red: 'TODO' }, ...item }));

const SAMPLE = { heart_rate: [78, 'yellow', '26% above your baseline of 62'], hrv: [41, 'yellow', '40% below your baseline of 68'],
  spo2: [97, 'green'], skin_temp: [36.6, 'green'], sleep_hours: [6.1, 'yellow', '6.1 hours is below the normal range 7 to 9'],
  bp_systolic: [118, 'green'], blood_glucose: [92, 'green'], mood: [3, 'green'] };

export function mockDashboard(crewId) {
  const crew = mockCrew.find((m) => m.id === crewId) ?? mockCrew[0];
  const indicators = mockIndicators.map((def) => {
    const [value, status, reason = 'Within the normal range'] = SAMPLE[def.id];
    const live = def.source === 'band' && def.id !== 'sleep_hours';
    return { id: def.id, name: def.name, unit: def.unit, body_area: def.body_area, source: def.source,
      value: live ? wobble(value, 2) : value, timestamp: now(), status, reason,
      trend: Array.from({ length: 20 }, (_, i) => wobble(value - (19 - i) * 0.3, 2)) };
  });
  return {
    crew, indicators,
    body_areas: { heart: 'yellow', head: 'yellow', lungs: 'green', metabolism: 'green', body: 'green' },
    warnings: [{ id: 1, crew_id: crew.id, type: 'early_warning', indicator: 'heart_rate', timestamp: now(),
      message: 'Heart rate is drifting and is forecast to reach the watch level in about 3 days.', data: {} }],
    tasks: [{ id: 1, title: 'Measure blood pressure', indicator: 'bp_systolic', origin: 'routine', done: true },
      { id: 2, title: 'Measure blood glucose', indicator: 'blood_glucose', origin: 'routine', done: false },
      { id: 3, title: 'Repeat heart rate at rest', indicator: 'heart_rate', origin: 'warning', done: false }],
    streak: 12,
  };
}

export function mockSeries(indicatorId) {
  const base = SAMPLE[indicatorId]?.[0] ?? 50;
  return Array.from({ length: 120 }, (_, i) => ({
    timestamp: new Date(Date.now() - (119 - i) * 3 * 3600 * 1000).toISOString(),
    value: wobble(base - (119 - i) * 0.05, 3), source: 'simulator',
  }));
}
