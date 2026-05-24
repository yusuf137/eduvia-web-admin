export default function StatCard({ title, value, hint, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card__head">
        <span className="stat-card__title">{title}</span>
        {Icon ? <Icon size={20} className="stat-card__icon" /> : null}
      </div>
      <div className="stat-card__value">{value}</div>
      {hint ? <div className="stat-card__hint">{hint}</div> : null}
    </div>
  );
}
