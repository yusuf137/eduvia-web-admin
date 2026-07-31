import {
  REJECTION_REASON_KEYS,
  REJECTION_REASON_LABELS,
} from '../../../constants/rejectionReasons';

export default function RejectedInstitutionFilters({
  institutionSearch,
  onInstitutionSearchChange,
  phoneSearch,
  onPhoneSearchChange,
  reasonFilter,
  onReasonFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  recontactFilter,
  onRecontactFilterChange,
}) {
  return (
    <section className="page-card rejected-institution-filters">
      <div className="rejected-institution-filters__grid">
        <label>
          Kurum Ara
          <input
            type="search"
            placeholder="Kurum adı…"
            value={institutionSearch}
            onChange={(event) => onInstitutionSearchChange(event.target.value)}
          />
        </label>

        <label>
          Telefon Ara
          <input
            type="search"
            placeholder="Telefon numarası…"
            value={phoneSearch}
            onChange={(event) => onPhoneSearchChange(event.target.value)}
          />
        </label>

        <label>
          Red Sebebi
          <select value={reasonFilter} onChange={(event) => onReasonFilterChange(event.target.value)}>
            <option value="">Tüm sebepler</option>
            {REJECTION_REASON_KEYS.map((key) => (
              <option key={key} value={key}>
                {REJECTION_REASON_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Başlangıç Tarihi
          <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
        </label>

        <label>
          Bitiş Tarihi
          <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
        </label>

        <label>
          Tekrar Aranabilir
          <select
            value={recontactFilter}
            onChange={(event) => onRecontactFilterChange(event.target.value)}>
            <option value="">Tümü</option>
            <option value="yes">Evet</option>
            <option value="no">Hayır</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export function RejectedInstitutionStatCards({ stats, loading }) {
  if (loading) {
    return <p className="muted">Özet yükleniyor…</p>;
  }

  return (
    <div className="stat-grid">
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">Toplam Red Veren Kurum</span>
        </div>
        <div className="stat-card__value">{stats.total}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">Bu Ay Eklenen</span>
        </div>
        <div className="stat-card__value">{stats.addedThisMonth}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">En Yaygın Red Sebebi</span>
        </div>
        <div className="stat-card__value stat-card__value--text">{stats.mostCommonReason}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">Tekrar İletişime Açık</span>
        </div>
        <div className="stat-card__value">{stats.recontactOpen}</div>
      </article>
    </div>
  );
}
