import { useEffect, useState } from 'react';
import Card from '@/components/common/Card.jsx';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { getIndicators, submitCheckIn } from '@/services/readingsService.js';

export default function CheckInPage() {
  const { selectedId, selected } = useCrew();
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getIndicators().then((all) => setFields(all.filter((item) => item.source === 'manual'))).catch(setError);
  }, []);

  const onSubmit = async (event) => {
    event.preventDefault();
    const filled = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== '').map(([id, value]) => [id, Number(value)]),
    );
    if (Object.keys(filled).length === 0) return setError(new Error('Enter at least one value.'));
    try {
      setError(null);
      setResult(await submitCheckIn(selectedId, filled));
      setValues({});
    } catch (submitError) {
      setError(submitError);
    }
  };

  const nameOf = (id) => fields.find((field) => field.id === id)?.name ?? id;

  return (
    <>
      <h1>Daily check-in</h1>
      <p className="muted">For {selected?.name ?? '…'}. These are the measurements the band cannot take.</p>
      <Card>
        <form onSubmit={onSubmit} className="form">
          {fields.map((field) => (
            <div key={field.id} className="field">
              <label htmlFor={field.id}>{field.name} <span className="muted">({field.unit})</span></label>
              <input id={field.id} type="number" step="any" inputMode="decimal" value={values[field.id] ?? ''}
                onChange={(event) => setValues({ ...values, [field.id]: event.target.value })} />
            </div>
          ))}
          {error && <p className="error">{error.message}</p>}
          <button type="submit" className="button">Save check-in</button>
        </form>
      </Card>
      {result && (
        <Card title="Today's result">
          {result.assessments.map((item) => (
            <p key={item.indicator} className="row">
              <span>{nameOf(item.indicator)}: {item.value}</span>
              <span><StatusBadge status={item.status} /> <span className="muted small">{item.reason}</span></span>
            </p>
          ))}
        </Card>
      )}
    </>
  );
}
