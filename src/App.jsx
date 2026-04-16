import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-indigo-500' }
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-white text-sm shadow-lg ${colors[type] ?? colors.info}`}>
      {message}
    </div>
  )
}

// ── Decline Modal ─────────────────────────────────────────────────────────────
function DeclineModal({ onConfirm, onCancel }) {
  const [comment, setComment] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Decline Project</h2>
        <p className="text-sm text-slate-500 mb-4">Leave a note so the submitter knows why.</p>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="e.g. Image resolution too low, please resubmit..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
        />
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(comment)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginPage() {
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })
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
            <input
              type="email"
              value={credentials.email}
              onChange={e => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={e => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter password"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ projects }) {
  const total = projects.length
  const pending = projects.filter(p => p.status === 'Pending').length
  const approved = projects.filter(p => p.status === 'Approved').length
  const declined = projects.filter(p => p.status === 'Declined').length

  const stats = [
    { label: 'Total', value: total, color: 'text-slate-700' },
    { label: 'Pending', value: pending, color: 'text-amber-600' },
    { label: 'Approved', value: approved, color: 'text-green-600' },
    { label: 'Declined', value: declined, color: 'text-red-500' },
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
  const [projects, setProjects] = useState([])
  const [newProject, setNewProject] = useState({ name: '', type: 'Image' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [errors, setErrors] = useState({})
  const [declineTarget, setDeclineTarget] = useState(null)
  const [toast, setToast] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) fetchProjects()
  }, [session])

  const showToast = (message, type = 'success') => setToast({ message, type })

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setProjects(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewProject(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      if (errors.file) setErrors(prev => ({ ...prev, file: '' }))
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }

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
    setUploading(true)

    const ext = selectedFile.name.split('.').pop()
    const filePath = `${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, selectedFile)

    if (uploadError) {
      showToast('Upload failed: ' + uploadError.message, 'error')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath)

    const { data, error } = await supabase
      .from('projects')
      .insert([{ name: newProject.name.trim(), url: publicUrl, type: newProject.type, status: 'Pending' }])
      .select()

    if (!error) {
      setProjects(prev => [data[0], ...prev])
      setNewProject({ name: '', type: 'Image' })
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showToast('Project added successfully')
    } else {
      showToast('Failed to save project', 'error')
    }
    setUploading(false)
  }

  const handleApprove = async (id) => {
    const { error } = await supabase.from('projects').update({ status: 'Approved', comment: null }).eq('id', id)
    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Approved', comment: null } : p))
      showToast('Project approved')
    }
  }

  const handleDeclineConfirm = async (comment) => {
    const id = declineTarget
    const { error } = await supabase.from('projects').update({ status: 'Declined', comment: comment || null }).eq('id', id)
    if (!error) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'Declined', comment: comment || null } : p))
      showToast('Project declined')
    }
    setDeclineTarget(null)
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id))
      showToast('Project deleted')
    }
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const now = new Date().toLocaleString()

    doc.setFontSize(18)
    doc.setTextColor(30, 41, 59)
    doc.text('Project Tracker Report', 14, 20)

    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generated: ${now}`, 14, 28)
    doc.text(`Total: ${projects.length}  |  Pending: ${projects.filter(p => p.status === 'Pending').length}  |  Approved: ${projects.filter(p => p.status === 'Approved').length}  |  Declined: ${projects.filter(p => p.status === 'Declined').length}`, 14, 34)

    autoTable(doc, {
      startY: 42,
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columns: [
        { header: 'Project Name', dataKey: 'name' },
        { header: 'Type', dataKey: 'type' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Comment', dataKey: 'comment' },
        { header: 'Created', dataKey: 'created_at' },
      ],
      body: filteredProjects.map(p => ({
        name: p.name,
        type: p.type,
        status: p.status,
        comment: p.comment ?? '—',
        created_at: new Date(p.created_at).toLocaleDateString(),
      })),
      didDrawCell: (data) => {
        if (data.column.dataKey === 'status' && data.cell.section === 'body') {
          const status = data.cell.raw
          const colors = { Approved: [220, 252, 231], Declined: [254, 226, 226], Pending: [254, 243, 199] }
          const textColors = { Approved: [22, 101, 52], Declined: [153, 27, 27], Pending: [146, 64, 14] }
          if (colors[status]) {
            doc.setFillColor(...colors[status])
            doc.setTextColor(...textColors[status])
          }
        }
      },
    })

    doc.save(`project-report-${Date.now()}.pdf`)
  }

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status) => {
    const styles = {
      Approved: 'bg-green-100 text-green-800',
      Declined: 'bg-red-100 text-red-800',
      Pending: 'bg-amber-100 text-amber-700'
    }
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    )
  }

  const MediaPreview = ({ url, type }) => (
    <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
      {url ? (
        <img src={url} alt={type} className="w-full h-full object-cover" />
      ) : (
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
    </div>
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    )
  }

  if (!session) return <LoginPage />

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {declineTarget && (
        <DeclineModal
          onConfirm={handleDeclineConfirm}
          onCancel={() => setDeclineTarget(null)}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Project Tracker</h1>
            <p className="text-slate-500 mt-1">Manage and track your media projects</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Hi, <span className="font-medium text-slate-700">{session.user.email}</span>
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-all"
            >
              Logout
            </button>
          </div>
        </header>

        <StatsBar projects={projects} />

        {/* Add Project Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name</label>
              <input
                type="text"
                name="name"
                value={newProject.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                className={`w-full px-3 py-2.5 rounded-lg border ${errors.name ? 'border-red-500' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">File Type</label>
              <select
                name="type"
                value={newProject.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="Image">Image</option>
                <option value="Video">Video</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Upload File</label>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer text-sm text-center transition-all
                  ${errors.file ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'}
                  ${selectedFile ? 'border-indigo-400 bg-indigo-50' : ''}`}
              >
                {selectedFile ? (
                  <span className="text-indigo-600 truncate block">{selectedFile.name}</span>
                ) : (
                  <span className="text-slate-400">Drop or click to upload</span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
              {errors.file && <p className="text-red-500 text-xs mt-1">{errors.file}</p>}
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={uploading}
                className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all"
              >
                {uploading ? 'Uploading...' : 'Add Project'}
              </button>
            </div>
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white min-w-[140px]"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Declined">Declined</option>
            </select>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium text-sm transition-all whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
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
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">No projects found</p>
                        <p className="text-xs text-slate-400 mt-1">Add a new project or adjust your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <MediaPreview url={project.url} type={project.type} />
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-sm text-slate-800 font-medium line-clamp-1">{project.name}</span>
                        {project.comment && (
                          <p className="text-xs text-red-500 mt-0.5 line-clamp-2 italic">"{project.comment}"</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{project.type}</span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(project.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {project.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(project.id)}
                                className="px-3 py-1.5 text-xs font-medium text-green-600 border border-green-600 rounded-md hover:bg-green-600 hover:text-white transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setDeclineTarget(project.id)}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-all"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-300 rounded-md hover:bg-slate-600 hover:text-white transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
