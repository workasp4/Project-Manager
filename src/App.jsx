import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-indigo-500' }
  return <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm shadow-lg ${colors[type] ?? colors.info}`}>{message}</div>
}

// ── Role Badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const styles = { admin: 'bg-purple-100 text-purple-700', reviewer: 'bg-blue-100 text-blue-700', viewer: 'bg-slate-100 text-slate-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[role] ?? styles.viewer}`}>{role}</span>
}

// ── Decline Modal ─────────────────────────────────────────────────────────────
function DeclineModal({ onConfirm, onCancel }) {
  const [comment, setComment] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Decline Project</h2>
        <p className="text-sm text-slate-500 mb-4">Leave a note so the submitter knows why.</p>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="e.g. Image resolution too low..." rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none" />
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => onConfirm(comment)} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg">Decline</button>
        </div>
      </div>
    </div>
  )
}

// ── Activity Log Panel ────────────────────────────────────────────────────────
function ActivityLogPanel({ onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
    const channel = supabase
      .channel('activity-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, payload => {
        setLogs(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const fetchLogs = async () => {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50)
    setLogs(data ?? [])
    setLoading(false)
  }

  const actionColor = (action) => {
    if (action.includes('Approved')) return 'text-green-600 bg-green-50'
    if (action.includes('Declined')) return 'text-red-600 bg-red-50'
    if (action.includes('Deleted')) return 'text-slate-500 bg-slate-50'
    return 'text-indigo-600 bg-indigo-50'
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">Activity Log</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading && <p className="text-sm text-slate-400 text-center">Loading...</p>}
          {!loading && logs.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No activity yet.</p>}
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5 ${actionColor(log.action)}`}>{log.action}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{log.project_name}</p>
                <p className="text-xs text-slate-400">{log.performed_by} · {new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── User Activity Panel ───────────────────────────────────────────────────────
function UserActivityPanel({ user, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('activity_log')
      .select('*')
      .eq('performed_by', user.email)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false) })
  }, [user.email])

  const actionColor = (action) => {
    if (action.includes('Approved')) return 'text-green-600 bg-green-50'
    if (action.includes('Declined')) return 'text-red-600 bg-red-50'
    if (action.includes('Deleted')) return 'text-slate-500 bg-slate-50'
    return 'text-indigo-600 bg-indigo-50'
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-800">User Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50">
          {[
            { label: 'Total', value: logs.length, color: 'text-slate-700' },
            { label: 'Approved', value: logs.filter(l => l.action.includes('Approved')).length, color: 'text-green-600' },
            { label: 'Declined', value: logs.filter(l => l.action.includes('Declined')).length, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading && <p className="text-sm text-slate-400 text-center">Loading...</p>}
          {!loading && logs.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No activity yet for this user.</p>}
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
              <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap mt-0.5 ${actionColor(log.action)}`}>{log.action}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 truncate">{log.project_name}</p>
                <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Role Selector with Save button ───────────────────────────────────────────
function RoleSelector({ user, onSave }) {
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const changed = role !== user.role

  const handleSave = async () => {
    setSaving(true)
    await onSave(user.id, role)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center gap-1.5">
      <select value={role} onChange={e => { setRole(e.target.value); setSaved(false) }}
        className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="admin">Admin</option>
        <option value="reviewer">Reviewer</option>
        <option value="viewer">Viewer</option>
      </select>
      {changed && (
        <button onClick={handleSave} disabled={saving}
          className="px-2 py-1 text-xs font-medium bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-md transition-all whitespace-nowrap">
          {saving ? '...' : 'Save'}
        </button>
      )}
      {saved && !changed && (
        <span className="text-xs text-green-500">✓</span>
      )}
    </div>
  )
}

// ── User Management Panel (Admin only) ────────────────────────────────────────
function UserManagementPanel({ onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'viewer' })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [activityUser, setActivityUser] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_roles').select('*').order('created_at', { ascending: true })
    setUsers(data ?? [])
    setLoading(false)
  }

  const handleRoleChange = async (id, role) => {
    await supabase.from('user_roles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  const handleDeleteUser = async (userId, id) => {
    await supabase.from('user_roles').delete().eq('id', id)
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!newUser.email.trim() || !newUser.password.trim()) {
      setFormError('Email and password are required')
      return
    }
    if (newUser.password.length < 6) {
      setFormError('Password must be at least 6 characters')
      return
    }
    setCreating(true)
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email: newUser.email.trim(), password: newUser.password, role: newUser.role }
    })
    if (error || data?.error) {
      setFormError(data?.error ?? error.message)
    } else {
      setFormSuccess(`${newUser.email} created successfully`)
      setNewUser({ email: '', password: '', role: 'viewer' })
      fetchUsers()
    }
    setCreating(false)
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">User Management</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Create user form */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <p className="text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide">Create New User</p>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="Email address"
                value={newUser.email}
                onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={newUser.password}
                onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="flex gap-3 items-center">
              <select
                value={newUser.role}
                onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="admin">Admin</option>
                <option value="reviewer">Reviewer</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit" disabled={creating}
                className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all">
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            {formSuccess && <p className="text-xs text-green-600">{formSuccess}</p>}
          </form>
        </div>

        {/* Existing users */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-3">Existing Users</p>
          {loading && <p className="text-sm text-slate-400 text-center">Loading...</p>}
          {!loading && users.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No users yet.</p>}
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{u.email}</p>
              </div>
              <button
                onClick={() => setActivityUser(u)}
                className="text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded-md transition-all whitespace-nowrap"
              >
                Activity
              </button>
              <RoleSelector user={u} onSave={handleRoleChange} />
              <button onClick={() => handleDeleteUser(u.user_id, u.id)}
                className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">Admin: full access · Reviewer: approve/decline · Viewer: read only</p>
        </div>
      </div>
    </div>
    {activityUser && <UserActivityPanel user={activityUser} onClose={() => setActivityUser(null)} />}
    </>
  )
}

