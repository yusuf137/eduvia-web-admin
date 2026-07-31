import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscriptionActionGuard } from '../../contexts/SubscriptionActionGuardContext';
import {
  ORG_INVITE_ROLES,
  createOrgInviteCode,
  inviteRoleLabel,
  listOrgInviteCodes,
} from '../../services/inviteCodeService';

function formatDate(ts) {
  if (!ts?.toDate) {
    return '—';
  }
  return ts.toDate().toLocaleString('tr-TR');
}

export default function InviteCodesPage() {
  const { currentUserProfile } = useAuth();
  const { ensureAllowed, resolveActionError } = useSubscriptionActionGuard();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const institutionName = currentUserProfile?.institutionName ?? '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copyHint, setCopyHint] = useState('');

  const [newRole, setNewRole] = useState('student');
  const [roleFilter, setRoleFilter] = useState('all');
  const [usedFilter, setUsedFilter] = useState('all');

  const loadCodes = useCallback(async () => {
    if (!institutionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await listOrgInviteCodes(institutionId);
      setRows(list);
    } catch (e) {
      setError(e?.message ?? 'Davet kodları yüklenemedi.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const filtered = useMemo(() => {
    let list = rows;
    if (roleFilter !== 'all') {
      list = list.filter((r) => r.role === roleFilter);
    }
    if (usedFilter === 'used') {
      list = list.filter((r) => r.used);
    } else if (usedFilter === 'unused') {
      list = list.filter((r) => !r.used);
    }
    return list;
  }, [rows, roleFilter, usedFilter]);

  const onCreate = async () => {
    if (!ensureAllowed()) {
      return;
    }
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      const code = await createOrgInviteCode({
        role: newRole,
        institutionId,
        institutionName,
        callerRole: currentUserProfile?.role ?? '',
      });
      setSuccess(`Davet kodu oluşturuldu: ${code}`);
      await loadCodes();
    } catch (e) {
      const msg = resolveActionError(e, 'Kod oluşturulamadı.');
      if (msg) setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyHint(`Kopyalandı: ${code}`);
      setTimeout(() => setCopyHint(''), 2000);
    } catch {
      setCopyHint('Kopyalama başarısız');
    }
  };

  return (
    <div className="page-stack">
      <h2 className="page-heading">Davet Kodları</h2>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}
      {copyHint ? <div className="alert alert--success">{copyHint}</div> : null}

      <div className="page-card form-row">
        <label className="form-row__grow">
          Rol
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            {ORG_INVITE_ROLES.map((r) => (
              <option key={r} value={r}>
                {inviteRoleLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--primary"
          disabled={creating || !institutionId}
          onClick={() => void onCreate()}>
          {creating ? 'Oluşturuluyor…' : 'Davet Kodu Oluştur'}
        </button>
      </div>

      <div className="filter-bar filter-bar--wrap">
        <span className="filter-bar__label">Rol:</span>
        <button
          type="button"
          className={`filter-bar__btn${roleFilter === 'all' ? ' filter-bar__btn--active' : ''}`}
          onClick={() => setRoleFilter('all')}>
          Tümü
        </button>
        {ORG_INVITE_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            className={`filter-bar__btn${roleFilter === r ? ' filter-bar__btn--active' : ''}`}
            onClick={() => setRoleFilter(r)}>
            {inviteRoleLabel(r)}
          </button>
        ))}
        <span className="filter-bar__label">Durum:</span>
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'unused', label: 'Kullanılmadı' },
          { key: 'used', label: 'Kullanıldı' },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`filter-bar__btn${usedFilter === opt.key ? ' filter-bar__btn--active' : ''}`}
            onClick={() => setUsedFilter(opt.key)}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="page-card table-wrap">
        {loading ? (
          <p className="muted">Davet kodları yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">{rows.length === 0 ? 'Henüz davet kodu yok.' : 'Bu filtrede kod yok.'}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Kullanan</th>
                <th>Kullanım</th>
                <th>Oluşturulma</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code className="code-pill">{row.code}</code>
                  </td>
                  <td>{inviteRoleLabel(row.role)}</td>
                  <td>
                    <span className={`badge ${row.used ? 'badge--muted' : 'badge--ok'}`}>
                      {row.used ? 'Kullanıldı' : 'Bekliyor'}
                    </span>
                  </td>
                  <td>{row.usedBy || '—'}</td>
                  <td>{formatDate(row.usedAt)}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => void onCopy(row.code)}
                      title="Panoya kopyala">
                      <Copy size={14} />
                      Kopyala
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
