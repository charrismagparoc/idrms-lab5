import { useState, useEffect } from 'react'
import { ConfirmModal } from '../components/Shared'
import { useApp } from '../context/AppContext'

const ROLE_CLS   = { Admin:'bd-danger', Staff:'bd-info' }
const STATUS_CLS = { Active:'bd-success', Inactive:'bd-neutral' }

// Derive correct status from role + is_online — single source of truth
function resolveStatus(role, is_online) {
  if (role === 'Admin') return 'Active'
  return is_online ? 'Active' : 'Inactive'
}

export default function UsersPage() {
  const { users, addUser, updateUser, deleteUser, reload } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [deleteId,  setDeleteId]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveErr,   setSaveErr]   = useState('')
  const EMPTY = { name:'', role:'Staff', email:'', status:'Inactive', password:'' }
  const [form, setForm] = useState({ ...EMPTY })

  // Auto-refresh every 30s to keep status in sync across web and mobile
  useEffect(() => {
    const interval = setInterval(() => { reload?.() }, 30000)
    return () => clearInterval(interval)
  }, [reload])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY })
    setSaveErr('')
    setShowModal(true)
  }

  const openEdit = u => {
    // Always enforce correct status — never show stale DB value
    const forcedStatus = resolveStatus(u.role, u.is_online)
    setEditing(u)
    setForm({ ...u, status: forcedStatus, password: '' })
    setSaveErr('')
    setShowModal(true)
  }

  const handleRoleChange = (role) => {
    // Auto-set status when role changes
    const autoStatus = role === 'Admin' ? 'Active' : 'Inactive'
    setForm(p => ({ ...p, role, status: autoStatus }))
  }

  const handleSave = async () => {
    if (!form.name.trim())  { setSaveErr('Full name is required.'); return }
    if (!form.email.trim()) { setSaveErr('Email is required.'); return }
    if (!editing && !form.password.trim()) { setSaveErr('Password is required for new users.'); return }

    // Always enforce correct status before saving — ignore whatever the form says
    const finalStatus = resolveStatus(form.role, editing ? editing.is_online : false)
    const payload = { ...form, status: finalStatus }

    setSaveErr('')
    setSaving(true)
    try {
      if (editing) await updateUser(editing.id, payload)
      else         await addUser(payload)
      setShowModal(false)
    } catch(e) { setSaveErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">User Management</div>
          <div className="page-sub">Manage system accounts and role-based access control</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} type="button">
          <i className="fa-solid fa-user-plus"></i> Add User
        </button>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Role</th><th>Email</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => {
                // Always derive displayed status from role + is_online — never trust raw u.status
                const displayStatus = resolveStatus(u.role, u.is_online)
                const isAdmin       = u.role === 'Admin'
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                        <div style={{ width:32, height:32, background:'linear-gradient(135deg,var(--blue),#3a91b8)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#fff', fontSize:13, flexShrink:0 }}>
                          {(u.name||'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600 }}>{u.name}</div>
                          <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'monospace' }}>{(u.id||'').slice(0,12)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={'badge ' + (ROLE_CLS[u.role]||'bd-neutral')}>{u.role}</span></td>
                    <td style={{ fontSize:12.5, color:'var(--t2)' }}>{u.email}</td>
                    <td>
                      {/* Status indicator — read-only, derived from is_online */}
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: displayStatus === 'Active' ? '#4caf50' : 'var(--t3)',
                          display: 'inline-block', flexShrink: 0
                        }} />
                        <span className={'badge ' + (STATUS_CLS[displayStatus]||'bd-neutral')}>
                          {displayStatus}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:'var(--t3)', whiteSpace:'nowrap' }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Never'}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(u)} type="button">
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        {/* Toggle button — disabled for Admin (always Active) */}
                        {!isAdmin && (
                          <button
                            type="button"
                            title="Status is auto-managed by login/logout"
                            disabled
                            className={'btn btn-sm btn-outline'}
                            style={{ opacity: 0.35, cursor: 'not-allowed' }}>
                            <i className={'fa-solid ' + (displayStatus === 'Active' ? 'fa-circle-check' : 'fa-ban')}></i>
                          </button>
                        )}
                        {!isAdmin && (
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(u.id)} type="button">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={6}><div className="empty"><i className="fa-solid fa-users-slash"></i><p>No users found.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteId && (
        <ConfirmModal title="Delete User" message="Remove this user account permanently? This cannot be undone."
          onConfirm={async () => { await deleteUser(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}

      {showModal && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>
                <i className="fa-solid fa-user-shield" style={{ color:'var(--blue)', marginRight:8 }}></i>
                {editing ? 'Edit User' : 'Add User'}
              </h3>
              <button className="modal-x" onClick={() => setShowModal(false)} type="button">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="form-2">
              <div className="form-grp full">
                <label>Full Name *</label>
                <input className="form-ctrl" placeholder="Full name..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>

              {/* Role — changing this auto-updates status */}
              <div className="form-grp">
                <label>Role</label>
                <select className="form-ctrl" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                  <option>Admin</option>
                  <option>Staff</option>
                </select>
              </div>

              {/* Status — read-only, system-controlled */}
              <div className="form-grp">
                <label style={{ display:'flex', alignItems:'center', gap:6 }}>
                  Status
                  <span style={{ fontSize:10, color:'var(--t3)', fontWeight:400, fontStyle:'italic' }}>
                    (auto)
                  </span>
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', borderRadius: 7,
                  background: form.status === 'Active' ? 'rgba(76,175,80,.08)' : 'var(--el,#1e2535)',
                  border: '1px solid ' + (form.status === 'Active' ? 'rgba(76,175,80,.25)' : 'var(--border)')
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: form.status === 'Active' ? '#4caf50' : 'var(--t3)'
                  }} />
                  <span style={{
                    fontWeight: 700, fontSize: 13,
                    color: form.status === 'Active' ? '#4caf50' : 'var(--t3)'
                  }}>
                    {form.status}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--t3)', marginLeft: 4 }}>
                    {form.role === 'Admin' ? '— Admin is always Active' : '— Auto-set on login / logout'}
                  </span>
                </div>
              </div>

              <div className="form-grp full">
                <label>Email Address *</label>
                <input className="form-ctrl" type="email" placeholder="user@kauswagan.gov.ph" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-grp full">
                <label>Password {editing && '(leave blank to keep current)'}</label>
                <input className="form-ctrl" type="password" placeholder="Password..." value={form.password||''} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
            </div>

            {saveErr && (
              <div style={{ color:'var(--red)', fontSize:12.5, margin:'8px 0', background:'rgba(232,72,85,.08)', padding:'8px 12px', borderRadius:7 }}>
                {saveErr}
              </div>
            )}

            <div style={{ marginTop:14, display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                  : <><i className="fa-solid fa-floppy-disk"></i> {editing ? 'Save Changes' : 'Add User'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}