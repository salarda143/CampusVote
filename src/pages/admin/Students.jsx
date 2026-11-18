import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import {
  Search,
  Plus,
  Upload,
  Users,
  RefreshCw,
  X,
  GraduationCap,
  UserCheck,
  Pencil,
  Trash2,
} from "lucide-react";

const emptyForm = {
  lrn: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  grade_level: "",
  section: "",
};

function normalizeGradeLevel(value) {
  const match = String(value ?? "").match(/\d+/);
  return match ? match[0] : String(value ?? "").trim();
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [elections, setElections] = useState([]);
  const [eligibilityIds, setEligibilityIds] = useState([]);
  const [votedStudentIds, setVotedStudentIds] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingDeleteStudent, setPendingDeleteStudent] = useState(null);

  const selectedElection = elections.find(
    (election) => election.id === selectedElectionId
  );

  const canManageEligibility =
    selectedElection &&
    ["draft", "scheduled", "active"].includes(selectedElection.status);

  async function loadStudents() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("last_name");

    if (error) {
      setError(error.message);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  }

  async function loadElections() {
    const { data, error } = await supabase
      .from("elections")
      .select("id, title, school_year, status");

    if (error) {
      setError(error.message);
      return;
    }

    const electionList = data || [];
    setElections(electionList);

    const activeElection =
      electionList.find((election) => election.status === "active") ||
      electionList[0];
    setSelectedElectionId(activeElection?.id || "");
  }

  async function loadEligibility(electionId) {
    if (!electionId) {
      setEligibilityIds([]);
      setVotedStudentIds([]);
      return;
    }

    const [eligibilityResult, participationResult] = await Promise.all([
      supabase
        .from("voter_eligibility")
        .select("student_id")
        .eq("election_id", electionId),
      supabase
        .from("voting_participation")
        .select("student_id")
        .eq("election_id", electionId),
    ]);

    if (eligibilityResult.error) {
      setError(eligibilityResult.error.message);
      setEligibilityIds([]);
      return;
    }

    if (participationResult.error) {
      setError(participationResult.error.message);
      setVotedStudentIds([]);
      return;
    }

    setEligibilityIds(
      (eligibilityResult.data || []).map((row) => row.student_id)
    );
    setVotedStudentIds(
      (participationResult.data || []).map((row) => row.student_id)
    );
  }

  useEffect(() => {
    loadStudents();
    loadElections();
  }, []);

  useEffect(() => {
    loadEligibility(selectedElectionId);
  }, [selectedElectionId]);

  useEffect(() => {
    if (!message && !error) return undefined;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
      setError("");
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [message, error]);

  async function addStudent(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const { error } = await supabase.from("students").insert({
      ...form,
      user_id: null,
      is_active: true,
    });

    if (error) {
      setError(
        error.code === "23505"
          ? "This LRN is already registered."
          : error.message
      );
    } else {
      setMessage("Student successfully registered.");
      setForm(emptyForm);
      setShowForm(false);
      await loadStudents();
    }

    setSaving(false);
  }

  async function toggleStatus(student) {
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("students")
      .update({ is_active: !student.is_active })
      .eq("id", student.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Student status updated.");
      await loadStudents();
    }
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setEditForm({
      lrn: student.lrn || "",
      first_name: student.first_name || "",
      middle_name: student.middle_name || "",
      last_name: student.last_name || "",
      grade_level: student.grade_level || "",
      section: student.section || "",
    });
    setError("");
    setMessage("");
  }

  async function updateStudent(e) {
    e.preventDefault();
    if (!editingStudent) return;
    
    const cleanedLRN = String(editForm.lrn).trim();
    if (!/^\d{12}$/.test(editForm.lrn)) {
      setError("LRN must contain exactly 12 digits.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("students")
      .update({
        lrn: editForm.lrn.trim(),
        first_name: editForm.first_name.trim(),
        middle_name: editForm.middle_name.trim() || null,
        last_name: editForm.last_name.trim(),
        grade_level: editForm.grade_level.trim(),
        section: editForm.section.trim(),
      })
      .eq("id", editingStudent.id);

    if (error) {
      setError(
        error.code === "23505"
          ? "This LRN is already registered to another student."
          : error.message
      );
    } else {
      setMessage("Student information successfully updated.");
      setEditingStudent(null);
      setEditForm(emptyForm);
      await loadStudents();
    }

    setSaving(false);
  }

  function deleteStudent(student) {
    setPendingDeleteStudent(student);
  }

  async function confirmDeleteStudent() {
    const student = pendingDeleteStudent;
    if (!student) return;

    setPendingDeleteStudent(null);
    const fullName = [
      student.first_name,
      student.middle_name,
      student.last_name,
    ].filter(Boolean).join(" ");

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const [eligibilityResult, participationResult] = await Promise.all([
        supabase
          .from("voter_eligibility")
          .select("id", { count: "exact", head: true })
          .eq("student_id", student.id),
        supabase
          .from("voting_participation")
          .select("student_id", { count: "exact", head: true })
          .eq("student_id", student.id),
      ]);

      if (eligibilityResult.error) throw eligibilityResult.error;
      if (participationResult.error) throw participationResult.error;

      const hasElectionHistory =
        (eligibilityResult.count || 0) > 0 ||
        (participationResult.count || 0) > 0;

      if (hasElectionHistory) {
        setError(
          "This student has election records (eligibility or voting participation), so permanent deletion is blocked to preserve election history. Keep the record; we can add an archive option instead."
        );
        return;
      }

      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", student.id);

      if (error) throw error;

      setSelectedStudentIds((current) =>
        current.filter((id) => id !== student.id)
      );
      setMessage(`${fullName} was successfully deleted.`);
      await loadStudents();
    } catch (err) {
      setError(err.message || "Unable to delete this student.");
    } finally {
      setSaving(false);
    }
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudentIds((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  }

  function toggleSelectAll() {
    const selectableIds = filteredStudents
      .filter((student) => student.is_active)
      .map((student) => student.id);
    const allSelected =
      selectableIds.length > 0 &&
      selectableIds.every((id) => selectedStudentIds.includes(id));

    setSelectedStudentIds((current) =>
      allSelected
        ? current.filter((id) => !selectableIds.includes(id))
        : [...new Set([...current, ...selectableIds])]
    );
  }

  async function updateSelectedEligibility(eligible) {
    if (!selectedElectionId) {
      setError("Please select an election first.");
      return;
    }

    if (!canManageEligibility) {
      setError(
        "Eligibility can be changed for draft, scheduled, or active elections. Closed elections are locked."
      );
      return;
    }

    const activeSelectedIds = selectedStudentIds.filter((studentId) =>
      students.some((student) => student.id === studentId && student.is_active)
    );

    if (!activeSelectedIds.length) {
      setError("Select at least one active student first.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (eligible) {
        const rows = activeSelectedIds.map((studentId) => ({
          election_id: selectedElectionId,
          student_id: studentId,
        }));
        const { error: insertError } = await supabase
          .from("voter_eligibility")
          .upsert(rows, {
            onConflict: "election_id,student_id",
            ignoreDuplicates: true,
          });

        if (insertError) throw insertError;

        setEligibilityIds((current) => [
          ...new Set([...current, ...activeSelectedIds]),
        ]);
        setMessage(`${activeSelectedIds.length} student(s) marked eligible.`);
      } else {
        const { error: deleteError } = await supabase
          .from("voter_eligibility")
          .delete()
          .eq("election_id", selectedElectionId)
          .in("student_id", activeSelectedIds);

        if (deleteError) throw deleteError;

        setEligibilityIds((current) =>
          current.filter((id) => !activeSelectedIds.includes(id))
        );
        setMessage(
          `${activeSelectedIds.length} student(s) marked not eligible.`
        );
      }

      setSelectedStudentIds([]);
    } catch (err) {
      setError(err.message || "Unable to update voter eligibility.");
    } finally {
      setSaving(false);
    }
  }

  async function importExcel(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new Error("The Excel file has no worksheet.");
      }

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      if (!data.length) {
        throw new Error("The Excel worksheet is empty.");
      }

      const required = [
        "lrn",
        "first_name",
        "last_name",
        "grade_level",
        "section",
      ];

      const normalizeHeader = (header) =>
        String(header)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "");

      const headers = Object.keys(data[0]).map(normalizeHeader);
      const missing = required.filter((field) => !headers.includes(field));

      if (missing.length) {
        throw new Error(`Missing Excel columns: ${missing.join(", ")}`);
      }

      const rows = data.map((row) => {
        const normalized = {};

        Object.keys(row).forEach((key) => {
          normalized[normalizeHeader(key)] = row[key];
        });

        const rawLrn = String(normalized.lrn ?? "")
          .trim()
          .replace(/[\s,-]/g, "");

        return {
          lrn: rawLrn,
          first_name: String(normalized.first_name ?? "").trim(),
          middle_name:
            String(normalized.middle_name ?? "").trim() || null,
          last_name: String(normalized.last_name ?? "").trim(),
          grade_level: String(normalized.grade_level ?? "").trim(),
          section: String(normalized.section ?? "").trim(),
          is_active: true,
        };
      });

      const isValid = (row) =>
        /^\d{12}$/.test(row.lrn) &&
        row.first_name &&
        row.last_name &&
        row.grade_level &&
        row.section;

      const invalidCount = rows.filter((row) => !isValid(row)).length;
      const valid = rows.filter(isValid);

      if (!valid.length) {
        throw new Error(
          "No valid student records found. Check the 12-digit LRN and required columns."
        );
      }

      const unique = [
        ...new Map(valid.map((row) => [row.lrn, row])).values(),
      ];

      let imported = 0;

      for (let i = 0; i < unique.length; i += 250) {
        const batch = unique.slice(i, i + 250);

        const { data: inserted, error } = await supabase
          .from("students")
          .upsert(batch, {
            onConflict: "lrn",
            ignoreDuplicates: true,
          })
          .select("id");

        if (error) throw error;
        imported += inserted?.length || 0;
      }

      setMessage(
        `${imported} new students imported. ${invalidCount} invalid rows skipped. Existing LRNs were skipped.`
      );

      await loadStudents();
    } catch (err) {
      setError(`Excel import failed: ${err.message}`);
      await loadStudents();
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  const grades = useMemo(
    () => [
      "All",
      ...new Set(
        ["7", "8", "9", "10", "11", "12", ...students.map((student) =>
          normalizeGradeLevel(student.grade_level)
        )]
          .filter(
            (grade) =>
              grade !== null && grade !== undefined && grade !== ""
          )
          .sort((a, b) =>
            String(a).localeCompare(String(b), undefined, {
              numeric: true,
            })
          )
      ),
    ],
    [students]
  );

  const normalizedSearch = search.trim().toLowerCase();

  const sections = useMemo(
    () => [
      "All",
      ...new Set(
        students
          .map((student) => student.section)
          .filter(
            (section) =>
              section !== null && section !== undefined && section !== ""
          )
          .sort((a, b) => String(a).localeCompare(String(b)))
      ),
    ],
    [students]
  );

  const filteredStudents = students
    .filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          student.lrn,
          student.first_name,
          student.middle_name,
          student.last_name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      const matchesGrade =
        gradeFilter === "All" ||
        normalizeGradeLevel(student.grade_level) === String(gradeFilter);
      const matchesSection =
        sectionFilter === "All" ||
        String(student.section) === String(sectionFilter);

      return matchesSearch && matchesGrade && matchesSection;
    })
    .sort((a, b) => {
      const gradeComparison =
        Number(normalizeGradeLevel(a.grade_level)) -
        Number(normalizeGradeLevel(b.grade_level));

      if (gradeComparison !== 0) return gradeComparison;

      return `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`
      );
    });

  const activeCount = students.filter((student) => student.is_active).length;
  const eligibleCount = eligibilityIds.length;
  const selectableStudentIds = filteredStudents
    .filter((student) => student.is_active)
    .map((student) => student.id);
  const allFilteredSelected =
    selectableStudentIds.length > 0 &&
    selectableStudentIds.every((id) => selectedStudentIds.includes(id));

  return (
    <div className="max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Student Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Register students and manage their election eligibility.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-white"
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Students"
          value={students.length}
          icon={<Users />}
        />
        <StatCard
          label="Active Students"
          value={activeCount}
          icon={<GraduationCap />}
        />
        <StatCard
          label="Inactive Students"
          value={students.length - activeCount}
          icon={<Users />}
        />
      </div>

      {message && (
        <div
          className="fixed right-5 top-5 z-50 max-w-sm rounded-lg bg-green-50 p-4 text-sm text-green-700 shadow-lg"
          role="status"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          className="fixed right-5 top-20 z-50 max-w-sm rounded-lg bg-red-50 p-4 text-sm text-red-700 shadow-lg"
          role="alert"
        >
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={addStudent}
          className="mt-6 rounded-2xl border bg-white p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Register New Student</h2>
            <button type="button" onClick={() => setShowForm(false)}>
              <X />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["lrn", "12-digit LRN"],
              ["first_name", "First Name"],
              ["middle_name", "Middle Name (Optional)"],
              ["last_name", "Last Name"],
              ["grade_level", "Grade Level"],
              ["section", "Section"],
            ].map(([name, label]) => (
              <div key={name}>
                <label className="mb-2 block text-sm font-medium">
                  {label}
                </label>
                <input
                  required={name !== "middle_name"}
                  maxLength={name === "lrn" ? 12 : 100}
                  inputMode={name === "lrn" ? "numeric" : undefined}
                  value={form[name]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [name]:
                        name === "lrn"
                          ? e.target.value.replace(/\D/g, "")
                          : e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          <button
            disabled={saving}
            className="mt-5 rounded-xl bg-blue-700 px-6 py-3 text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Register Student"}
          </button>
        </form>
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={updateStudent}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Edit Student Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update the student's registered details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close edit form"
              >
                <X />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["lrn", "12-digit LRN"],
                ["first_name", "First Name"],
                ["middle_name", "Middle Name (Optional)"],
                ["last_name", "Last Name"],
                ["grade_level", "Grade Level"],
                ["section", "Section"],
              ].map(([name, label]) => (
                <div key={name}>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {label}
                  </label>
                  <input
                    required={name !== "middle_name"}
                    maxLength={name === "lrn" ? 12 : 100}
                    inputMode={name === "lrn" ? "numeric" : undefined}
                    value={editForm[name]}
                    onChange={(e) =>
                      setEditForm((current) => ({
                        ...current,
                        [name]:
                          name === "lrn"
                            ? e.target.value.replace(/\\D/g, "")
                            : e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={label}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-xl border px-5 py-3 text-slate-700"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-700 px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="mt-7 rounded-2xl border bg-white p-5">
        <div className="mb-5 flex flex-col gap-3">
          {selectedElection && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
              <div className="text-sm text-slate-600">
                Selected election:{" "}
                <span className="font-semibold text-slate-900">
                  {selectedElection.title}
                </span>
                <span className="ml-2 capitalize">
                  ({selectedElection.status})
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                <UserCheck size={17} />
                {eligibleCount} Eligible Voter(s)
              </div>
            </div>
          )}

          {selectedElection && !canManageEligibility && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              This election is closed. Eligibility changes are disabled.
            </p>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-3 text-slate-400"
                size={19}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or LRN..."
                className="w-full rounded-xl border py-3 pl-10 pr-4"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-1">
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full rounded-xl border px-3 py-3"
              >
                {grades.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade === "All" ? "All Grade Levels" : grade}
                  </option>
                ))}
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full rounded-xl border px-3 py-3"
              >
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section === "All" ? "All Sections" : section}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              {selectedStudentIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => updateSelectedEligibility(true)}
                    disabled={saving || !canManageEligibility}
                    className="rounded-xl bg-green-700 px-4 py-3 text-white disabled:opacity-50"
                  >
                    Mark Eligible ({selectedStudentIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedEligibility(false)}
                    disabled={saving || !canManageEligibility}
                    className="rounded-xl bg-red-700 px-4 py-3 text-white disabled:opacity-50"
                  >
                    Mark Not Eligible
                  </button>
                </>
              )}

              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white">
                <Upload size={17} />
                Import Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={importExcel}
                />
              </label>

              <button
                onClick={() => {
                  loadStudents();
                  loadElections();
                  if (selectedElectionId) {
                    loadEligibility(selectedElectionId);
                  }
                }}
                className="rounded-xl border p-3"
                title="Refresh"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    disabled={
                      saving ||
                      !canManageEligibility ||
                      selectableStudentIds.length === 0
                    }
                    aria-label="Select all visible active students"
                    className="h-4 w-4 accent-blue-700"
                  />
                </th>
                <th className="p-3">LRN</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Grade</th>
                <th className="p-3">Section</th>
                <th className="p-3">Voter Eligibility</th>
                <th className="p-3">Voting Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="p-8 text-center text-slate-500"
                  >
                    No student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isEligible = eligibilityIds.includes(student.id);

                  return (
                    <tr key={student.id} className="border-t">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          disabled={
                            saving ||
                            !canManageEligibility ||
                            !student.is_active
                          }
                          aria-label={`Select ${student.first_name} ${student.last_name}`}
                          className="h-4 w-4 accent-blue-700"
                        />
                      </td>
                      <td className="p-3 font-medium">{student.lrn}</td>
                      <td className="p-3">
                        {student.last_name}, {student.first_name}{" "}
                        {student.middle_name || ""}
                      </td>
                      <td className="p-3">
                        {normalizeGradeLevel(student.grade_level)}
                      </td>
                      <td className="p-3">{student.section}</td>

                      <td className="p-3">
                        {!selectedElectionId ? (
                          <span className="text-xs text-slate-400">
                            Select election first
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${isEligible
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {isEligible ? "Eligible" : "Not Eligible"}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {!selectedElectionId || !isEligible ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                            Not Applicable
                          </span>
                        ) : votedStudentIds.includes(student.id) ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Voted
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            Not Voted
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 font-medium text-blue-700 hover:text-blue-900 disabled:opacity-50"
                          >
                            <Pencil size={15} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteStudent(student)}
                            disabled={saving}
                            className="inline-flex items-center gap-1 font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-400">
          Showing {filteredStudents.length} of {students.length} student
          records.
        </p>
      </section>

      {pendingDeleteStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingDeleteStudent(null);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-student-title"
          >
            <h2
              id="delete-student-title"
              className="text-lg font-bold text-slate-900"
            >
              Permanently delete{" "}
              {[
                pendingDeleteStudent.first_name,
                pendingDeleteStudent.middle_name,
                pendingDeleteStudent.last_name,
              ]
                .filter(Boolean)
                .join(" ")}{" "}
              (LRN: {pendingDeleteStudent.lrn})?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Students with election eligibility or voting participation
              records cannot be permanently deleted.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteStudent(null)}
                className="rounded-xl border px-5 py-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStudent}
                className="rounded-xl bg-red-700 px-5 py-3 text-white"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-3 text-blue-700">{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <h2 className="mt-1 text-2xl font-bold">{value}</h2>
    </div>
  );
}
