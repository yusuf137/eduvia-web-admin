export default function PagePlaceholder({ title, description }) {
  return (
    <div className="page-card">
      <h2>{title}</h2>
      <p className="page-card__desc">{description}</p>
      <div className="page-card__badge">Yakında</div>
    </div>
  );
}
