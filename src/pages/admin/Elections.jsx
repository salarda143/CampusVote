
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
  Plus,
  CalendarDays,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Vote
} from 'lucide-react'

const emptyForm = {
  title: '',
  description: '',
  school_year: '',
  start_date: '',
  end_date: '',
  status: 'draft'
}

const statuses = ['draft', 'scheduled', 'active', 'closed']

function toLocalDateTime(value) {
  if (!value) return ''

  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16)
}

function formatDate(value) {
  return new Date(value).toLocaleString()
}

export default function Elections() {
  const [elections, setElections] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pendingStatusChange, setPendingStatusChange] = useState(null)

  async function loadElections() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('elections')
      .select('*')
      .order('start_date', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setElections(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadElections()
  }, [])

  function openAddForm() {
    setForm(emptyForm)
    setEditingId(null)
    setMessage('')
    setError('')
    setShowForm(true)
  }

  function openEditForm(election) {
    if (['active', 'closed'].includes(election.status)) {
      setError('Active or closed elections cannot be edited here.')
      return
    }

    setForm({
      title: election.title || '',
      description: election.description || '',
      school_year: election.school_year || '',
      start_date: toLocalDateTime(election.start_date),
      end_date: toLocalDateTime(election.end_date),
      status: election.status || 'draft'
    })

    setEditingId(election.id)
    setMessage('')
    setError('')
    setShowForm(true)
  }

  async function saveElection(e) {
    e.preventDefault()

    setSaving(true)
    setError('')
    setMessage('')

    if (new Date(form.end_date) <= new Date(form.start_date)) {
      setError('End date must be later than start date.')
      setSaving(false)
      return
    }

    try {
      const electionData = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        school_year: form.school_year.trim(),
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        status: form.status
      }

      let result

      if (editingId) {
        result = await supabase
          .from('elections')
          .update(electionData)
          .eq('id', editingId)
      } else {
        const { data: authData, error: authError } =
          await supabase.auth.getUser()

        if (authError) throw authError

        result = await supabase
          .from('elections')
          .insert({
            ...electionData,
            created_by: authData.user.id
          })
      }

      if (result.error) throw result.error

      setMessage(
        editingId
          ? 'Election successfully updated.'
          : 'Election successfully created.'
      )

      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)

      await loadElections()
    } catch (err) {
      setError(err.message || 'Unable to save election.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(election, newStatus) {
    setPendingStatusChange({ election, newStatus })
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) return

    const { election, newStatus } = pendingStatusChange
    setPendingStatusChange(null)

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('elections')
      .update({ status: newStatus })
      .eq('id', election.id)

    if (error) {
      setError(error.message)
    } else {
      setMessage(`Election status changed to ${newStatus}.`)
      await loadElections()
    }
  }

  async function deleteElection(election) {
    if (election.status !== 'draft') {
      setError('Only draft elections can be deleted.')
      return
    }

    const confirmed = window.confirm(
      `Delete "${election.title}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('elections')
      .delete()
      .eq('id', election.id)
      .eq('status', 'draft')

    if (error) {
      setError(error.message)
    } else {
      setMessage('Draft election deleted.')
      await loadElections()
    }
  }

  return (
    <div className="max-w-7xl">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Election Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage school elections.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="bg-blue-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Create Election
        </button>
      </div>

      {message && (
        <div className="mt-5 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-5 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={saveElection}
          className="bg-white border rounded-2xl p-5 mt-6"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-lg">
              {editingId ? 'Edit Election' : 'Create New Election'}
            </h2>

            <button
              type="button"
              onClick={() => setShowForm(false)}
            >
              <X />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Election Title
              </label>
              <input
                required
                maxLength={150}
                value={form.title}
                onChange={e =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="e.g. Supreme Student Government Election"
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Election details and information..."
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                School Year
              </label>
              <input
                required
                value={form.school_year}
                onChange={e =>
                  setForm({ ...form, school_year: e.target.value })
                }
                placeholder="2026-2027"
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Election Status
              </label>
              <select
                value={form.status}
                onChange={e =>
                  setForm({ ...form, status: e.target.value })
                }
                className="w-full border rounded-lg p-3"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Start Date and Time
              </label>
              <input
                required
                type="datetime-local"
                value={form.start_date}
                onChange={e =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                End Date and Time
              </label>
              <input
                required
                type="datetime-local"
                min={form.start_date || undefined}
                value={form.end_date}
                onChange={e =>
                  setForm({ ...form, end_date: e.target.value })
                }
                className="w-full border rounded-lg p-3"
              />
            </div>

          </div>

          <div className="flex gap-2 mt-5">
            <button
              disabled={saving}
              className="bg-blue-700 text-white px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Update Election' : 'Save Election'}
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border px-5 py-3 rounded-xl"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex justify-between items-center mt-7 mb-4">
        <h2 className="font-bold text-lg">
          Election Records ({elections.length})
        </h2>

        <button
          onClick={loadElections}
          className="border rounded-lg p-3"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
          Loading elections...
        </div>
      ) : elections.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <Vote size={38} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800">
            No elections yet
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Create your first school election.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {elections.map(election => (
            <div
              key={election.id}
              className="bg-white border rounded-xl p-5"
            >
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {election.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    School Year: {election.school_year}
                  </p>
                </div>

                <span className="text-xs font-semibold uppercase bg-slate-100 text-slate-700 px-3 py-2 rounded-full">
                  {election.status}
                </span>
              </div>

              {election.description && (
                <p className="text-sm text-slate-600 mt-3">
                  {election.description}
                </p>
              )}

              <div className="mt-4 space-y-2 text-sm text-slate-500">
                <p className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  Starts: {formatDate(election.start_date)}
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  Ends: {formatDate(election.end_date)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t">

                {['draft', 'scheduled'].includes(election.status) && (
                  <button
                    onClick={() => openEditForm(election)}
                    className="flex items-center gap-1 text-sm text-blue-700 border border-blue-200 px-3 py-2 rounded-lg"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                )}

                {election.status === 'draft' && (
                  <button
                    onClick={() => updateStatus(election, 'scheduled')}
                    className="text-sm text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg"
                  >
                    Schedule
                  </button>
                )}

                {election.status === 'scheduled' && (
                  <button
                    onClick={() => updateStatus(election, 'active')}
                    className="text-sm text-green-700 border border-green-200 px-3 py-2 rounded-lg"
                  >
                    Activate
                  </button>
                )}

                {election.status === 'active' && (
                  <button
                    onClick={() => updateStatus(election, 'closed')}
                    className="text-sm text-red-700 border border-red-200 px-3 py-2 rounded-lg"
                  >
                    Close Election
                  </button>
                )}

                {election.status === 'draft' && (
                  <button
                    onClick={() => deleteElection(election)}
                    className="flex items-center gap-1 text-sm text-red-700 border border-red-200 px-3 py-2 rounded-lg"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                )}

              </div>
            </div>
          ))}
        </div>
      )}

      {pendingStatusChange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingStatusChange(null)
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-confirmation-title"
          >
            <h2
              id="status-confirmation-title"
              className="text-lg font-bold text-slate-900"
            >
              Change &quot;{pendingStatusChange.election.title}&quot; status to{' '}
              {pendingStatusChange.newStatus.toUpperCase()}?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              This status change will affect how the election is managed.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingStatusChange(null)}
                className="rounded-xl border px-5 py-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className="rounded-xl bg-blue-700 px-5 py-3 text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
