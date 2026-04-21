'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, Check, X, MessageSquare, FileText, Send, Pencil } from 'lucide-react'
import Link from 'next/link'

type Job = {
  id: string; title: string; description: string | null
  category: string; status: string; location_in_centre: string | null
  notes: string | null; created_at: string; approved_at: string | null
  completed_at: string | null
  centre: { id: string; name: string } | null
  logged_by_profile: { full_name: string } | null
  assigned_to_profile: { id: string; full_name: string } | null
  approved_by_profile: { full_name: string } | null
}
type Quote = { id: string; supplier_name: string; amount: number | null; description: string | null; file_url: string | null; file_name: string | null; is_selected: boolean; created_at: string }
type Comment = { id: string; content: string; created_at: string; author: { full_name: string } | null }
type Photo = { id: string; file_url: string; file_name: string | null; created_at: string }

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  logged:           { label: 'Logged',           bg: '#f5f5f5', color: '#888' },
  quotes_requested: { label: 'Quotes requested', bg: '#fef3dc', color: '#7d5a00' },
  quotes_uploaded:  { label: 'Quotes uploaded',  bg: '#eaf4fd', color: '#1a5276' },
  approved:         { label: 'Approved',         bg: '#e8f5ee', color: '#1a472a' },
  in_progress:      { label: 'In progress',      bg: '#f0eeff', color: '#4a3ab5' },
  completed:        { label: 'Completed',        bg: '#e8f5ee', color: '#1a472a' },
  rejected:         { label: 'Rejected',         bg: '#fff0f0', color: '#c0392b' },
}

