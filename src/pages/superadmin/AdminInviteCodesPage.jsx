import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInstitutions } from '../../services/institutionService';
import {
  createAdminInviteCode,
  listAdminInviteCodes,
} from '../../services/inviteCodeService';

function formatDate(ts) {
  if (!ts?.toDate) {
    return '—';
  }
  return ts.toDate().toLocaleString('tr-TR');
}

export default function AdminInviteCodesPage() {
  const [institutions, setInstitutions] = useState([]);
  const [codes, setCodes] = useState([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [loadingInst, setLoadingInst] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId],
  );

  const loadCodes = useCallback(async (institutionId) => {
    setLoadingCodes(true);
    setError('');
    try {
      const list = await listAdminInviteCodes(institutionId || null);
      setCodes(list);
    } catch (e) {
      setError(e?.message ?? 'Davet kodları yüklenemedi.');
      setCodes([]);
    } finally {
      setLoadingCodes(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingInst(true);
    void listInstitutions()
      .then((list) => {
        if (!cancelled) {
          setInstitutions(list);
          if (list.length && !selectedInstitutionId) {
            setSelectedInstitutionId(list[0].id);
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? 'Kurumlar yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInst(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadCodes(selectedInstitutionId);
  }, [selectedInstitutionId, loadCodes]);

  const onCreateCode = async () => {
    if (!selectedInstitutionId) {
      setError('Önce bir kurum seçin.');
      return;
    }
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      const code = await createAdminInviteCode(
        selectedInstitutionId,
        selectedInstitution?.name ?? '',
      );
      setSuccess(`Admin davet kodu oluşturuldu: ${code}`);
      await loadCodes(selectedInstitutionId);
    } catch (e) {
      setError(e?.message ?? 'Kod oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-stack">
      <h2 className="page-heading">Admin Davet Kodları</h2>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      <div className="page-card form-row">
        <label className="form-row__grow">
          Kurum
          <select
            value={selectedInstitutionId}
            onChange={(e) => setSelectedInstitutionId(e.target.value)}
            disabled={loadingInst || institutions.length === 0}>
            <option value="">Kurum seçin</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.name} ({inst.slug})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!selectedInstitutionId || creating}
          onClick={() => void onCreateCode()}>
          {creating ? 'Oluşturuluyor…' : 'Admin Davet Kodu Oluştur'}
        </button>
      </div>

      {loadingInst ? (
        <p className="muted">Kurumlar yükleniyor…</p>
      ) : institutions.length === 0 ? (
        <div className="page-card">
          <p className="muted">Önce bir kurum oluşturun.</p>
        </div>
      ) : null}

      <div className="page-card table-wrap">
        {loadingCodes ? (
          <p className="muted">Davet kodları yükleniyor…</p>
        ) : codes.length === 0 ? (
          <p className="muted">Henüz admin davet kodu yok.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kod</th>
                <th>Kurum</th>
                <th>Durum</th>
                <th>Kullanan</th>
                <th>Kullanım tarihi</th>
                <th>Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code className="code-pill">{row.code}</code>
                  </td>
                  <td>{row.institutionName || '—'}</td>
                  <td>
                    <span className={`badge ${row.used ? 'badge--muted' : 'badge--ok'}`}>
                      {row.used ? 'Kullanıldı' : 'Bekliyor'}
                    </span>
                  </td>
                  <td>{row.usedBy || '—'}</td>
                  <td>{formatDate(row.usedAt)}</td>
                  <td>{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
