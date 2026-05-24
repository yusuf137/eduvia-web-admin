const OPTIONS = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'passive', label: 'Pasif' },
];

export default function ActiveFilterBar({ value, onChange }) {
  return (
    <div className="filter-bar">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={`filter-bar__btn${value === opt.key ? ' filter-bar__btn--active' : ''}`}
          onClick={() => onChange(opt.key)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
