import Card from '@/components/common/Card.jsx';

export default function TaskList({ tasks = [], onComplete }) {
  const done = tasks.filter((task) => task.done).length;
  return (
    <Card title="Today" aside={`${done} of ${tasks.length} done`}>
      {tasks.length === 0 && <p className="muted">No tasks yet.</p>}
      {tasks.map((task) => (
        <label key={task.id} className={task.done ? 'task done' : 'task'}>
          <input type="checkbox" checked={task.done} disabled={task.done} onChange={() => onComplete(task.id)} />
          <span>
            {task.title}
            {task.origin === 'warning' && <span className="muted small"> · added by early warning</span>}
          </span>
        </label>
      ))}
    </Card>
  );
}
