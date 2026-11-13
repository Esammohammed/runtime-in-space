import Card from '@/components/common/Card.jsx';
import { Icon } from '@/components/common/Icons.jsx';

export default function TaskList({ tasks = [], onComplete }) {
  const doneCount = tasks.filter((task) => task.done).length;

  return (
    <Card
      title="Today's Tasks"
      icon={<Icon name="checkin" size={18} color="var(--cyan)" />}
      aside={`${doneCount} of ${tasks.length} done`}
      className="tasks-card"
    >
      {tasks.length === 0 && <p className="muted">No tasks scheduled for today.</p>}
      <div className="tasks-items-list">
        {tasks.map((task) => (
          <label key={task.id} className={`task-item-row ${task.done ? 'task-done' : ''}`}>
            <input
              type="checkbox"
              className="astro-checkbox"
              checked={task.done}
              disabled={task.done}
              onChange={() => onComplete(task.id)}
            />
            <div className="task-text-group">
              <span className="task-title-text">{task.title}</span>
              {task.origin === 'warning' && (
                <span className="task-origin-badge">early warning</span>
              )}
            </div>
            {task.done && (
              <span className="task-done-check">
                <Icon name="check" size={14} color="var(--green)" />
              </span>
            )}
          </label>
        ))}
      </div>
    </Card>
  );
}
