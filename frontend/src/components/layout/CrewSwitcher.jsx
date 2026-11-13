import { useCrew } from '@/context/CrewContext.jsx';
import { Icon } from '@/components/common/Icons.jsx';

export default function CrewSwitcher() {
  const { selected, switchIdentity, error } = useCrew();
  if (error) {
    return (
      <div className="system-banner error-banner" role="alert">
        <Icon name="alert-triangle" size={16} color="var(--coral)" />
        <span>Cannot reach Core API: {error.message}</span>
      </div>
    );
  }
  // If selected, TopBar already presents the astronaut avatar and role.
  // This bar is rendered only if needed or kept as a subtle context bar on specific views.
  return null;
}
