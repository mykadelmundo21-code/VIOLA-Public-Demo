import type { FormEvent } from "react";
import { useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

type Student = {
  id: number;
  student_id: string;
  name: string;
  grade_level: string;
  section: string;
};

type ViolationType = {
  id: number;
  category: string | null;
  name: string;
};

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

export default function TeacherViolations() {
  const [students, setStudents] = useState<Student[]>([]);
  const [violationTypes, setViolationTypes] = useState<
    ViolationType[]
  >([]);

  const [studentId, setStudentId] = useState("");
  const [violationTypeId, setViolationTypeId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedStudent = students.find(
    (student) => String(student.id) === studentId,
  );

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      setError("You are not authenticated.");
      setLoadingStudents(false);
      setLoadingTypes(false);
      return;
    }

    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    const loadStudents = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/teacher/violations/students`,
          {
            headers,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load students.",
          );
        }

        setStudents(
          Array.isArray(data.data) ? data.data : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load students.",
        );
      } finally {
        setLoadingStudents(false);
      }
    };

    const loadViolationTypes = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/teacher/violations/types`,
          {
            headers,
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to load violation types.",
          );
        }

        setViolationTypes(
          Array.isArray(data.data) ? data.data : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load violation types.",
        );
      } finally {
        setLoadingTypes(false);
      }
    };

    loadStudents();
    loadViolationTypes();
  }, []);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSubmitting(true);

    const token = getAuthToken();

    if (!token) {
      setError("You are not authenticated.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/teacher/violations`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_id: Number(studentId),
            violation_type_id: Number(violationTypeId),
            incident_at: date,
            description: description.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          const firstError = Object.values(
            data.errors,
          )[0];

          if (Array.isArray(firstError)) {
            throw new Error(String(firstError[0]));
          }
        }

        throw new Error(
          data.message ||
            "Failed to submit violation report.",
        );
      }

      setSuccess(
        "Violation report submitted successfully. It is now pending Guidance review.",
      );

      setStudentId("");
      setViolationTypeId("");
      setDescription("");
      setDate("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit violation report.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setStudentId("");
    setViolationTypeId("");
    setDescription("");
    setDate("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Teacher Portal
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Report Violation
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Submit a student violation report for guidance
          review.
        </p>
      </div>

      {/* Notice */}
      <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 dark:border-red-900/40 dark:bg-red-950/30">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-700 dark:bg-red-900/50 dark:text-red-300">
            !
          </div>

          <div>
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">
              Important
            </p>

            <p className="mt-1 text-xs leading-relaxed text-red-700 dark:text-red-300">
              Provide accurate and objective information.
              Submitted reports will be reviewed by the
              Guidance Office.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/50 dark:bg-green-950/30">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            {success}
          </p>
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Violation Information
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Complete the required information below.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {/* Student */}
          <div>
            <label
              htmlFor="student"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Student
            </label>

            <select
              id="student"
              value={studentId}
              onChange={(event) =>
                setStudentId(event.target.value)
              }
              required
              disabled={loadingStudents || submitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:disabled:bg-gray-900"
            >
              <option value="">
                {loadingStudents
                  ? "Loading students..."
                  : students.length === 0
                    ? "No students available"
                    : "Select a student"}
              </option>

              {students.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.name} — {student.student_id} —{" "}
                  {student.grade_level} {student.section}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Student */}
          {selectedStudent && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Selected Student
              </p>

              <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedStudent.name}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedStudent.student_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Grade & Section
                  </p>

                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedStudent.grade_level} -{" "}
                    {selectedStudent.section}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Violation Type */}
          <div>
            <label
              htmlFor="violationType"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Violation Type
            </label>

            <select
              id="violationType"
              value={violationTypeId}
              onChange={(event) =>
                setViolationTypeId(event.target.value)
              }
              required
              disabled={loadingTypes || submitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:disabled:bg-gray-900"
            >
              <option value="">
                {loadingTypes
                  ? "Loading violation types..."
                  : violationTypes.length === 0
                    ? "No violation types available"
                    : "Select violation type"}
              </option>

              {violationTypes.map((type) => (
                <option
                  key={type.id}
                  value={type.id}
                >
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Date of Incident
            </label>

            <input
              id="date"
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              required
              disabled={submitting}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:disabled:bg-gray-900"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Incident Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              required
              disabled={submitting}
              rows={6}
              placeholder="Describe what happened, including relevant details..."
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:disabled:bg-gray-900 dark:placeholder:text-gray-500"
            />

            <p className="mt-2 text-xs text-gray-400">
              Keep the description factual and objective.
            </p>
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end dark:border-gray-800">
            <button
              type="button"
              onClick={handleClear}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingStudents ||
                loadingTypes ||
                students.length === 0 ||
                violationTypes.length === 0
              }
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Submitting..."
                : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}