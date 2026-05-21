export function SectionLead({ kicker, title, summary, pills = [] }) {
  return (
    <div className="lagrange-stage-intro">
      <div className="lagrange-stage-copy">
        <span className="lagrange-stage-kicker">{kicker}</span>
        <h3>{title}</h3>
        <p>{summary}</p>
      </div>
      {pills.length > 0 ? (
        <div className="lagrange-stage-pills">
          {pills.map((pill) => (
            <span key={pill} className="lagrange-stage-pill">
              {pill}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PanelCard({ title, summary, children, className = "" }) {
  return (
    <section className={`lagrange-card ${className}`.trim()}>
      {title || summary ? (
        <div className="lagrange-card-head">
          <div>
            {title ? <h4>{title}</h4> : null}
            {summary ? <p>{summary}</p> : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, hint, tone = "" }) {
  const className = tone ? `lagrange-kpi ${tone}` : "lagrange-kpi";
  return (
    <div className={className}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

export function ContentPageShell({
  kicker,
  title,
  summary,
  metaCards,
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
  children
}) {
  return (
    <div className="lagrange-page">
      <div className="lagrange-shell">
        <section className="lagrange-hero">
          <div className="lagrange-hero-head">
            <div className="lagrange-hero-copy">
              <span className="lagrange-kicker">{kicker}</span>
              <h2>{title}</h2>
              <p>{summary}</p>
            </div>
            <div className="lagrange-hero-meta">
              {metaCards.map((item) => (
                <div key={item.label} className="lagrange-meta-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  {item.hint ? <small>{item.hint}</small> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="lagrange-tabs" role="tablist" aria-label={ariaLabel}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`lagrange-tab${item.id === activeTab ? " active" : ""}`}
              onClick={() => onTabChange(item.id)}
              role="tab"
              aria-selected={item.id === activeTab}
            >
              <strong>{item.label}</strong>
              {item.hint ? <span>{item.hint}</span> : null}
            </button>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
