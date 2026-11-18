import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil, Trash2, X, RefreshCw, ListOrdered } from 'lucide-react'

const emptyForm = {
  position_name: '',
  description: '',
  max_votes: 1,
  display_order: 0
}

export default function Positions() {
  const [elections, setElections] = useState([])
  const [positions, setPositions] = useState([])
  const [selectedElection, setSelectedElection] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const currentElection = elections.find(
    election => election.id === selectedElection
  )

  const canManage = currentElection &&
    ['draft', 'scheduled'].includes(currentElection.status)

  async function loadElections() {
    const { data, error } = await supabase
      .from('elections')
      .select('id, title, school_year, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      return
    }

    const latestElection = data?.[0] || null

    setElections(data || [])
    setSelectedElection(latestElection?.id || '')
  }

  async function loadPositions(electionId = selectedElection) {
    if (!electionId) {
      setPositions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('election_id', electionId)
      .order('display_order', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setPositions(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadElections()
  }, [])

  useEffect(() => {
    loadPositions(selectedElection)
  }, [selectedElection])

  function openAddForm() {
    setForm({
      ...emptyForm,
      display_order: positions.length + 1
    })
    setEditingId(null)
    setError('')
    setMessage('')
    setShowForm(true)
  }

  function openEditForm(position) {
    setForm({
      position_name: position.position_name,
      description: position.description || '',
      max_votes: position.max_votes,
      display_order: position.display_order ?? 0
    })

    setEditingId(position.id)
    setError('')
    setMessage('')
    setShowForm(true)
  }

  async function savePosition(e) {
    e.preventDefault()

    if (!selectedElection) {
      setError('Please select an election.')
      return
    }

    if (!canManage) {
      setError('Positions can only be changed for draft or scheduled elections.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const positionData = {
      election_id: selectedElection,
      position_name: form.position_name.trim(),
      description: form.description.trim() || null,
      max_votes: Number(form.max_votes),
      display_order: Number(form.display_order)
    }

    try {
      const result = editingId
        ? await supabase
            .from('positions')
            .update(positionData)
            .eq('id', editingId)
            .eq('election_id', selectedElection)
        : await supabase
            .from('positions')
            .insert(positionData)

      if (result.error) throw result.error

      setMessage(
        editingId
          ? 'Position successfully updated.'
          : 'Position successfully added.'
      )

      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
      await loadPositions()
    } catch (err) {
      setError(err.message || 'Unable to save position.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePosition(position) {
    if (!canManage) {
      setError('Positions cannot be deleted from an active or closed election.')
      return
    }

    const confirmed = window.confirm(
      `Delete the position "${position.position_name}"?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', position.id)
      .eq('election_id', selectedElection)

    if (error) {
      setError(
        `Unable to delete position. It may already have candidates assigned. ${error.message}`
      )
    } else {
      setMessage('Position deleted successfully.')
      await loadPositions()
    }
  }

  return (
    <div className="max-w-7xl">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Position Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage positions for each election.
          </p>
        </div>

        <button
          onClick={openAddForm}
          disabled={!canManage}
          className="bg-blue-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} />
          Add Position
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

      <section className="bg-white border rounded-xl p-5 mt-7">
        {currentElection ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current Election
            </p>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {currentElection.title}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              School Year: {currentElection.school_year || '—'} · Status: {currentElection.status}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            No election found. Create an election first in Election Management.
          </p>
        )}
      </section>

      {showForm && (
        <form
          onSubmit={savePosition}
          className="bg-white border rounded-2xl p-5 mt-6"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-lg">
              {editingId ? 'Edit Position' : 'Add New Position'}
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
                Position Name
              </label>
              <input
                required
                maxLength={100}
                value={form.position_name}
                onChange={e =>
                  setForm({ ...form, position_name: e.target.value })
                }
                placeholder="e.g. President"
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the responsibilities of this position."
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Maximum Votes
              </label>
              <input
                type="number"
                min="1"
                required
                value={form.max_votes}
                onChange={e =>
                  setForm({ ...form, max_votes: e.target.value })
                }
                className="w-full border rounded-lg p-3"
              />
              <p className="text-xs text-slate-500 mt-1">
                Usually 1 for a single-winner position.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={form.display_order}
                onChange={e =>
                  setForm({ ...form, display_order: e.target.value })
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
              {saving ? 'Saving...' : editingId ? 'Update Position' : 'Save Position'}
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
          Positions ({positions.length})
        </h2>

        <button
          onClick={() => loadPositions()}
          className="border rounded-lg p-3"
          title="Refresh"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
          Loading positions...
        </div>
      ) : !selectedElection ? (
        <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
          Create an election first before adding positions.
        </div>
      ) : positions.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <ListOrdered size={38} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800">
            No positions yet
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Add the positions for this election.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[650px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-4">Order</th>
                  <th className="p-4">Position</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Maximum Votes</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {positions.map(position => (
                  <tr key={position.id} className="border-t">
                    <td className="p-4">{position.display_order ?? 0}</td>
                    <td className="p-4 font-semibold">
                      {position.position_name}
                    </td>
                    <td className="p-4 text-slate-500">
                      {position.description || '—'}
                    </td>
                    <td className="p-4">{position.max_votes}</td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button
                          disabled={!canManage}
                          onClick={() => openEditForm(position)}
                          className="text-blue-700 disabled:opacity-40"
                          title="Edit"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          disabled={!canManage}
                          onClick={() => deletePosition(position)}
                          className="text-red-700 disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
