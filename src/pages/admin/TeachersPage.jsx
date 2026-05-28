import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase/firebaseConfig';
import ActiveFilterBar from '../../components/ActiveFilterBar';
import ConfirmModal from '../../components/admin/ConfirmModal';
import { inviteRoleLabel } from '../../services/inviteCodeService';
import {
  createInviteCode,
  deactivateUser,
  filterByActiveStatus,
  getTeachersByInstitution,
  getUserStatusBadgeClass,
  getUserStatusLabel,
  isUserActive,
  reactivateUser,
  softDeleteUser,
  updateUserProfile,
} from '../../services/userService';

const WEEKDAYS = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Çar' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 7, label: 'Paz' },
];

const emptyEditForm = () => ({
  name: '',
  phone: '',
  notes: '',
  isActive: true,
  availableDays: [],
  inviteRole: 'teacher',
});

export default function TeachersPage() {
  const { currentUserProfile } = useAuth();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const institutionName = currentUserProfile?.institutionName ?? '';
  const callerRole = currentUserProfile?.role ?? '';
  const currentUid = auth.currentUser?.uid ?? '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm());

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteRole, setInviteRole] = useState('teacher');

  const [confirm, setConfirm] = useState(null);

  const loadTeachers = useCallback(async () => {
    if (!institutionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await getTeachersByInstitution(institutionId);
      setRows(list);
    } catch (e) {
      setError(e?.message ?? 'Öğretmenler yüklenemedi.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadTeachers();
  }, [loadTeachers]);

  const filtered = useMemo(() => {
    const byStatus = filterByActiveStatus(rows, statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) {
      return byStatus;
    }
    return byStatus.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q),
    );
  }, [rows, statusFilter, search]);

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name === '(İsimsiz)' ? '' : user.name,
      phone: user.phone,
      notes: user.notes,
      isActive: user.isActive !== false,
      availableDays: user.availableDays ?? [],
      inviteRole: user.role === 'adminTeacher' ? 'adminTeacher' : 'teacher',
    });
    setEditOpen(true);
    setError('');
    setSuccess('');
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditUser(null);
    setEditForm(emptyEditForm());
  };

  const toggleDay = (day) => {
    setEditForm((f) => {
      const set = new Set(f.availableDays);
      if (set.has(day)) {
        set.delete(day);
      } else {
        set.add(day);
      }
      return { ...f, availableDays: [...set].sort((a, b) => a - b) };
    });
  };

  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUser) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await updateUserProfile(
        editUser.uid,
        {
          name: editForm.name,
          phone: editForm.phone,
          notes: editForm.notes,
          isActive: editForm.isActive,
          availableDays: editForm.availableDays,
        },
        institutionId,
      );
      setSuccess('Öğretmen güncellendi.');
      closeEdit();
      await loadTeachers();
    } catch (err) {
      setError(err?.message ?? 'Güncelleme başarısız.');
    } finally {
      setBusy(false);
    }
  };

  const onCreateInvite = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    setInviteCode('');
    try {
      const code = await createInviteCode({
        institutionId,
        institutionName,
        role: inviteRole,
        createdBy: currentUid,
        callerRole,
      });
      setInviteCode(code);
      setSuccess(`Davet kodu oluşturuldu: ${code}`);
    } catch (err) {
      setError(err?.message ?? 'Davet kodu oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirm?.user) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (confirm.type === 'deactivate') {
        await deactivateUser(confirm.user.uid, currentUid, institutionId);
        setSuccess('Öğretmen pasife alındı.');
      } else if (confirm.type === 'reactivate') {
        await reactivateUser(confirm.user.uid, currentUid, institutionId);
        setSuccess('Öğretmen tekrar aktif edildi.');
      } else if (confirm.type === 'delete') {
        await softDeleteUser(confirm.user.uid, currentUid, institutionId);
        setSuccess('Öğretmen silindi (geçmiş kayıtlar korunur).');
      }
      setConfirm(null);
      await loadTeachers();
    } catch (err) {
      setError(err?.message ?? 'İşlem başarısız.');
    } finally {
      setBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteCode);
      setSuccess(`Kod kopyalandı: ${inviteCode}`);
    } catch {
      setError('Kod kopyalanamadı.');
    }
  };

  return (
    <div className="page-stack users-page">
      <div className="page-toolbar users-page__toolbar">
        <div>
          <h2 className="page-heading">Öğretmenler</h2>
          <p className="muted">Kurumunuza kayıtlı öğretmenleri yönetin.</p>
        </div>
        <div className="users-page__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setInviteOpen(true)}>
            Davet Kodu Oluştur
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setInviteOpen(true)}>
            Öğretmen Ekle
          </button>
        </div>
      </div>

      <div className="users-page__filters">
        <input
          type="search"
          className="users-page__search"
          placeholder="Ad veya e-posta ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ActiveFilterBar value={statusFilter} onChange={setStatusFilter} />
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      {loading ? (
        <div className="page-card">
          <p className="muted">Öğretmenler yükleniyor…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="page-card">
          <p className="muted">{rows.length === 0 ? 'Henüz öğretmen yok.' : 'Bu filtrede öğretmen yok.'}</p>
        </div>
      ) : (
        <>
          <div className="page-card table-wrap users-page__table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ad Soyad</th>
                  <th>E-posta</th>
                  <th>Telefon</th>
                  <th>Rol</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.uid}>
                    <td>{row.name}</td>
                    <td>{row.email || '—'}</td>
                    <td>{row.phone || '—'}</td>
                    <td>{inviteRoleLabel(row.role)}</td>
                    <td>
                      <span className={`badge ${getUserStatusBadgeClass(row)}`}>
                        {getUserStatusLabel(row)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(row)}>
                          Düzenle
                        </button>
                        {isUserActive(row) ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              setConfirm({
                                type: 'deactivate',
                                user: row,
                                title: 'Pasife al',
                                message: `${row.name} pasife alınsın mı?`,
                              })
                            }>
                            Pasife Al
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() =>
                              setConfirm({
                                type: 'reactivate',
                                user: row,
                                title: 'Aktif et',
                                message: `${row.name} tekrar aktif edilsin mi?`,
                              })
                            }>
                            Aktif Et
                          </button>
                        )}
                        {!row.deletedAt ? (
                          <button
                            type="button"
                            className="btn btn--danger btn--sm"
                            onClick={() =>
                              setConfirm({
                                type: 'delete',
                                user: row,
                                title: 'Öğretmeni sil',
                                message:
                                  'Bu öğretmen silinecek/pasif hale getirilecek. Geçmiş kayıtlar korunur. Devam etmek istiyor musunuz?',
                              })
                            }>
                            Sil
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="users-page__cards">
            {filtered.map((row) => (
              <article key={row.uid} className="user-card">
                <div className="user-card__head">
                  <h3>{row.name}</h3>
                  <span className={`badge ${getUserStatusBadgeClass(row)}`}>{getUserStatusLabel(row)}</span>
                </div>
                <p className="muted">{row.email || '—'}</p>
                <p className="muted">{inviteRoleLabel(row.role)}</p>
                <div className="table-actions user-card__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(row)}>
                    Düzenle
                  </button>
                  {isUserActive(row) ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        setConfirm({
                          type: 'deactivate',
                          user: row,
                          title: 'Pasife al',
                          message: `${row.name} pasife alınsın mı?`,
                        })
                      }>
                      Pasife Al
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        setConfirm({
                          type: 'reactivate',
                          user: row,
                          title: 'Aktif et',
                          message: `${row.name} tekrar aktif edilsin mi?`,
                        })
                      }>
                      Aktif Et
                    </button>
                  )}
                  {!row.deletedAt ? (
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() =>
                        setConfirm({
                          type: 'delete',
                          user: row,
                          title: 'Öğretmeni sil',
                          message:
                            'Bu öğretmen silinecek/pasif hale getirilecek. Geçmiş kayıtlar korunur. Devam etmek istiyor musunuz?',
                        })
                      }>
                      Sil
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {editOpen && editUser ? (
        <div className="modal-backdrop" role="presentation" onClick={busy ? undefined : closeEdit}>
          <form
            className="modal-card user-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSaveEdit}>
            <h3>Öğretmen Düzenle</h3>
            <label>
              E-posta
              <input value={editUser.email || '—'} readOnly disabled />
            </label>
            <label>
              Rol
              <input value={inviteRoleLabel(editUser.role)} readOnly disabled />
            </label>
            <label>
              Ad Soyad *
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </label>
            <label>
              Telefon
              <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <label>
              Notlar
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <fieldset className="weekday-fieldset">
              <legend>Müsait günler</legend>
              <div className="weekday-grid">
                {WEEKDAYS.map((d) => (
                  <label key={d.value} className="weekday-chip">
                    <input
                      type="checkbox"
                      checked={editForm.availableDays.includes(d.value)}
                      onChange={() => toggleDay(d.value)}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Aktif öğretmen
            </label>
            <div className="modal-card__actions">
              <button type="button" className="btn btn--ghost" onClick={closeEdit} disabled={busy}>
                İptal
              </button>
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {inviteOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={busy ? undefined : () => setInviteOpen(false)}>
          <div
            className="modal-card user-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}>
            <h3>Öğretmen Ekle (Davet Kodu)</h3>
            <p className="muted">
              Yeni öğretmen veya admin öğretmen için davet kodu oluşturun. Kod mobil uygulamada kayıt sırasında
              kullanılır.
            </p>
            <label>
              Rol
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="teacher">Öğretmen</option>
                <option value="adminTeacher">Admin Öğretmen</option>
              </select>
            </label>
            {inviteCode ? (
              <p className="invite-code-display">
                Kod: <span className="code-pill">{inviteCode}</span>
              </p>
            ) : null}
            <div className="modal-card__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setInviteOpen(false)} disabled={busy}>
                Kapat
              </button>
              {inviteCode ? (
                <button type="button" className="btn btn--ghost" onClick={() => void copyInvite()}>
                  Kodu Kopyala
                </button>
              ) : null}
              <button type="button" className="btn btn--primary" onClick={() => void onCreateInvite()} disabled={busy}>
                {busy ? 'Oluşturuluyor…' : inviteCode ? 'Yeni Kod Üret' : 'Davet Kodu Oluştur'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.type === 'delete' ? 'Sil' : 'Onayla'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runConfirmAction()}
      />
    </div>
  );
}
