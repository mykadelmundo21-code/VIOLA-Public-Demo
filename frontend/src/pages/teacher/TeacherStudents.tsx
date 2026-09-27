import { useEffect, useMemo, useRef, useState } from "react";

type Parent = {
  id: number;
  name: string;
  email: string | null;
  contact: string | null;
};

type Student = {
  id: number;
  student_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  name: string;
  email: string | null;
  contact: string | null;
  grade_level: "Grade 11" | "Grade 12";
  section: string;
  school_year: string;
  status: "active" | "inactive";
  parent: Parent | null;
};

type StudentForm = {
  student_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  contact: string;
  parent_name: string;
  parent_email: string;
  parent_contact: string;
  grade_level: "Grade 11" | "Grade 12" | "";
  section: string;
  school_year: string;
  status: "active" | "inactive";
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

function getAuthToken() {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

const initialForm: StudentForm = {
  student_id: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  contact: "",
  parent_name: "",
  parent_email: "",
  parent_contact: "",
  grade_level: "",
  section: "",
  school_year: "",
  status: "active",
};

export default function TeacherStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showOneStudent, setShowOneStudent] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const [form, setForm] = useState<StudentForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [uploadResult, setUploadResult] = useState<{
    created_count: number;
    duplicate_count: number;
    invalid_count: number;
    duplicates?: {
      row: number;
      student_id: string;
    }[];
    invalid_rows?: {
      row: number;
      student_id: string;
      errors: string[];
    }[];
  } | null>(null);

  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const [showStudentDetails, setShowStudentDetails] =
    useState(false);

  const [editingStudent, setEditingStudent] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getHeaders = () => {
    const token = getAuthToken();

    return {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchStudents = async () => {
    const token = getAuthToken();

    if (!token) {
      setError("You are not authenticated. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/teacher/students`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load students.",
        );
      }

      setStudents(data.students || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load students.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const searchTerm = search.toLowerCase().trim();

    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm) ||
        student.student_id
          .toLowerCase()
          .includes(searchTerm) ||
        student.section.toLowerCase().includes(searchTerm);

      const matchesGrade =
        gradeFilter === "All" ||
        student.grade_level === gradeFilter;

      return matchesSearch && matchesGrade;
    });
  }, [students, search, gradeFilter]);

  const activeStudents = students.filter(
    (student) => student.status === "active",
  );

  const handleFormChange = (
    field: keyof StudentForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openOneStudent = () => {
    setShowAddMenu(false);
    setShowBulkUpload(false);
    setShowOneStudent(true);
    setForm(initialForm);
    setFormError("");
    setSuccessMessage("");
  };

  const openBulkUpload = () => {
    setShowAddMenu(false);
    setShowOneStudent(false);
    setShowBulkUpload(true);
    setUploadFile(null);
    setUploadResult(null);
    setFormError("");
    setSuccessMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentDetails(true);
    setEditingStudent(false);
    setFormError("");
    setSuccessMessage("");
  };

  const startEditingStudent = () => {
    if (!selectedStudent) return;

    setForm({
      student_id: selectedStudent.student_id,
      first_name: selectedStudent.first_name,
      middle_name: selectedStudent.middle_name || "",
      last_name: selectedStudent.last_name,
      email: selectedStudent.email || "",
      contact: selectedStudent.contact || "",
      parent_name: selectedStudent.parent?.name || "",
      parent_email: selectedStudent.parent?.email || "",
      parent_contact: selectedStudent.parent?.contact || "",
      grade_level: selectedStudent.grade_level,
      section: selectedStudent.section,
      school_year: selectedStudent.school_year,
      status: selectedStudent.status,
    });

    setEditingStudent(true);
    setFormError("");
    setSuccessMessage("");
  };

  const closeStudentDetails = () => {
    if (saving) return;

    setShowStudentDetails(false);
    setSelectedStudent(null);
    setEditingStudent(false);
    setFormError("");
    setSuccessMessage("");
  };

  const closeModals = () => {
    if (saving || uploading) return;

    setShowOneStudent(false);
    setShowBulkUpload(false);
    setShowAddMenu(false);
    setFormError("");
    setSuccessMessage("");
    setUploadFile(null);
    setUploadResult(null);
  };

  const handleAddStudent = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const token = getAuthToken();

    if (!token) {
      setFormError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/teacher/students`,
        {
          method: "POST",
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: form.student_id.trim(),
            first_name: form.first_name.trim(),
            middle_name: form.middle_name.trim() || null,
            last_name: form.last_name.trim(),
            email: form.email.trim() || null,
            contact: form.contact.trim() || null,
            parent_name: form.parent_name.trim(),
            parent_email: form.parent_email.trim() || null,
            parent_contact: form.parent_contact.trim() || null,
            grade_level: form.grade_level,
            section: form.section.trim(),
            school_year: form.school_year.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          const firstError = Object.values(
            data.errors,
          ).flat()[0];

          throw new Error(
            typeof firstError === "string"
              ? firstError
              : "Please check the information entered.",
          );
        }

        throw new Error(
          data.message || "Unable to add student.",
        );
      }

      setSuccessMessage("Student added successfully.");
      setForm(initialForm);

      await fetchStudents();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to add student.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStudent = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!selectedStudent) return;

    const token = getAuthToken();

    if (!token) {
      setFormError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      setSuccessMessage("");

      const response = await fetch(
        `${API_BASE_URL}/teacher/students/${selectedStudent.id}`,
        {
          method: "PUT",
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: form.student_id.trim(),
            first_name: form.first_name.trim(),
            middle_name: form.middle_name.trim() || null,
            last_name: form.last_name.trim(),
            email: form.email.trim() || null,
            contact: form.contact.trim() || null,
            parent_name: form.parent_name.trim(),
            parent_email: form.parent_email.trim() || null,
            parent_contact: form.parent_contact.trim() || null,
            grade_level: form.grade_level,
            section: form.section.trim(),
            school_year: form.school_year.trim(),
            status: form.status,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          const firstError = Object.values(
            data.errors,
          ).flat()[0];

          throw new Error(
            typeof firstError === "string"
              ? firstError
              : "Please check the information entered.",
          );
        }

        throw new Error(
          data.message || "Unable to update student.",
        );
      }

      const updatedStudent = data.student as Student;

      setSelectedStudent(updatedStudent);
      setSuccessMessage(
        "Student information updated successfully.",
      );
      setEditingStudent(false);

      await fetchStudents();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to update student.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!uploadFile) {
      setFormError("Please select a CSV or Excel file.");
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setFormError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    try {
      setUploading(true);
      setFormError("");
      setSuccessMessage("");
      setUploadResult(null);

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await fetch(
        `${API_BASE_URL}/teacher/students/bulk`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to upload students.",
        );
      }

      setUploadResult({
        created_count: data.created_count || 0,
        duplicate_count: data.duplicate_count || 0,
        invalid_count: data.invalid_count || 0,
        duplicates: data.duplicates || [],
        invalid_rows: data.invalid_rows || [],
      });

      setSuccessMessage(
        "Student upload completed successfully.",
      );

      await fetchStudents();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to upload students.",
      );
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "student_id",
      "first_name",
      "middle_name",
      "last_name",
      "student_email",
      "student_contact",
      "parent_name",
      "parent_email",
      "parent_contact",
      "grade_level",
      "section",
      "school_year",
    ];

    const example = [
      "2026-00131",
      "Juan",
      "Dela",
      "Cruz",
      "juan@email.com",
      "09171234567",
      "Maria Cruz",
      "maria@email.com",
      "09181234567",
      "Grade 11",
      "STEM A",
      "2026-2027",
    ];

    const csv = [
      headers.join(","),
      example.join(","),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "viola_student_template.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const renderStudentForm = (
    isEdit: boolean,
  ) => (
    <form
      onSubmit={
        isEdit
          ? handleUpdateStudent
          : handleAddStudent
      }
      className="space-y-6 p-6"
    >
      {formError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">
            {formError}
          </p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/60 dark:bg-green-950/30">
          <p className="text-xs font-medium text-green-700 dark:text-green-400">
            {successMessage}
          </p>
        </div>
      )}

      <div>
        <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">
          Student Information
        </h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Student ID
            </label>

            <input
              type="text"
              value={form.student_id}
              onChange={(event) =>
                handleFormChange(
                  "student_id",
                  event.target.value,
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Grade Level
            </label>

            <select
              value={form.grade_level}
              onChange={(event) =>
                handleFormChange(
                  "grade_level",
                  event.target.value,
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">
                Select grade level
              </option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              First Name
            </label>

            <input
              type="text"
              value={form.first_name}
              onChange={(event) =>
                handleFormChange(
                  "first_name",
                  event.target.value,
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Middle Name
            </label>

            <input
              type="text"
              value={form.middle_name}
              onChange={(event) =>
                handleFormChange(
                  "middle_name",
                  event.target.value,
                )
              }
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Last Name
            </label>

            <input
              type="text"
              value={form.last_name}
              onChange={(event) =>
                handleFormChange(
                  "last_name",
                  event.target.value,
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Student Email
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                handleFormChange(
                  "email",
                  event.target.value,
                )
              }
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Student Contact
            </label>

            <input
              type="tel"
              value={form.contact}
              onChange={(event) =>
                handleFormChange(
                  "contact",
                  event.target.value,
                )
              }
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Section
            </label>

            <input
              type="text"
              value={form.section}
              onChange={(event) =>
                handleFormChange(
                  "section",
                  event.target.value,
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              School Year
            </label>

            <input
              type="text"
              value={form.school_year}
              onChange={(event) =>
                handleFormChange(
                  "school_year",
                  event.target.value,
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {isEdit && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Status
              </label>

              <select
                value={form.status}
                onChange={(event) =>
                  handleFormChange(
                    "status",
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
        <h3 className="mb-1 text-sm font-bold text-gray-900 dark:text-white">
          Parent/Guardian Information
        </h3>

        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Parent/Guardian name is required. Email and contact are optional.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Parent/Guardian Name
            </label>

            <input
              type="text"
              value={form.parent_name}
              onChange={(event) =>
                handleFormChange(
                  "parent_name",
                  event.target.value,
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Parent/Guardian Email
            </label>

            <input
              type="email"
              value={form.parent_email}
              onChange={(event) =>
                handleFormChange(
                  "parent_email",
                  event.target.value,
                )
              }
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Parent/Guardian Contact
            </label>

            <input
              type="tel"
              value={form.parent_contact}
              onChange={(event) =>
                handleFormChange(
                  "parent_contact",
                  event.target.value,
                )
              }
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end dark:border-gray-800">
        <button
          type="button"
          onClick={
            isEdit
              ? () => setEditingStudent(false)
              : closeModals
          }
          disabled={saving}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? isEdit
              ? "Saving..."
              : "Adding..."
            : isEdit
              ? "Save Changes"
              : "Add Student"}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Teacher Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            My Students
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View students assigned to your classes.
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setShowAddMenu((current) => !current)
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
          >
            <span className="text-lg leading-none">+</span>
            Add Student
          </button>

          {showAddMenu && (
            <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <button
                type="button"
                onClick={openOneStudent}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  +
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Add One Student
                  </p>

                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Add a single student record.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={openBulkUpload}
                className="flex w-full items-start gap-3 border-t border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  ↑
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Bulk Upload
                  </p>

                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Upload CSV or Excel file.
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/60 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Unable to load students
          </p>

          <p className="mt-1 text-xs text-red-700 dark:text-red-400">
            {error}
          </p>

          <button
            type="button"
            onClick={fetchStudents}
            className="mt-3 text-xs font-semibold text-red-700 underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Students
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : students.length}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Assigned students
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Active Students
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : activeStudents.length}
          </p>

          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Currently enrolled
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            <select
              value={gradeFilter}
              onChange={(event) =>
                setGradeFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="All">All Grade Levels</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  Student
                </th>

                <th className="px-6 py-4 font-semibold">
                  Student ID
                </th>

                <th className="px-6 py-4 font-semibold">
                  Grade & Section
                </th>

                <th className="px-6 py-4 font-semibold">
                  Parent/Guardian
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center"
                  >
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      Loading students...
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                            {student.name
                              .split(" ")
                              .map((name) => name[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {student.name}
                            </p>

                            {student.email && (
                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {student.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {student.student_id}
                      </td>

                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {student.grade_level} -{" "}
                        {student.section}
                      </td>

                      <td className="px-6 py-4">
                        {student.parent ? (
                          <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              {student.parent.name}
                            </p>

                            {student.parent.contact && (
                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {student.parent.contact}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No parent/guardian
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            student.status === "active"
                              ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {student.status === "active"
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            openStudentDetails(student)
                          }
                          className="font-semibold text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center"
                      >
                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                          No students found
                        </p>

                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {students.length === 0
                            ? "Add a student or upload a student list to get started."
                            : "Try changing your search or filter."}
                        </p>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {filteredStudents.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {students.length}
            </span>{" "}
            students
          </p>
        </div>
      </div>

      {showOneStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:border dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Add One Student
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Student and Parent/Guardian information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModals}
                className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {renderStudentForm(false)}
          </div>
        </div>
      )}

      {showStudentDetails && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:border dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                  Student Details
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {selectedStudent.name}
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {selectedStudent.student_id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeStudentDetails}
                className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            {editingStudent ? (
              renderStudentForm(true)
            ) : (
              <div className="space-y-6 p-6">
                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/30">
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">
                      {formError}
                    </p>
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/60 dark:bg-green-950/30">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400">
                      {successMessage}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">
                    Student Information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Student ID
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedStudent.student_id}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Full Name
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedStudent.name}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Email
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedStudent.email || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Contact
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedStudent.contact || "Not provided"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Grade Level
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedStudent.grade_level}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Section
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedStudent.section}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        School Year
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedStudent.school_year}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Status
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedStudent.status === "active"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {selectedStudent.status === "active"
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
                  <h3 className="mb-4 text-sm font-bold text-gray-900 dark:text-white">
                    Parent/Guardian Information
                  </h3>

                  {selectedStudent.parent ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Name
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedStudent.parent.name}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Email
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedStudent.parent.email ||
                            "Not provided"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Contact
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedStudent.parent.contact ||
                            "Not provided"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        No parent/guardian information
                      </p>

                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        Use Edit to add the parent/guardian information.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end dark:border-gray-800">
                  <button
                    type="button"
                    onClick={closeStudentDetails}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={startEditingStudent}
                    className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
                  >
                    Edit Student
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl dark:border dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Bulk Upload Students
                </h2>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Upload a CSV or Excel file containing student and parent/guardian information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModals}
                className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleBulkUpload}
              className="space-y-5 p-6"
            >
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/30">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">
                    {formError}
                  </p>
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/60 dark:bg-green-950/30">
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">
                    {successMessage}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800/60">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Need the template?
                    </p>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      The template includes all student and parent/guardian fields.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Download Template
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Required fields
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Student ID, name, grade level, section, school year, and Parent/Guardian Name.
                </p>

                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Student email/contact and Parent/Guardian email/contact are optional.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Student File
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  onChange={(event) => {
                    setUploadFile(
                      event.target.files?.[0] || null,
                    );
                    setFormError("");
                    setUploadResult(null);
                  }}
                  className="block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-red-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-red-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:file:bg-red-950/40 dark:file:text-red-400"
                />

                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Supported: CSV, XLSX, XLS. Maximum file size: 10 MB.
                </p>
              </div>

              {uploadResult && (
                <div className="space-y-3 rounded-xl border border-gray-200 p-5 dark:border-gray-700">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Upload Summary
                  </p>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/30">
                      <p className="text-xs text-green-700 dark:text-green-400">
                        Added
                      </p>

                      <p className="mt-1 text-xl font-bold text-green-800 dark:text-green-300">
                        {uploadResult.created_count}
                      </p>
                    </div>

                    <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Duplicates
                      </p>

                      <p className="mt-1 text-xl font-bold text-amber-800 dark:text-amber-300">
                        {uploadResult.duplicate_count}
                      </p>
                    </div>

                    <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Invalid
                      </p>

                      <p className="mt-1 text-xl font-bold text-red-800 dark:text-red-300">
                        {uploadResult.invalid_count}
                      </p>
                    </div>
                  </div>

                  {uploadResult.duplicates &&
                    uploadResult.duplicates.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Duplicate Student IDs
                        </p>

                        <div className="mt-2 max-h-28 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {uploadResult.duplicates.map(
                            (item) => (
                              <p
                                key={`${item.row}-${item.student_id}`}
                              >
                                Row {item.row}:{" "}
                                {item.student_id}
                              </p>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                  {uploadResult.invalid_rows &&
                    uploadResult.invalid_rows.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          Invalid Rows
                        </p>

                        <div className="mt-2 max-h-36 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {uploadResult.invalid_rows.map(
                            (item) => (
                              <div
                                key={`${item.row}-${item.student_id}`}
                                className="mb-2 last:mb-0"
                              >
                                <p className="font-semibold text-gray-700 dark:text-gray-300">
                                  Row {item.row}
                                  {item.student_id
                                    ? ` — ${item.student_id}`
                                    : ""}
                                </p>

                                {item.errors.map(
                                  (message, index) => (
                                    <p key={index}>
                                      {message}
                                    </p>
                                  ),
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={uploading}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading
                    ? "Uploading..."
                    : "Upload Students"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}