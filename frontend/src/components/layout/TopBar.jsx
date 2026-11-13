import { Link, NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/check-in', label: 'Check-in' },
  { to: '/assistant', label: 'Assistant' },
  { to: '/photo-check', label: 'Photo check' },
  { to: '/crew', label: 'Crew' },
];

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="brand">Runtime in Space <span className="muted">Crew Health</span></span>
        <nav aria-label="Main" className="nav">
          {LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Link to="/emergency" className="emergency-button">Emergency</Link>
    </header>
  );
}
