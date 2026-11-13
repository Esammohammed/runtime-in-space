import { useEffect, useState } from 'react';
import Card from '@/components/common/Card.jsx';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { getIndicators, submitCheckIn } from '@/services/readingsService.js';

// Human-friendly reference ranges for common space indicators
const RANGE_HINTS = {
  bp_systolic: 'Nominal: 90 – 120 mmHg',
  blood_glucose: 'Nominal: 70 – 100 mg/dL',
  mood: 'Scale: 1 (Fatigued) to 5 (Optimal)',
};

const MOOD_OPTIONS = [
  { val: 1, label: '1 Low' },
  { val: 2, label: '2 Fair' },
  { val: 3, label: '3 Good' },
  { val: 4, label: '4 Very Good' },
  { val: 5, label: '5 Optimal' },
];

export default function CheckInPage() {
  const { selectedId, selected } = useCrew();
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getIndicators()
      .then((all) => setFields(all.filter((item) => item.source === 'manual')))
      .catch(setError);
  }, []);

  const onPrefillBaselines = () => {
    if (!selected?.baselines) return;
    const prefilled = {};
    fields.forEach((f) => {
      if (selected.baselines[f.id] !== undefined) {
        prefilled[f.id] = String(selected.baselines[f.id]);
      } else if (f.id === 'mood') {
        prefilled[f.id] = '4';
      } else if (f.id === 'bp_systolic') {
        prefilled[f.id] = '118';
      } else if (f.id === 'blood_glucose') {
        prefilled[f.id] = '92';
      }
    });
    setValues((prev) => ({ ...prev, ...prefilled }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const filled = Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => value !== '')
        .map(([id, value]) => [id, Number(value)]),
    );
    if (Object.keys(filled).length === 0) {
      return setError(new Error('Please enter at least one reading before saving.'));
    }
    try {
      setSubmitting(true);
      setError(null);
      const res = await submitCheckIn(selectedId, filled);
      setResult(res);
      setValues({});
    } catch (submitError) {
      setError(submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const nameOf = (id) => fields.find((field) => field.id === id)?.name ?? id;

  return (
    <div className="checkin-page-layout">
      {/* Header */}
      <header className="page-header-standard checkin-header">
        <div className="page-header-icon-box">
          <Icon name="checkin" size={26} color="var(--cyan)" />
        </div>
        <div>
          <h1 className="page-title">Daily Medical Check-in</h1>
          <p className="page-subtitle muted">
            Logging for <strong className="text-white">{selected?.name || 'Astronaut'}</strong> ({selected?.role || 'Mission Specialist'}). Record manual vitals and kit readings that cannot be sampled automatically by wearable sensors.
          </p>
        </div>
      </header>

      {/* Main Grid: Form on Left, Baselines & Context on Right */}
      <div className="checkin-grid-columns">
        {/* Left Column: Input Form */}
        <div className="checkin-form-column">
          <Card
            title="Manual Telemetry Readings"
            icon={<Icon name="clipboard" size={18} color="var(--cyan)" />}
            aside={
              <button
                type="button"
                className="prefill-baselines-btn"
                onClick={onPrefillBaselines}
                title="Fill values with baseline defaults"
              >
                <Icon name="refresh" size={13} />
                <span>Use Baselines</span>
              </button>
            }
            className="checkin-form-card"
          >
            <form onSubmit={onSubmit} className="checkin-actual-form">
              <div className="checkin-fields-stack">
                {fields.map((field) => {
                  const hint = RANGE_HINTS[field.id];
                  const isMood = field.id === 'mood';

                  return (
                    <div key={field.id} className="checkin-field-row">
                      <div className="field-info-side">
                        <div className="field-title-line">
                          <span className="field-type-icon">
                            <Icon name={field.id} size={18} />
                          </span>
                          <label htmlFor={field.id} className="field-label-text">
                            {field.name}
                          </label>
                        </div>
                        {hint && <span className="field-range-hint muted small">{hint}</span>}
                      </div>

                      <div className="field-input-side">
                        {isMood ? (
                          <div className="mood-selection-group">
                            <div className="mood-pills-row">
                              {MOOD_OPTIONS.map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  className={`mood-pill-btn ${values[field.id] === String(opt.val) ? 'selected' : ''}`}
                                  onClick={() => setValues({ ...values, [field.id]: String(opt.val) })}
                                >
                                  {opt.val}
                                </button>
                              ))}
                            </div>
                            <input
                              id={field.id}
                              type="number"
                              min="1"
                              max="5"
                              step="1"
                              placeholder="1 - 5"
                              className="mood-numeric-input"
                              value={values[field.id] ?? ''}
                              onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="telemetry-input-container">
                            <input
                              id={field.id}
                              type="number"
                              step="any"
                              inputMode="decimal"
                              placeholder="0.0"
                              className="telemetry-numeric-input font-mono"
                              value={values[field.id] ?? ''}
                              onChange={(e) =>
                                setValues({ ...values, [field.id]: e.target.value })
                              }
                            />
                            <span className="telemetry-unit-badge font-mono">{field.unit}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="form-error-banner mt-3" role="alert">
                  <Icon name="alert-triangle" size={16} color="var(--coral)" />
                  <span>{error.message}</span>
                </div>
              )}

              <div className="checkin-submit-row mt-4">
                <button
                  type="submit"
                  className="button primary-gradient-btn checkin-save-btn"
                  disabled={submitting}
                >
                  <Icon name="check" size={18} color="#070C15" />
                  <span>{submitting ? 'Transmitting telemetry…' : 'Submit Today’s Readings'}</span>
                </button>
              </div>
            </form>
          </Card>

          {/* Results Card if submitted */}
          {result && (
            <Card
              title="Evaluation Results"
              icon={<Icon name="check" size={18} color="var(--green)" />}
              aside="Saved to Crew Log"
              className="checkin-result-card mt-3"
            >
              <div className="evaluation-items-list">
                {result.assessments.map((item) => (
                  <div key={item.indicator} className="evaluation-row-item">
                    <div className="eval-left">
                      <span className="eval-indicator-name">{nameOf(item.indicator)}</span>
                      <span className="eval-value font-mono">{item.value}</span>
                    </div>
                    <div className="eval-right">
                      <StatusBadge status={item.status} />
                      <span className="eval-reason muted small">{item.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Astronaut Baselines & Consistency Advice */}
        <div className="checkin-sidebar-column">
          <Card
            title="Baseline References"
            icon={<Icon name="activity" size={18} color="var(--cyan)" />}
            className="checkin-side-card"
          >
            <p className="muted small mb-3">
              Calibrated nominal resting values for {selected?.name || 'this astronaut'}:
            </p>
            <div className="sidebar-baselines-list">
              <div className="sidebar-baseline-item">
                <span className="muted small">Resting Systolic BP</span>
                <strong className="font-mono">118 mmHg</strong>
              </div>
              <div className="sidebar-baseline-item">
                <span className="muted small">Fasting Blood Glucose</span>
                <strong className="font-mono">92 mg/dL</strong>
              </div>
              <div className="sidebar-baseline-item">
                <span className="muted small">Target Mood Baseline</span>
                <strong className="font-mono">≥ 3 / 5</strong>
              </div>
            </div>
          </Card>

          <Card
            title="Check-in Guidance"
            icon={<Icon name="shield" size={18} color="var(--cyan)" />}
            className="checkin-side-card"
          >
            <div className="guidance-bullets">
              <p className="small">
                <strong className="text-cyan">Accuracy first:</strong> If experiencing nausea, cephalic fluid shift, or sleep disruption, report true scores.
              </p>
              <p className="small muted">
                Reporting symptoms early allows the automated countermeasure engine to prescribe targeted exercise or fluid adjustments before mission fatigue sets in.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
