export default function Card({ title, aside, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || aside) && (
        <header className="card-header">
          {title && <h2>{title}</h2>}
          {aside && <span className="muted small">{aside}</span>}
        </header>
      )}
      {children}
    </section>
  );
}
