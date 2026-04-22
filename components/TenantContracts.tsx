'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Upload, Trash2, Download, Loader2 } from 'lucide-react'

type Contract = {
  id: string
  file_name: string
  file_path: string
  file_size: number | null
  created_at: string
}

export default function TenantContracts({ tenantId }: { tenantId: string }) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadContracts()
  }, [tenantId])

  async function loadContracts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('tenant_contracts')
      .select('id, file_name, file_path, file_size, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    setContracts(data ?? [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Only allow PDF, Word docs, and images
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      setError('Only PDF, Word (.doc/.docx), or image files are allowed.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.')
      return
    }

    setUploading(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const filePath = `${tenantId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filePath, file)

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { error: dbError } = await supabase.from('tenant_contracts').insert({
      tenant_id: tenantId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      uploaded_by: user?.id ?? null,
    })

    if (dbError) {
      setError(dbError.message)
      // Clean up orphaned storage file
      await supabase.storage.from('contracts').remove([filePath])
    } else {
      await loadContracts()
    }

    setUploading(false)
    // Reset input so same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDownload(contract: Contract) {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('contracts')
      .createSignedUrl(contract.file_path, 60 * 5) // 5 min expiry

    if (error || !data) {
      setError('Could not generate download link.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(contract: Contract) {
    if (!confirm(`Delete "${contract.file_name}"? This cannot be undone.`)) return
    setDeletingId(contract.id)
    const supabase = createClient()

    await supabase.storage.from('contracts').remove([contract.file_path])
    await supabase.from('tenant_contracts').delete().eq('id', contract.id)

    setContracts(prev => prev.filter(c => c.id !== contract.id))
    setDeletingId(null)
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #ece9e3' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium" style={{ color: '#888', letterSpacing: '0.05em' }}>CONTRACTS</p>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-brand-muted)', color: 'var(--color-brand)' }}
          >
            {uploading
              ? <><Loader2 size={12} className="animate-spin" /> Uploading...</>
              : <><Upload size={12} /> Upload contract</>
            }
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg mb-3"
          style={{ background: '#fff0f0', color: '#c0392b', border: '1px solid #fcc' }}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-xs" style={{ color: '#aaa' }}>Loading...</p>
      ) : contracts.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-6 rounded-lg cursor-pointer transition-colors"
          style={{ border: '1.5px dashed #e2e0da', background: '#fafaf8' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileText size={20} style={{ color: '#ccc', marginBottom: 8 }} />
          <p className="text-xs font-medium" style={{ color: '#888' }}>No contracts uploaded</p>
          <p className="text-xs mt-0.5" style={{ color: '#bbb' }}>Click to upload a PDF or Word doc</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {contracts.map(contract => (
            <li key={contract.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
              style={{ background: '#f7f6f3' }}>
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                style={{ background: '#ece9e3' }}>
                <FileText size={13} style={{ color: '#888' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate font-medium" style={{ color: '#1a1a18' }}>
                  {contract.file_name}
                </p>
                <p className="text-xs" style={{ color: '#aaa' }}>
                  {formatDate(contract.created_at)}{contract.file_size ? ` · ${formatSize(contract.file_size)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleDownload(contract)}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: '#888' }}
                  title="Download"
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ece9e3')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Download size={13} />
                </button>
                <button
                  onClick={() => handleDelete(contract)}
                  disabled={deletingId === contract.id}
                  className="p-1.5 rounded-md transition-colors disabled:opacity-40"
                  style={{ color: '#c0392b' }}
                  title="Delete"
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fff0f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {deletingId === contract.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}