export default function Card({ title, aside, action, icon, children, className = '', ...props }) {
  return (
    <section className={`astro-card ${className}`} {...props}>
      {(title || aside || action || icon) && (
        <header className="astro-card-header">
          <div className="card-header-left">
            {icon && <span className="card-header-icon">{icon}</span>}
            {title && <h2 className="card-title">{title}</h2>}
          </div>
          <div className="card-header-right">
            {aside && <span className="card-aside-text">{aside}</span>}
            {action && <div className="card-action-element">{action}</div>}
          </div>
        </header>
      )}
      <div className="astro-card-content">{children}</div>
    </section>
  );
}
