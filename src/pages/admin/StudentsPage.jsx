import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscriptionActionGuard } from '../../contexts/SubscriptionActionGuardContext';
import { auth } from '../../firebase/firebaseConfig';
import ActiveFilterBar from '../../components/ActiveFilterBar';
import ConfirmModal from '../../components/admin/ConfirmModal';
import {
  createInviteCode,
  deactivateUser,
  filterByActiveStatus,
  getStudentsByInstitution,
  getUserStatusBadgeClass,
  getUserStatusLabel,
  isUserActive,
  reactivateUser,
  softDeleteUser,
  updateUserProfile,
} from '../../services/userService';

const emptyEditForm = () => ({
  name: '',
  phone: '',
  parentName: '',
  parentPhone: '',
  notes: '',
  isActive: true,
});

export default function StudentsPage() {
  const { currentUserProfile } = useAuth();
  const { ensureAllowed, resolveActionError } = useSubscriptionActionGuard();
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
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  const [confirm, setConfirm] = useState(null);

  const loadStudents = useCallback(async () => {
    if (!institutionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await getStudentsByInstitution(institutionId);
      setRows(list);
    } catch (e) {
      setError(e?.message ?? 'Öğrenciler yüklenemedi.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

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
        row.phone.toLowerCase().includes(q) ||
        row.parentName.toLowerCase().includes(q) ||
        row.parentPhone.toLowerCase().includes(q),
    );
  }, [rows, statusFilter, search]);

  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name === '(İsimsiz)' ? '' : user.name,
      phone: user.phone,
      parentName: user.parentName,
      parentPhone: user.parentPhone,
      notes: user.notes,
      isActive: user.isActive !== false,
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

  const onSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUser) {
      return;
    }
    if (!ensureAllowed()) {
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
          parentName: editForm.parentName,
          parentPhone: editForm.parentPhone,
          notes: editForm.notes,
          isActive: editForm.isActive,
        },
        institutionId,
      );
      setSuccess('Öğrenci güncellendi.');
      closeEdit();
      await loadStudents();
    } catch (err) {
      const msg = resolveActionError(err, 'Güncelleme başarısız.');
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const onCreateInvite = async () => {
    if (!ensureAllowed()) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    setInviteCode('');
    try {
      const code = await createInviteCode({
        institutionId,
        institutionName,
        role: 'student',
        createdBy: currentUid,
        callerRole,
      });
      setInviteCode(code);
      setSuccess(`Öğrenci davet kodu oluşturuldu: ${code}`);
    } catch (err) {
      const msg = resolveActionError(err, 'Davet kodu oluşturulamadı.');
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirm?.user) {
      return;
    }
    if (!ensureAllowed()) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (confirm.type === 'deactivate') {
        await deactivateUser(confirm.user.uid, currentUid, institutionId);
        setSuccess('Öğrenci pasife alındı.');
      } else if (confirm.type === 'reactivate') {
        await reactivateUser(confirm.user.uid, currentUid, institutionId);
        setSuccess('Öğrenci tekrar aktif edildi.');
      } else if (confirm.type === 'delete') {
        await softDeleteUser(confirm.user.uid, currentUid, institutionId);
        setSuccess('Öğrenci silindi (geçmiş kayıtlar korunur).');
      }
      setConfirm(null);
      await loadStudents();
    } catch (err) {
      const msg = resolveActionError(err, 'İşlem başarısız.');
      if (msg) setError(msg);
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
          <h2 className="page-heading">Öğrenciler</h2>
          <p className="muted">Kurumunuza kayıtlı öğrencileri yönetin.</p>
        </div>
        <div className="users-page__actions">
          <button type="button" className="btn btn--ghost" onClick={() => setInviteOpen(true)}>
            Davet Kodu Oluştur
          </button>
          <button type="button" className="btn btn--primary" onClick={() => setInviteOpen(true)}>
            Öğrenci Ekle
          </button>
        </div>
      </div>

      <div className="users-page__filters">
        <input
          type="search"
          className="users-page__search"
          placeholder="Ad, e-posta, telefon veya veli ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ActiveFilterBar value={statusFilter} onChange={setStatusFilter} />
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      {loading ? (
        <div className="page-card">
          <p className="muted">Öğrenciler yükleniyor…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="page-card">
          <p className="muted">{rows.length === 0 ? 'Henüz öğrenci yok.' : 'Bu filtrede öğrenci yok.'}</p>
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
                  <th>Veli</th>
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
                    <td>
                      {row.parentName || row.parentPhone
                        ? `${row.parentName || '—'}${row.parentPhone ? ` · ${row.parentPhone}` : ''}`
                        : '—'}
                    </td>
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
                                message: `${row.name} pasife alınsın mı? Yoklama ve yeni ders atamalarında görünmez.`,
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
                                title: 'Öğrenciyi sil',
                                message:
                                  'Bu öğrenci silinecek/pasif hale getirilecek. Geçmiş kayıtlar korunur. Devam etmek istiyor musunuz?',
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
                <p className="muted">Tel: {row.phone || '—'}</p>
                <p className="muted">
                  Veli: {row.parentName || '—'}
                  {row.parentPhone ? ` · ${row.parentPhone}` : ''}
                </p>
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
                          title: 'Öğrenciyi sil',
                          message:
                            'Bu öğrenci silinecek/pasif hale getirilecek. Geçmiş kayıtlar korunur. Devam etmek istiyor musunuz?',
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
            <h3>Öğrenci Düzenle</h3>
            <label>
              E-posta
              <input value={editUser.email || '—'} readOnly disabled />
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
              Veli Adı
              <input
                value={editForm.parentName}
                onChange={(e) => setEditForm((f) => ({ ...f, parentName: e.target.value }))}
              />
            </label>
            <label>
              Veli Telefonu
              <input
                value={editForm.parentPhone}
                onChange={(e) => setEditForm((f) => ({ ...f, parentPhone: e.target.value }))}
              />
            </label>
            <label>
              Notlar
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Aktif öğrenci
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
            <h3>Öğrenci Ekle (Davet Kodu)</h3>
            <p className="muted">
              Web panelden doğrudan hesap açılmaz. Öğrenci bilgilerini kayıt sırasında mobil uygulamada girer.
              Aşağıdan tek kullanımlık davet kodu oluşturup öğrenciyle paylaşın.
            </p>
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