// ── Comments Panel ────────────────────────────────────────────────────────────
function CommentsPanel({ project, currentUser, userRole, onClose }) {
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchComments()
    const channel = supabase.channel(`comments:${project.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `project_id=eq.${project.id}` },
        payload => setComments(prev => [...prev, payload.new]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [project.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [comments])

  const fetchComments = async () => {
    const { data } = await supabase.from('comments').select('*').eq('project_id', project.id).order('created_at', { ascending: true })
    setComments(data ?? [])
    setLoading(false)
  }

  const handleDelete = async (commentId) => {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    await supabase.from('comments').insert([{ project_id: project.id, user_email: currentUser, body: body.trim() }])
    setBody('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Comments</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{project.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading && <p className="text-sm text-slate-400 text-center">Loading...</p>}
          {!loading && comments.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No comments yet.</p>}
          {comments.map(c => (
            <div key={c.id} className={`flex flex-col ${c.user_email === currentUser ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${c.user_email === currentUser ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-800'}`}>{c.body}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">{c.user_email} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {(userRole === 'admin' || c.user_email === currentUser) && (
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-300 hover:text-red-400 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSend} className="px-5 py-4 border-t border-slate-200 flex gap-2">
          <input value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium">Send</button>
        </form>
      </div>
    </div>
  )
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ project, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${project.type === 'Video' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-emerald-500/30 text-emerald-200'}`}>
              {project.type}
            </span>
            <p className="text-white/80 text-sm font-medium truncate max-w-[200px] sm:max-w-md">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media */}
        <div className="flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(0,0,0,0.2)', minHeight: '200px' }}>
          {project.type === 'Video'
            ? <video src={project.url} controls autoPlay className="w-full max-h-[70vh] rounded-xl" />
            : <img src={project.url} alt={project.name} className="max-w-full max-h-[70vh] object-contain rounded-xl" />
          }
        </div>
      </div>

      {/* Hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">Press Esc or click outside to close</p>
    </div>
  )
}

// ── Project Detail / Gallery Panel ───────────────────────────────────────────
function ProjectDetailPanel({ project, canReview, isAdmin, onApprove, onDecline, onDelete, onClose, currentUser, userRole }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxAsset, setLightboxAsset] = useState(null)

  useEffect(() => {
    fetchAssets()
    const channel = supabase.channel(`assets:${project.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_assets', filter: `project_id=eq.${project.id}` },
        payload => setAssets(prev => [...prev, payload.new]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'project_assets', filter: `project_id=eq.${project.id}` },
        payload => setAssets(prev => prev.filter(a => a.id !== payload.old.id)))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [project.id])

  const fetchAssets = async () => {
    const { data } = await supabase.from('project_assets').select('*').eq('project_id', project.id).order('created_at', { ascending: true })
    // Fall back to project's own url if no assets yet
    if (data && data.length > 0) setAssets(data)
    else setAssets([{ id: 'legacy', url: project.url, thumbnail_url: project.thumbnail_url, type: project.type }])
    setLoading(false)
  }

  const handleDownloadAsset = async (url, name, idx) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const ext = url.split('.').pop().split('?')[0]
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${name}-${idx + 1}.${ext}`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      // fallback: open in new tab
      window.open(url, '_blank')
    }
  }

  const handleDownloadAll = async () => {
    for (let i = 0; i < assets.length; i++) {
      await handleDownloadAsset(assets[i].url, project.name, i)
      await new Promise(r => setTimeout(r, 400))
    }
  }

  const handleDeleteAsset = async (assetId) => {
    if (assetId === 'legacy') return
    await supabase.from('project_assets').delete().eq('id', assetId)
  }

  const getStatusBadge = (status) => {
    const styles = { Approved: 'bg-green-100 text-green-800', Declined: 'bg-red-100 text-red-800', Pending: 'bg-amber-100 text-amber-700' }
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-800">{project.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(project.status)}
              <span className="text-xs text-slate-400">{project.type}</span>
              <span className="text-xs text-slate-400">· {new Date(project.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Loading assets...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {assets.map((asset, idx) => (
                <div key={asset.id} className="group relative rounded-xl overflow-hidden bg-slate-100 aspect-video">
                  {asset.type === 'Video' ? (
                    <>
                      {asset.thumbnail_url
                        ? <img src={asset.thumbnail_url} alt="Video" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                      }
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center">
                          <svg className="w-4 h-4 text-slate-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <img src={asset.url} alt={`Asset ${idx + 1}`} className="w-full h-full object-cover" />
                  )}

                  {/* Always-visible action bar at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                    <span className="text-white/70 text-xs">{idx + 1}/{assets.length}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setLightboxAsset(asset)}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-all"
                        title="Preview"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      <button
                        onClick={() => handleDownloadAsset(asset.url, project.name, idx)}
                        className="w-7 h-7 rounded-full bg-white/20 hover:bg-indigo-500 flex items-center justify-center text-white transition-all"
                        title="Download"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      </button>
                      {isAdmin && asset.id !== 'legacy' && (
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="w-7 h-7 rounded-full bg-white/20 hover:bg-red-500 flex items-center justify-center text-white transition-all"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {project.comment && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs font-medium text-red-600 mb-0.5">Decline reason</p>
              <p className="text-sm text-red-700 italic">"{project.comment}"</p>
            </div>
          )}
        </div>

        {/* Actions footer */}
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">{assets.length} asset{assets.length !== 1 ? 's' : ''}</p>
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Download All
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canReview && (
              <>
                {project.status !== 'Approved' && (
                  <button onClick={() => { onApprove(project.id); onClose() }} className="px-4 py-2 text-sm font-medium text-green-600 border border-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all">Approve</button>
                )}
                {project.status !== 'Declined' && (
                  <button onClick={() => { onDecline(project.id); onClose() }} className="px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all">Decline</button>
                )}
              </>
            )}
            {isAdmin && (
              <button onClick={() => { onDelete(project.id); onClose() }} className="px-4 py-2 text-sm font-medium text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-600 hover:text-white transition-all">Delete</button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Asset lightbox */}
    {lightboxAsset && (
      <Lightbox
        project={{ name: project.name, type: lightboxAsset.type, url: lightboxAsset.url }}
        onClose={() => setLightboxAsset(null)}
      />
    )}
    </>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: credentials.email, password: credentials.password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-slate-800 mb-1">Project Tracker</h1>
        <p className="text-slate-500 text-sm mb-6">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={credentials.email} onChange={e => setCredentials(prev => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input type="password" value={credentials.password} onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))} placeholder="Enter password" className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" disabled={loading} className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ projects }) {
  const stats = [
    { label: 'Total', value: projects.length, color: 'text-slate-700' },
    { label: 'Pending', value: projects.filter(p => p.status === 'Pending').length, color: 'text-amber-600' },
    { label: 'Approved', value: projects.filter(p => p.status === 'Approved').length, color: 'text-green-600' },
    { label: 'Declined', value: projects.filter(p => p.status === 'Declined').length, color: 'text-red-500' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs text-slate-500 mb-1">{s.label}</p>
          <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userRole, setUserRole] = useState('viewer') // default to viewer until role is fetched
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({ name: '', type: 'Image' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10
  const [errors, setErrors] = useState({})
  const [declineTarget, setDeclineTarget] = useState(null)
  const [commentProject, setCommentProject] = useState(null)
  const [lightboxProject, setLightboxProject] = useState(null)
  const [detailProject, setDetailProject] = useState(null)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showUserMgmt, setShowUserMgmt] = useState(false)
  const [toast, setToast] = useState(null)
  const fileInputRef = useRef(null)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const compressImage = (file) => {
    return new Promise((resolve) => {
      // Skip compression for non-images
      if (!file.type.startsWith('image/')) { resolve(file); return }

      const MAX_WIDTH = 1280
      const MAX_HEIGHT = 1280
      const QUALITY = 0.75

      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let { width, height } = img

        // Scale down if needed
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg',
          QUALITY
        )
      }
      img.src = url
    })
  }

  const generateVideoThumbnail = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      const url = URL.createObjectURL(file)
      video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1) }
      video.onseeked = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = Math.round((video.videoHeight / video.videoWidth) * 640) || 360
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob(blob => resolve(new File([blob], 'thumb.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.8)
      }
      video.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      video.src = url
    })
  }
  const logActivity = async (action, project) => {
    await supabase.from('activity_log').insert([{
      project_id: project.id,
      project_name: project.name,
      action,
      performed_by: session.user.email
    }])
  }

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setAuthLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // Fetch role — fall back to admin if no role row exists (first user / owner)
  useEffect(() => {
    if (!session) return
    supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (data) setUserRole(data.role)
        else setUserRole('admin') // no row = owner, give full access
      })
  }, [session])

  // Fetch + realtime projects
  useEffect(() => {
    if (!session) return
    fetchProjects()
    const channel = supabase.channel('projects-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, payload => {
        setProjects(prev => prev.find(p => p.id === payload.new.id) ? prev : [payload.new, ...prev])
        showToast(`New project: ${payload.new.name}`, 'info')
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, payload => {
        setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'projects' }, payload => {
        setProjects(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [session])

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (!error) setProjects(data)
  }

  const handleLogout = async () => await supabase.auth.signOut()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewProject(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) { setSelectedFile(file); if (errors.file) setErrors(prev => ({ ...prev, file: '' })) }
  }

  const handleDrop = (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) setSelectedFile(file) }

  const validateForm = () => {
    const newErrors = {}
    if (!newProject.name.trim()) newErrors.name = 'Project name is required'
    if (!selectedFile) newErrors.file = 'Please select a file to upload'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    // Video size cap: 50MB
    if (selectedFile.type.startsWith('video/') && selectedFile.size > 50 * 1024 * 1024) {
      showToast('Video must be under 50MB', 'error')
      return
    }

    setUploading(true)
    showToast('Processing...', 'info')

    const isVideo = selectedFile.type.startsWith('video/')
    const fileToUpload = await compressImage(selectedFile)
    const originalKB = Math.round(selectedFile.size / 1024)
    const compressedKB = Math.round(fileToUpload.size / 1024)

    const ext = isVideo ? selectedFile.name.split('.').pop() : 'jpg'
    const filePath = `${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('media').upload(filePath, fileToUpload)
    if (uploadError) { showToast('Upload failed: ' + uploadError.message, 'error'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath)

    // Generate + upload video thumbnail
    let thumbnailUrl = null
    if (isVideo) {
      const thumbFile = await generateVideoThumbnail(selectedFile)
      if (thumbFile) {
        const thumbPath = `thumb_${Date.now()}.jpg`
        const { error: thumbErr } = await supabase.storage.from('media').upload(thumbPath, thumbFile)
        if (!thumbErr) {
          const { data: { publicUrl: tUrl } } = supabase.storage.from('media').getPublicUrl(thumbPath)
          thumbnailUrl = tUrl
        }
      }
    }

    const { data, error } = await supabase.from('projects')
      .insert([{ name: newProject.name.trim(), url: publicUrl, thumbnail_url: thumbnailUrl, type: newProject.type, status: 'Pending' }]).select()
    if (!error) {
      await logActivity('Added', data[0])
      // Also save to project_assets for gallery support
      await supabase.from('project_assets').insert([{
        project_id: data[0].id, url: publicUrl, thumbnail_url: thumbnailUrl, type: newProject.type
      }])
      setNewProject({ name: '', type: 'Image' }); setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      const savings = !isVideo && originalKB > compressedKB ? ` (compressed ${originalKB}KB → ${compressedKB}KB)` : ''
      showToast(`Project added${savings}`)
    } else { showToast('Failed to save project', 'error') }
    setUploading(false)
  }

  const handleApprove = async (id) => {
    const project = projects.find(p => p.id === id)
    const { error } = await supabase.from('projects').update({ status: 'Approved', comment: null }).eq('id', id)
    if (!error) { await logActivity('Approved', project); showToast('Project approved') }
    else showToast('Failed to approve', 'error')
  }

  const handleDeclineConfirm = async (comment) => {
    const project = projects.find(p => p.id === declineTarget)
    const { error } = await supabase.from('projects').update({ status: 'Declined', comment: comment || null }).eq('id', declineTarget)
    if (!error) { await logActivity('Declined', project); showToast('Project declined') }
    setDeclineTarget(null)
  }

  const handleDelete = async (id) => {
    const project = projects.find(p => p.id === id)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) { await logActivity('Deleted', project); showToast('Project deleted') }
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const now = new Date().toLocaleString()
    doc.setFontSize(18); doc.setTextColor(30, 41, 59); doc.text('Project Tracker Report', 14, 20)
    doc.setFontSize(10); doc.setTextColor(100, 116, 139)
    doc.text(`Generated: ${now}`, 14, 28)
    doc.text(`Total: ${projects.length}  |  Pending: ${projects.filter(p => p.status === 'Pending').length}  |  Approved: ${projects.filter(p => p.status === 'Approved').length}  |  Declined: ${projects.filter(p => p.status === 'Declined').length}`, 14, 34)
    autoTable(doc, {
      startY: 42,
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columns: [{ header: 'Project Name', dataKey: 'name' }, { header: 'Type', dataKey: 'type' }, { header: 'Status', dataKey: 'status' }, { header: 'Comment', dataKey: 'comment' }, { header: 'Created', dataKey: 'created_at' }],
      body: filteredProjects.map(p => ({ name: p.name, type: p.type, status: p.status, comment: p.comment ?? '—', created_at: new Date(p.created_at).toLocaleDateString() })),
    })
    doc.save(`project-report-${Date.now()}.pdf`)
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter
    const matchesType = typeFilter === 'All' || p.type === typeFilter
    
    let matchesMonth = true
    if (monthFilter !== 'All') {
      const projectDate = new Date(p.created_at)
      const projectMonth = `${projectDate.getFullYear()}-${String(projectDate.getMonth() + 1).padStart(2, '0')}`
      matchesMonth = projectMonth === monthFilter
    }
    
    return matchesSearch && matchesStatus && matchesMonth && matchesType
  })

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + PAGE_SIZE)

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, monthFilter, typeFilter])

  // Get unique months from projects for the dropdown
  const availableMonths = [...new Set(projects.map(p => {
    const d = new Date(p.created_at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }))].sort().reverse()

  const getStatusBadge = (status) => {
    const styles = { Approved: 'bg-green-100 text-green-800', Declined: 'bg-red-100 text-red-800', Pending: 'bg-amber-100 text-amber-700' }
    return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{status}</span>
  }

  const MediaPreview = ({ url, type, thumbnailUrl }) => (
    <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center relative">
      {type === 'Video' && thumbnailUrl ? (
        <>
          <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
              <svg className="w-3 h-3 text-slate-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </>
      ) : type === 'Video' ? (
        <div className="w-full h-full bg-slate-700 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
            <svg className="w-3 h-3 text-slate-700 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      ) : url ? (
        <img src={url} alt={type} className="w-full h-full object-cover" />
      ) : (
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
    </div>
  )

  const canReview = userRole === 'admin' || userRole === 'reviewer'
  const isAdmin = userRole === 'admin'

  if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500 text-sm">Loading...</p></div>
  if (!session) return <LoginPage />

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {declineTarget && <DeclineModal onConfirm={handleDeclineConfirm} onCancel={() => setDeclineTarget(null)} />}
      {commentProject && <CommentsPanel project={commentProject} currentUser={session.user.email} userRole={userRole} onClose={() => setCommentProject(null)} />}
      {lightboxProject && <Lightbox project={lightboxProject} onClose={() => setLightboxProject(null)} />}
      {detailProject && (
        <ProjectDetailPanel
          project={detailProject}
          canReview={canReview}
          isAdmin={isAdmin}
          onApprove={handleApprove}
          onDecline={(id) => setDeclineTarget(id)}
          onDelete={handleDelete}
          onClose={() => setDetailProject(null)}
          currentUser={session.user.email}
          userRole={userRole}
        />
      )}
      {showActivityLog && <ActivityLogPanel onClose={() => setShowActivityLog(false)} />}
      {showUserMgmt && <UserManagementPanel onClose={() => setShowUserMgmt(false)} />}

      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">Project Tracker</h1>
              <p className="text-slate-500 mt-0.5 text-sm hidden sm:block">Manage and track your media projects</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <RoleBadge role={userRole} />
              <button onClick={() => setShowActivityLog(true)} className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-all">Activity</button>
              {isAdmin && <button onClick={() => setShowUserMgmt(true)} className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-all">Users</button>}
              <button onClick={handleLogout} className="px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-all">Logout</button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1 sm:hidden">{session.user.email}</p>
        </header>

        <StatsBar projects={projects} />

        {/* Add Project Form — admin only */}
        {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name</label>
              <input type="text" name="name" value={newProject.name} onChange={handleInputChange} placeholder="Enter project name"
                className={`w-full px-3 py-2.5 rounded-lg border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">File Type</label>
              <select name="type" value={newProject.type} onChange={handleInputChange} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white">
                <option value="Image">Image</option>
                <option value="Video">Video</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Upload File</label>
              <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}
                className={`w-full px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer text-sm text-center transition-all ${errors.file ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'} ${selectedFile ? 'border-indigo-400 bg-indigo-50' : ''}`}>
                {selectedFile ? <span className="text-indigo-600 truncate block">{selectedFile.name} <span className="text-indigo-400">({Math.round(selectedFile.size / 1024)}KB)</span></span> : <span className="text-slate-400">Drop or click to upload</span>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
              {errors.file && <p className="text-red-500 text-xs mt-1">{errors.file}</p>}
            </div>
            <div className="md:col-span-1">
              <button type="submit" disabled={uploading} className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all">
                {uploading ? 'Uploading...' : 'Add Project'}
              </button>
            </div>
          </form>
        </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search projects..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white min-w-[140px]">
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Declined">Declined</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white min-w-[120px]">
              <option value="All">All Types</option>
              <option value="Image">Image</option>
              <option value="Video">Video</option>
            </select>
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white min-w-[140px]">
              <option value="All">All Months</option>
              {availableMonths.map(m => {
                const [year, month] = m.split('-')
                const label = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
                return <option key={m} value={m}>{label}</option>
              })}
            </select>
            <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium text-sm transition-all whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Project List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Mobile card view */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {paginatedProjects.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-500">
                <svg className="w-12 h-12 text-slate-300 mb-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm">No projects found</p>
              </div>
            ) : paginatedProjects.map(project => (
              <div key={project.id} className="p-4 space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="cursor-zoom-in shrink-0" onClick={() => setLightboxProject(project)}>
                    <MediaPreview url={project.url} type={project.type} thumbnailUrl={project.thumbnail_url} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium text-slate-800 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => setDetailProject(project)}
                    >{project.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{project.type}</p>
                    <div className="mt-1">{getStatusBadge(project.status)}</div>
                    {project.comment && <p className="text-xs text-red-500 mt-1 italic">"{project.comment}"</p>}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {canReview && (
                    <>
                      {project.status !== 'Approved' && <button onClick={() => handleApprove(project.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-600 rounded-md hover:bg-green-600 hover:text-white transition-all">Approve</button>}
                      {project.status !== 'Declined' && <button onClick={() => setDeclineTarget(project.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all">Decline</button>}
                    </>
                  )}
                  <button onClick={() => setCommentProject(project)} className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-600 hover:text-white transition-all">Comments</button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(project.id)} className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-300 rounded-md hover:bg-slate-600 hover:text-white transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Preview</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-sm">No projects found</p>
                      <p className="text-xs text-slate-400 mt-1">Add a new project or adjust your filters</p>
                    </div>
                  </td></tr>
                ) : (
                  paginatedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="cursor-zoom-in" onClick={() => setLightboxProject(project)}>
                          <MediaPreview url={project.url} type={project.type} thumbnailUrl={project.thumbnail_url} />
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span
                          className="text-sm text-slate-800 font-medium line-clamp-1 cursor-pointer hover:text-indigo-600 transition-colors"
                          onClick={() => setDetailProject(project)}
                        >{project.name}</span>
                        {project.comment && <p className="text-xs text-red-500 mt-0.5 line-clamp-2 italic">"{project.comment}"</p>}
                      </td>
                      <td className="px-4 py-3"><span className="text-sm text-slate-600">{project.type}</span></td>
                      <td className="px-4 py-3">{getStatusBadge(project.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {canReview && (
                            <>
                              {project.status !== 'Approved' && <button onClick={() => handleApprove(project.id)} className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-600 rounded-md hover:bg-green-600 hover:text-white transition-all">Approve</button>}
                              {project.status !== 'Declined' && <button onClick={() => setDeclineTarget(project.id)} className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all">Decline</button>}
                            </>
                          )}
                          <button onClick={() => setCommentProject(project)} className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-600 hover:text-white transition-all">Comments</button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(project.id)} className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-300 rounded-md hover:bg-slate-600 hover:text-white transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-slate-500">
              Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length} projects
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, idx) => p === '...'
                  ? <span key={`ellipsis-${idx}`} className="px-2 text-xs text-slate-400">…</span>
                  : <button key={p} onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${currentPage === p ? 'bg-indigo-500 text-white border-indigo-500' : 'text-slate-600 border-slate-300 hover:bg-slate-100'}`}>
                      {p}
                    </button>
                )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