export default function MaintenanceJobPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newQuote, setNewQuote] = useState({ supplier_name: '', amount: '', description: '' })
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)
    }

    const [jobRes, quotesRes, commentsRes, photosRes] = await Promise.all([
      supabase.from('maintenance_jobs').select(`
        id, title, description, category, status, location_in_centre, notes, created_at, approved_at, completed_at,
        centre:centres(id, name),
        logged_by_profile:profiles!maintenance_jobs_logged_by_fkey(full_name),
        assigned_to_profile:profiles!maintenance_jobs_assigned_to_fkey(id, full_name),
        approved_by_profile:profiles!maintenance_jobs_approved_by_fkey(full_name)
      `).eq('id', id).single(),
      supabase.from('maintenance_quotes').select('*').eq('job_id', id).order('created_at'),
      supabase.from('maintenance_comments').select('*, author:profiles(full_name)').eq('job_id', id).order('created_at'),
      supabase.from('maintenance_photos').select('*').eq('job_id', id).order('created_at'),
    ])

    setJob(jobRes.data as any)
    setQuotes(quotesRes.data ?? [])
    setComments(commentsRes.data as any ?? [])
    setPhotos(photosRes.data ?? [])
    setLoading(false)
  }

  async function updateStatus(status: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const updates: any = { status }
    if (status === 'approved') { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString() }
    if (status === 'completed') updates.completed_at = new Date().toISOString()
    await supabase.from('maintenance_jobs').update(updates).eq('id', id)

    // Send notification
    if (status === 'approved' || status === 'rejected') {
      await fetch('/api/maintenance-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: status === 'approved' ? 'job_approved' : 'job_rejected', job, assignee: job?.assigned_to_profile, centre: job?.centre }),
      }).catch(() => {})
    }
    loadAll()
  }

  async function addComment() {
    if (!comment.trim()) return
    setSubmittingComment(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('maintenance_comments').insert({
      job_id: id, content: comment, author_id: user?.id ?? null,
    })
    setComment('')
    setSubmittingComment(false)
    loadAll()
  }

  async function uploadQuote(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !newQuote.supplier_name) return
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const fileName = `${id}/${Date.now()}-${file.name}`
    const { data: uploadData } = await supabase.storage.from('maintenance').upload(fileName, file)
    const { data: { publicUrl } } = supabase.storage.from('maintenance').getPublicUrl(fileName)

    await supabase.from('maintenance_quotes').insert({
      job_id: id,
      supplier_name: newQuote.supplier_name,
      amount: newQuote.amount ? parseFloat(newQuote.amount) : null,
      description: newQuote.description || null,
      file_url: publicUrl,
      file_name: file.name,
      uploaded_by: user?.id ?? null,
    })
    await supabase.from('maintenance_jobs').update({ status: 'quotes_uploaded' }).eq('id', id)

    // Notify ops manager
    await fetch('/api/maintenance-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'quote_uploaded', job, centre: job?.centre, supplierName: newQuote.supplier_name }),
    }).catch(() => {})

    setNewQuote({ supplier_name: '', amount: '', description: '' })
    setShowQuoteForm(false)
    setUploading(false)
    e.target.value = ''
    loadAll()
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const fileName = `${id}/photos/${Date.now()}-${file.name}`
    await supabase.storage.from('maintenance').upload(fileName, file)
    const { data: { publicUrl } } = supabase.storage.from('maintenance').getPublicUrl(fileName)
    await supabase.from('maintenance_photos').insert({
      job_id: id, file_url: publicUrl, file_name: file.name, uploaded_by: user?.id ?? null,
    })
    setUploading(false)
    e.target.value = ''
    loadAll()
  }

  async function selectQuote(quoteId: string) {
    const supabase = createClient()
    await supabase.from('maintenance_quotes').update({ is_selected: false }).eq('job_id', id)
    await supabase.from('maintenance_quotes').update({ is_selected: true }).eq('id', quoteId)
    loadAll()
  }

  const inputStyle = { border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18' }
  const isOpsOrAdmin = currentUser?.role === 'ops_manager' || currentUser?.role === 'admin'

  if (loading) return <div className="p-8"><p style={{ color: '#888' }}>Loading...</p></div>
  if (!job) return <div className="p-8"><p style={{ color: '#888' }}>Job not found.</p></div>

  const statusConfig = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.logged
  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/dashboard/maintenance"
        className="inline-flex items-center gap-1.5 text-sm mb-6"
        style={{ color: '#888', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> All jobs
      </Link>

      {/* Job header */}
      <div className="rounded-xl p-6 mb-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-xl font-medium" style={{ color: '#1a1a18' }}>{job.title}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: statusConfig.bg, color: statusConfig.color }}>
                {statusConfig.label}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full capitalize"
                style={{ background: '#f5f5f5', color: '#888' }}>
                {job.category}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: '#aaa' }}>
              <span>{(job.centre as any)?.name}</span>
              {job.location_in_centre && <span>· {job.location_in_centre}</span>}
              <span>· Logged {formatDate(job.created_at)}</span>
              {(job.logged_by_profile as any)?.full_name && (
                <span>· by {(job.logged_by_profile as any).full_name}</span>
              )}
            </div>
          </div>

          {/* Status actions */}
          <div className="flex items-center gap-2 ml-4">
            {job.status === 'quotes_uploaded' && isOpsOrAdmin && (
              <>
                <button onClick={() => updateStatus('approved')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: 'var(--color-brand)' }}>
                  <Check size={13} /> Approve
                </button>
                <button onClick={() => updateStatus('rejected')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
                  <X size={13} /> Reject
                </button>
              </>
            )}
            {job.status === 'approved' && (
              <button onClick={() => updateStatus('in_progress')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: '#f0eeff', color: '#4a3ab5' }}>
                Mark in progress
              </button>
            )}
            {job.status === 'in_progress' && (
              <button onClick={() => updateStatus('completed')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-brand)' }}>
                <Check size={13} /> Mark complete
              </button>
            )}
          </div>
        </div>

        {job.description && (
          <p className="text-sm mb-4" style={{ color: '#555', lineHeight: 1.6 }}>{job.description}</p>
        )}

        <div className="grid grid-cols-3 gap-4 pt-4" style={{ borderTop: '1px solid #f0ede7' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: '#aaa' }}>Assigned to</p>
            <p className="text-sm" style={{ color: '#1a1a18' }}>
              {(job.assigned_to_profile as any)?.full_name ?? 'Unassigned'}
            </p>
          </div>
          {job.approved_at && (
            <div>
              <p className="text-xs mb-1" style={{ color: '#aaa' }}>Approved</p>
              <p className="text-sm" style={{ color: '#1a1a18' }}>{formatDate(job.approved_at)}</p>
            </div>
          )}
          {job.completed_at && (
            <div>
              <p className="text-xs mb-1" style={{ color: '#aaa' }}>Completed</p>
              <p className="text-sm" style={{ color: '#1a1a18' }}>{formatDate(job.completed_at)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Left: Quotes + Photos */}
        <div className="col-span-2 space-y-5">
          {/* Quotes */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #f0ede7', background: '#fafaf8' }}>
              <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>
                Quotes ({quotes.length})
              </p>
              <button onClick={() => setShowQuoteForm(!showQuoteForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}>
                <Upload size={12} /> Upload quote
              </button>
            </div>

            {showQuoteForm && (
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #f0ede7', background: '#f7f6f3' }}>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Supplier name *</label>
                    <input type="text" value={newQuote.supplier_name}
                      onChange={(e) => setNewQuote(q => ({ ...q, supplier_name: e.target.value }))}
                      placeholder="e.g. ABC Electrical"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Quote amount (USD)</label>
                    <input type="number" step="0.01" value={newQuote.amount}
                      onChange={(e) => setNewQuote(q => ({ ...q, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1" style={{ color: '#444' }}>Description</label>
                    <input type="text" value={newQuote.description}
                      onChange={(e) => setNewQuote(q => ({ ...q, description: e.target.value }))}
                      placeholder="Brief description of work quoted"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => fileRef.current?.click()}
                    disabled={!newQuote.supplier_name || uploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: 'var(--color-brand)' }}>
                    <Upload size={13} />
                    {uploading ? 'Uploading...' : 'Select file & upload'}
                  </button>
                  <button onClick={() => setShowQuoteForm(false)}
                    className="px-4 py-2 rounded-lg text-sm" style={{ color: '#666' }}>
                    Cancel
                  </button>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                  onChange={uploadQuote} className="hidden" />
              </div>
            )}

            {quotes.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: '#aaa' }}>No quotes uploaded yet.</p>
              </div>
            ) : (
              quotes.map((quote, i) => (
                <div key={quote.id} className="px-5 py-4"
                  style={{ borderTop: i > 0 ? '1px solid #f0ede7' : 'none', background: quote.is_selected ? '#f9fdf9' : 'transparent' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>{quote.supplier_name}</p>
                        {quote.is_selected && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: '#e8f5ee', color: '#1a472a' }}>
                            Selected
                          </span>
                        )}
                      </div>
                      {quote.amount && (
                        <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--color-brand)' }}>
                          ${quote.amount.toFixed(2)}
                        </p>
                      )}
                      {quote.description && (
                        <p className="text-xs mt-1" style={{ color: '#888' }}>{quote.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {quote.file_url && (
                        <a href={quote.file_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                          style={{ border: '1px solid #e2e0da', color: '#444', textDecoration: 'none' }}>
                          <FileText size={12} /> View
                        </a>
                      )}
                      {isOpsOrAdmin && !quote.is_selected && (
                        <button onClick={() => selectQuote(quote.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                          style={{ background: '#e8f5ee', color: '#1a472a' }}>
                          <Check size={12} /> Select
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Photos */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: photos.length > 0 ? '1px solid #f0ede7' : 'none', background: '#fafaf8' }}>
              <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>Photos ({photos.length})</p>
              <button onClick={() => photoRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                style={{ border: '1px solid #e2e0da', background: '#fff', color: '#444' }}>
                <Upload size={12} /> Add photo
              </button>
              <input ref={photoRef} type="file" accept="image/*"
                onChange={uploadPhoto} className="hidden" />
            </div>

            {photos.length > 0 && (
              <div className="p-4 grid grid-cols-3 gap-3">
                {photos.map(photo => (
                  <a key={photo.id} href={photo.file_url} target="_blank" rel="noreferrer">
                    <img src={photo.file_url} alt={photo.file_name ?? 'Photo'}
                      className="w-full rounded-lg object-cover"
                      style={{ height: 100, border: '1px solid #ece9e3' }} />
                  </a>
                ))}
              </div>
            )}

            {photos.length === 0 && (
              <div className="px-5 py-6 text-center">
                <p className="text-sm" style={{ color: '#aaa' }}>No photos yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Comments */}
        <div className="col-span-1">
          <div className="rounded-xl overflow-hidden sticky top-8"
            style={{ border: '1px solid #ece9e3', background: '#fff' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0ede7', background: '#fafaf8' }}>
              <p className="text-sm font-medium" style={{ color: '#1a1a18' }}>
                Comments ({comments.length})
              </p>
            </div>

            <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: '#aaa' }}>No comments yet.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-xs font-medium" style={{ color: '#1a1a18' }}>
                        {(c.author as any)?.full_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs" style={{ color: '#aaa' }}>
                        {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <p className="text-xs p-2.5 rounded-lg" style={{ background: '#f7f6f3', color: '#555', lineHeight: 1.5 }}>
                      {c.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3" style={{ borderTop: '1px solid #f0ede7' }}>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                style={{ border: '1px solid #e2e0da', background: '#fff', color: '#1a1a18', resize: 'none' }} />
              <button onClick={addComment} disabled={!comment.trim() || submittingComment}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--color-brand)' }}>
                <Send size={13} />
                {submittingComment ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}