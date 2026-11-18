import { useEffect, useState } from 'react'
import { supabase, supabaseStorageBucket } from '../../lib/supabase'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  UserRound,
  Search,
  Upload
} from 'lucide-react'

const emptyForm = {
  position_id: '',
  first_name: '',
  last_name: '',
  grade_level: '',
  section: '',
  party_name: '',
  photo_url: '',
  platform: ''
}

export default function Candidates() {
  const [elections, setElections] = useState([])
  const [positions, setPositions] = useState([])
  const [candidates, setCandidates] = useState([])
  const [selectedElection, setSelectedElection] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')

  function getStoredPhotoPath(photoUrl) {
    if (!photoUrl) return null

    const marker =
      `/storage/v1/object/public/${supabaseStorageBucket}/`
    const markerIndex = photoUrl.indexOf(marker)

    return markerIndex === -1
      ? null
      : decodeURIComponent(photoUrl.slice(markerIndex + marker.length))
  }

  async function removeStoredPhoto(photoUrl) {
    const photoPath = getStoredPhotoPath(photoUrl)

    if (!photoPath) return

    const { error: removeError } = await supabase.storage
      .from(supabaseStorageBucket)
      .remove([photoPath])

    if (removeError) throw removeError
  }

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

  async function loadData(electionId = selectedElection) {
    if (!electionId) {
      setPositions([])
      setCandidates([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const [positionResult, candidateResult] = await Promise.all([
      supabase
        .from('positions')
        .select('*')
        .eq('election_id', electionId)
        .order('display_order', { ascending: true }),

      supabase
        .from('candidates')
        .select('*')
        .eq('election_id', electionId)
        .order('last_name', { ascending: true })
    ])

    if (positionResult.error) {
      setError(positionResult.error.message)
    } else {
      setPositions(positionResult.data || [])
    }

    if (candidateResult.error) {
      setError(candidateResult.error.message)
    } else {
      setCandidates(candidateResult.data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadElections()
  }, [])

  useEffect(() => {
    loadData(selectedElection)
  }, [selectedElection])

  function openAddForm() {
    setForm({
      ...emptyForm,
      position_id: positions[0]?.id || ''
    })
    setPhotoFile(null)
    setPhotoPreview('')
    setEditingId(null)
    setError('')
    setMessage('')
    setShowForm(true)
  }

  function openEditForm(candidate) {
    setForm({
      position_id: candidate.position_id,
      first_name: candidate.first_name || '',
      last_name: candidate.last_name || '',
      grade_level: candidate.grade_level || '',
      section: candidate.section || '',
      party_name: candidate.party_name || '',
      photo_url: candidate.photo_url || '',
      platform: candidate.platform || ''
    })
    setPhotoFile(null)
    setPhotoPreview(candidate.photo_url || '')

    setEditingId(candidate.id)
    setError('')
    setMessage('')
    setShowForm(true)
  }

  async function saveCandidate(e) {
    e.preventDefault()

    if (!canManage) {
      setError('Candidates can only be managed in draft or scheduled elections.')
      return
    }

    if (!form.position_id) {
      setError('Please select a position.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const previousPhotoUrl = form.photo_url.trim() || null

    try {
      let photoUrl = form.photo_url.trim() || null

      if (photoFile) {
        const fileExtension =
          photoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const filePath = `${selectedElection}/${crypto.randomUUID()}.${fileExtension}`
        const { error: uploadError } = await supabase.storage
          .from(supabaseStorageBucket)
          .upload(filePath, photoFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from(supabaseStorageBucket)
          .getPublicUrl(filePath)

        photoUrl = publicUrlData.publicUrl
      }

      const candidateData = {
        election_id: selectedElection,
        position_id: form.position_id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        grade_level: form.grade_level.trim() || null,
        section: form.section.trim() || null,
        party_name: form.party_name.trim() || null,
        photo_url: photoUrl,
        platform: form.platform.trim() || null
      }

      const result = editingId
        ? await supabase
            .from('candidates')
            .update(candidateData)
            .eq('id', editingId)
            .eq('election_id', selectedElection)
        : await supabase
            .from('candidates')
            .insert(candidateData)

      if (result.error) throw result.error
      if (previousPhotoUrl && previousPhotoUrl !== photoUrl) {
        await removeStoredPhoto(previousPhotoUrl)
      }

      setMessage(
        editingId
          ? 'Candidate successfully updated.'
          : 'Candidate successfully registered.'
      )

      setShowForm(false)
      setForm(emptyForm)
      setPhotoFile(null)
      setPhotoPreview('')
      setEditingId(null)

      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to save candidate.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCandidate(candidate) {
    if (!canManage) {
      setError('Candidates cannot be deleted from an active or closed election.')
      return
    }

    const confirmed = window.confirm(
      `Delete candidate ${candidate.first_name} ${candidate.last_name}?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    try {
      await removeStoredPhoto(candidate.photo_url)

      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidate.id)
        .eq('election_id', selectedElection)

      if (error) throw error

      setMessage('Candidate deleted successfully.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Unable to delete candidate.')
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    const keyword = search.toLowerCase()

    const position = positions.find(
      item => item.id === candidate.position_id
    )

    return (
      `${candidate.first_name} ${candidate.last_name}`
        .toLowerCase()
        .includes(keyword) ||
      (candidate.party_name || '').toLowerCase().includes(keyword) ||
      (position?.position_name || '').toLowerCase().includes(keyword)
    )
  })

  return (
    <div className="max-w-7xl">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Candidate Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Register and manage candidates for school elections.
          </p>
        </div>

        <button
          onClick={openAddForm}
          disabled={!canManage || positions.length === 0}
          className="bg-blue-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Plus size={18} />
          Add Candidate
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

      {selectedElection && positions.length === 0 && !loading && (
        <div className="mt-5 p-4 rounded-lg bg-amber-50 text-amber-800 text-sm">
          No positions found for this election. Create positions first in Position Management.
        </div>
      )}

      {showForm && (
        <form
          onSubmit={saveCandidate}
          className="bg-white border rounded-2xl p-5 mt-6"
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold text-lg">
              {editingId ? 'Edit Candidate' : 'Register New Candidate'}
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
                Election Position
              </label>
              <select
                required
                value={form.position_id}
                onChange={e =>
                  setForm({ ...form, position_id: e.target.value })
                }
                className="w-full border rounded-lg p-3"
              >
                <option value="">Select position</option>
                {positions.map(position => (
                  <option key={position.id} value={position.id}>
                    {position.position_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                First Name
              </label>
              <input
                required
                maxLength={100}
                value={form.first_name}
                onChange={e =>
                  setForm({ ...form, first_name: e.target.value })
                }
                className="w-full border rounded-lg p-3"
                placeholder="First name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Last Name
              </label>
              <input
                required
                maxLength={100}
                value={form.last_name}
                onChange={e =>
                  setForm({ ...form, last_name: e.target.value })
                }
                className="w-full border rounded-lg p-3"
                placeholder="Last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Grade Level
              </label>
              <input
                value={form.grade_level}
                onChange={e =>
                  setForm({ ...form, grade_level: e.target.value })
                }
                className="w-full border rounded-lg p-3"
                placeholder="e.g. Grade 10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Section
              </label>
              <input
                value={form.section}
                onChange={e =>
                  setForm({ ...form, section: e.target.value })
                }
                className="w-full border rounded-lg p-3"
                placeholder="e.g. Sampaguita"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Party Name (Optional)
              </label>
              <input
                value={form.party_name}
                onChange={e =>
                  setForm({ ...form, party_name: e.target.value })
                }
                className="w-full border rounded-lg p-3"
                placeholder="Enter party name"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Candidate Profile Photo (Optional)
              </label>
              <label
                htmlFor="candidate-photo"
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <Upload className="text-blue-700" size={24} />
                <span className="font-medium text-blue-700">
                  Click to upload a profile photo
                </span>
                <span className="text-xs text-slate-500">
                  PNG, JPG, or WebP up to 5 MB
                </span>
                <input
                  id="candidate-photo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0]

                    if (!file) return

                    if (!file.type.startsWith('image/')) {
                      setError('Please choose a valid image file.')
                      e.target.value = ''
                      return
                    }

                    if (file.size > 5 * 1024 * 1024) {
                      setError('The profile photo must be 5 MB or smaller.')
                      e.target.value = ''
                      return
                    }

                    setError('')
                    setPhotoFile(file)
                    setPhotoPreview(URL.createObjectURL(file))
                  }}
                  className="sr-only"
                />
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Click the upload area above to choose an image.
              </p>
              {photoPreview && (
                <div className="relative mt-3 w-fit">
                  <img
                    src={photoPreview}
                    alt="Candidate preview"
                    className="h-24 w-24 rounded-lg object-cover border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null)
                      setPhotoPreview('')
                      setForm({ ...form, photo_url: '' })
                    }}
                    className="absolute -right-2 -top-2 inline-flex items-center justify-center rounded-full bg-red-100 p-1 text-red-700 shadow-sm hover:bg-red-200"
                    title="Remove photo"
                    aria-label="Remove photo"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Campaign Platform (Optional)
              </label>
              <textarea
                rows={4}
                value={form.platform}
                onChange={e =>
                  setForm({ ...form, platform: e.target.value })
                }
                className="w-full border rounded-lg p-3"
                placeholder="Enter the candidate's goals, plans, and advocacy..."
              />
            </div>

          </div>

          <div className="flex gap-2 mt-5">
            <button
              disabled={saving}
              className="bg-blue-700 text-white px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Candidate'
                  : 'Register Candidate'}
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

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mt-7 mb-4">
        <h2 className="font-bold text-lg">
          Candidates ({filteredCandidates.length})
        </h2>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates..."
              className="border rounded-lg pl-10 pr-3 py-2 w-full"
            />
          </div>

          <button
            onClick={() => loadData()}
            className="border rounded-lg p-3"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border rounded-xl p-8 text-center text-slate-500">
          Loading candidates...
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white border rounded-xl p-10 text-center">
          <UserRound size={38} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-slate-800">
            No candidates found
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Register candidates for the selected election.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCandidates.map(candidate => {
            const position = positions.find(
              item => item.id === candidate.position_id
            )

            return (
              <div
                key={candidate.id}
                className="bg-white border rounded-xl p-5"
              >
                <div className="flex items-start gap-3">
                  {candidate.photo_url ? (
                    <img
                      src={candidate.photo_url}
                      alt={`${candidate.first_name} ${candidate.last_name}`}
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                      <UserRound size={28} className="text-slate-400" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900">
                      {candidate.first_name} {candidate.last_name}
                    </h3>
                    <p className="text-sm text-blue-700 font-medium">
                      {position?.position_name || 'Position unavailable'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {candidate.grade_level || 'No grade'} 
                      {candidate.section ? ` • ${candidate.section}` : ''}
                    </p>
                  </div>
                </div>

                {candidate.party_name && (
                  <p className="text-sm mt-4">
                    <span className="text-slate-500">Party:</span>{' '}
                    {candidate.party_name}
                  </p>
                )}

                {candidate.platform && (
                  <p className="text-sm text-slate-600 mt-3 line-clamp-3">
                    {candidate.platform}
                  </p>
                )}

                <div className="flex gap-3 border-t mt-4 pt-4">
                  <button
                    disabled={!canManage}
                    onClick={() => openEditForm(candidate)}
                    className="flex items-center gap-1 text-sm text-blue-700 disabled:opacity-40"
                  >
                    <Pencil size={15} />
                    Edit
                  </button>

                  <button
                    disabled={!canManage}
                    onClick={() => deleteCandidate(candidate)}
                    className="flex items-center gap-1 text-sm text-red-700 disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
