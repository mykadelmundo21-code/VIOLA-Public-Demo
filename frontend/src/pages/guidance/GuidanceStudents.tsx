import { useEffect, useMemo, useState } from "react";

type StudentStatus = "active" | "inactive";

type Student = {
  id: number;
  studentId: string;
  name: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
  status: StudentStatus;
};

type Teacher = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

type Parent = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

type Violation = {
  id: number;
  violationType: string;
  category: string | null;
  incidentAt: string | null;
  location: string | null;
  description: string | null;
  reportedBy: string;
  reportedByEmail: string | null;
  status: string;
};

type Intervention = {
  id: number;
  violationId: number;
  violationType: string;
  interventionType: string;
  reason: string | null;
  startDate: string | null;
  followUpDate: string | null;
  status: string;
  parentContactRequired: boolean;
  parentContactMethod: string;
  parentContactStatus: string;
  assignedTo: string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type StudentDetails = Student & {
  firstName: string;
  middleName: string | null;
  lastName: string;
  teacher: Teacher | null;
  parents: Parent[];
  violations: Violation[];
  interventions: Intervention[];
  violationCount: number;
  interventionCount: number;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

function clearAuthStorage(): void {
  localStorage.removeItem("viola_token");
  localStorage.removeItem("viola_user");
  localStorage.removeItem("viola_portal");

  sessionStorage.removeItem("viola_token");
  sessionStorage.removeItem("viola_user");
  sessionStorage.removeItem("viola_portal");
}

function formatStatus(status: StudentStatus): string {
  return status === "active"
    ? "Active"
    : "Inactive";
}

function getStatusClass(
  status: StudentStatus,
): string {
  return status === "active"
    ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
}

function formatCaseStatus(status: string): string {
  switch (status) {
    case "reported":
      return "For Review";

    case "under_review":
      return "Under Review";

    case "resolved":
      return "Resolved";

    case "closed":
      return "Closed";

    default:
      return status
        ? status
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) =>
              char.toUpperCase(),
            )
        : "Unknown";
  }
}

function getCaseStatusClass(status: string): string {
  switch (status) {
    case "reported":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    case "under_review":
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";

    case "resolved":
      return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";

    case "closed":
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";

    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  }
}

function formatInterventionStatus(
  status: string,
): string {
  return status
    ? status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) =>
          char.toUpperCase(),
        )
    : "Unknown";
}

function getInterventionStatusClass(
  status: string,
): string {
  switch (status) {
    case "scheduled":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    case "active":
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";

    case "completed":
      return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";

    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";
  }
}

export default function GuidanceStudents() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [search, setSearch] =
    useState("");

  const [gradeFilter, setGradeFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentDetails | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [detailsError, setDetailsError] =
    useState("");

  const fetchStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "No authentication token found. Please log in again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/guidance/students`,
        {
          method: "GET",

          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let result: {
        message?: string;
        data?: Student[];
      } = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (
        response.status === 401 ||
        response.status === 419
      ) {
        clearAuthStorage();

        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      if (response.status === 403) {
        throw new Error(
          "You are not authorized to access student records.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Failed to load student records.",
        );
      }

      setStudents(
        Array.isArray(result?.data)
          ? result.data
          : [],
      );
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the VIOLA server. Make sure the Laravel backend is running.",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to load student records.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const openStudentDetails = async (
    studentId: number,
  ) => {
    setDetailsLoading(true);
    setDetailsError("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "No authentication token found. Please log in again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/guidance/students/${studentId}`,
        {
          method: "GET",

          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let result: {
        message?: string;
        data?: StudentDetails;
      } = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (
        response.status === 401 ||
        response.status === 419
      ) {
        clearAuthStorage();

        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      if (response.status === 403) {
        throw new Error(
          "You are not authorized to view this student.",
        );
      }

      if (response.status === 404) {
        throw new Error(
          "Student record not found.",
        );
      }

      if (!response.ok || !result.data) {
        throw new Error(
          result.message ||
            "Failed to load student details.",
        );
      }

      setSelectedStudent(result.data);
    } catch (err) {
      if (err instanceof TypeError) {
        setDetailsError(
          "Unable to connect to the VIOLA server.",
        );
      } else if (err instanceof Error) {
        setDetailsError(err.message);
      } else {
        setDetailsError(
          "Unable to load student details.",
        );
      }
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeStudentDetails = () => {
    setSelectedStudent(null);
    setDetailsError("");
  };

  const gradeLevels = useMemo(() => {
    const levels = students
      .map((student) => student.gradeLevel)
      .filter(Boolean);

    return Array.from(
      new Set(levels),
    ).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [students]);

  const filteredStudents = useMemo(() => {
    const searchTerm =
      search.toLowerCase().trim();

    return students.filter((student) => {
      const matchesSearch =
        !searchTerm ||
        student.name
          .toLowerCase()
          .includes(searchTerm) ||
        student.studentId
          .toLowerCase()
          .includes(searchTerm);

      const matchesGrade =
        gradeFilter === "All" ||
        student.gradeLevel === gradeFilter;

      const matchesStatus =
        statusFilter === "All" ||
        formatStatus(student.status) ===
          statusFilter;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesStatus
      );
    });
  }, [
    students,
    search,
    gradeFilter,
    statusFilter,
  ]);

  const totalStudents =
    students.length;

  const activeStudents =
    students.filter(
      (student) =>
        student.status === "active",
    ).length;

  const inactiveStudents =
    students.filter(
      (student) =>
        student.status === "inactive",
    ).length;

  return (
    <div className="space-y-7">

      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Student Management
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Students
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          View and manage student records within the system.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
          <p className="font-semibold text-red-800 dark:text-red-400">
            Unable to load students
          </p>

          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Students
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : totalStudents}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Registered student records
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Active Students
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : activeStudents}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Currently active
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Inactive Students
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : inactiveStudents}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Inactive records
          </p>
        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

        <div className="border-b border-gray-200 p-5 dark:border-gray-700">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="relative w-full lg:max-w-md">

              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                />

                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search by name or student ID..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-500/20"
              />

            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <select
                value={gradeFilter}
                onChange={(event) =>
                  setGradeFilter(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
              >
                <option value="All">
                  All Grade Levels
                </option>

                {gradeLevels.map(
                  (grade) => (
                    <option
                      key={grade}
                      value={grade}
                    >
                      {grade}
                    </option>
                  ),
                )}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
              >
                <option value="All">
                  All Status
                </option>

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>

            </div>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[850px] text-left text-sm">

            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">

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
                  School Year
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 text-right font-semibold">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

              {loading ? (

                <tr>

                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center"
                  >
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      Loading student records...
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Retrieving records from the VIOLA database.
                    </p>
                  </td>

                </tr>

              ) : filteredStudents.length > 0 ? (

                filteredStudents.map(
                  (student) => (

                    <tr
                      key={student.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    >

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                            {student.name
                              .split(" ")
                              .filter(Boolean)
                              .map(
                                (name) =>
                                  name[0],
                              )
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>

                          <span className="font-semibold text-gray-900 dark:text-white">
                            {student.name}
                          </span>

                        </div>

                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {student.studentId}
                      </td>

                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {student.gradeLevel}{" "}
                        -{" "}
                        {student.section}
                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {student.schoolYear}
                      </td>

                      <td className="px-6 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            student.status,
                          )}`}
                        >
                          {formatStatus(
                            student.status,
                          )}
                        </span>

                      </td>

                      <td className="px-6 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            openStudentDetails(
                              student.id,
                            )
                          }
                          className="font-semibold text-red-700 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          View Details
                        </button>

                      </td>

                    </tr>

                  ),
                )

              ) : (

                <tr>

                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center"
                  >

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                      ?
                    </div>

                    <p className="mt-3 font-semibold text-gray-700 dark:text-gray-300">
                      No students found
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      There are currently no student records matching your search or filters.
                    </p>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700/50">

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {loading
                ? 0
                : filteredStudents.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {loading
                ? 0
                : students.length}
            </span>{" "}
            students
          </p>

        </div>

      </div>

      {(detailsLoading || selectedStudent || detailsError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/70">

          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">

              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Student Record
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {selectedStudent?.name ||
                    "Student Details"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeStudentDetails}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-6">

              {detailsLoading && (
                <div className="py-16 text-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    Loading student details...
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Retrieving the complete student record.
                  </p>
                </div>
              )}

              {detailsError && !detailsLoading && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="font-semibold text-red-800 dark:text-red-400">
                    Unable to load student details
                  </p>

                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {detailsError}
                  </p>
                </div>
              )}

              {selectedStudent &&
                !detailsLoading && (
                  <div className="space-y-6">

                    <div className="grid gap-4 md:grid-cols-2">

                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-700/50">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Student Information
                        </p>

                        <div className="mt-4 space-y-3 text-sm">

                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500 dark:text-gray-400">
                              Full Name
                            </span>

                            <span className="text-right font-semibold text-gray-900 dark:text-white">
                              {selectedStudent.name}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500 dark:text-gray-400">
                              Student ID
                            </span>

                            <span className="font-semibold text-gray-900 dark:text-white">
                              {selectedStudent.studentId}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500 dark:text-gray-400">
                              Grade & Section
                            </span>

                            <span className="font-semibold text-gray-900 dark:text-white">
                              {selectedStudent.gradeLevel}{" "}
                              -{" "}
                              {selectedStudent.section}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-gray-500 dark:text-gray-400">
                              School Year
                            </span>

                            <span className="font-semibold text-gray-900 dark:text-white">
                              {selectedStudent.schoolYear}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-500 dark:text-gray-400">
                              Status
                            </span>

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                selectedStudent.status,
                              )}`}
                            >
                              {formatStatus(
                                selectedStudent.status,
                              )}
                            </span>
                          </div>

                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-700/50">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Assigned Teacher
                        </p>

                        {selectedStudent.teacher ? (
                          <div className="mt-4 space-y-3 text-sm">

                            <div className="flex justify-between gap-4">
                              <span className="text-gray-500 dark:text-gray-400">
                                Name
                              </span>

                              <span className="text-right font-semibold text-gray-900 dark:text-white">
                                {selectedStudent.teacher.name}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4">
                              <span className="text-gray-500 dark:text-gray-400">
                                Email
                              </span>

                              <span className="break-all text-right font-semibold text-gray-900 dark:text-white">
                                {selectedStudent.teacher.email}
                              </span>
                            </div>

                            <div className="flex justify-between gap-4">
                              <span className="text-gray-500 dark:text-gray-400">
                                Phone
                              </span>

                              <span className="font-semibold text-gray-900 dark:text-white">
                                {selectedStudent.teacher.phone ||
                                  "Not provided"}
                              </span>
                            </div>

                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                            No teacher is currently assigned.
                          </p>
                        )}
                      </div>

                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">

                      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                              Parent / Guardian
                            </p>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Linked parent accounts
                            </p>
                          </div>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {selectedStudent.parents.length}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">

                        {selectedStudent.parents.length > 0 ? (
                          <div className="grid gap-4 md:grid-cols-2">

                            {selectedStudent.parents.map(
                              (parent) => (
                                <div
                                  key={parent.id}
                                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                                >

                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {parent.name}
                                  </p>

                                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {parent.email}
                                  </p>

                                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {parent.phone ||
                                      "No phone number"}
                                  </p>

                                </div>
                              ),
                            )}

                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500">
                            No parent or guardian account is linked to this student.
                          </p>
                        )}

                      </div>

                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Violation Records
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                          {selectedStudent.violationCount}
                        </p>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Intervention Records
                        </p>

                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                          {selectedStudent.interventionCount}
                        </p>
                      </div>

                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">

                      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Violation History
                        </p>
                      </div>

                      <div className="overflow-x-auto">

                        {selectedStudent.violations.length > 0 ? (

                          <table className="w-full min-w-[850px] text-left text-sm">

                            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                              <tr>
                                <th className="px-5 py-3 font-semibold">
                                  Violation
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Date
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Location
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Reported By
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Status
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

                              {selectedStudent.violations.map(
                                (violation) => (
                                  <tr
                                    key={violation.id}
                                    className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                  >

                                    <td className="px-5 py-4">
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {violation.violationType}
                                      </p>

                                      {violation.category && (
                                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                          {violation.category}
                                        </p>
                                      )}

                                      {violation.description && (
                                        <p className="mt-2 max-w-xs text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                          {violation.description}
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                      {violation.incidentAt ||
                                        "Not available"}
                                    </td>

                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                      {violation.location ||
                                        "Not specified"}
                                    </td>

                                    <td className="px-5 py-4">
                                      <p className="font-medium text-gray-800 dark:text-gray-200">
                                        {violation.reportedBy}
                                      </p>

                                      {violation.reportedByEmail && (
                                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                          {violation.reportedByEmail}
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-5 py-4">
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCaseStatusClass(
                                          violation.status,
                                        )}`}
                                      >
                                        {formatCaseStatus(
                                          violation.status,
                                        )}
                                      </span>
                                    </td>

                                  </tr>
                                ),
                              )}

                            </tbody>

                          </table>

                        ) : (
                          <div className="px-5 py-10 text-center">
                            <p className="font-semibold text-gray-700 dark:text-gray-300">
                              No violation records
                            </p>

                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              This student has no recorded violations.
                            </p>
                          </div>
                        )}

                      </div>

                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">

                      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Intervention History
                        </p>
                      </div>

                      <div className="overflow-x-auto">

                        {selectedStudent.interventions.length > 0 ? (

                          <table className="w-full min-w-[950px] text-left text-sm">

                            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                              <tr>
                                <th className="px-5 py-3 font-semibold">
                                  Violation
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Intervention
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Start
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Follow-up
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Status
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Parent Contact
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

                              {selectedStudent.interventions.map(
                                (intervention) => (
                                  <tr
                                    key={intervention.id}
                                    className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                  >

                                    <td className="px-5 py-4 font-medium text-gray-800 dark:text-gray-200">
                                      {intervention.violationType}
                                    </td>

                                    <td className="px-5 py-4">
                                      <p className="font-semibold text-gray-900 dark:text-white">
                                        {intervention.interventionType}
                                      </p>

                                      {intervention.reason && (
                                        <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                          {intervention.reason}
                                        </p>
                                      )}
                                    </td>

                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                      {intervention.startDate ||
                                        "Not specified"}
                                    </td>

                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                      {intervention.followUpDate ||
                                        "Not specified"}
                                    </td>

                                    <td className="px-5 py-4">
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getInterventionStatusClass(
                                          intervention.status,
                                        )}`}
                                      >
                                        {formatInterventionStatus(
                                          intervention.status,
                                        )}
                                      </span>
                                    </td>

                                    <td className="px-5 py-4">
                                      {intervention.parentContactRequired ? (
                                        <div>
                                          <p className="font-medium text-gray-800 dark:text-gray-200">
                                            {intervention.parentContactMethod
                                              .replace(
                                                /_/g,
                                                " ",
                                              )
                                              .replace(
                                                /\b\w/g,
                                                (char) =>
                                                  char.toUpperCase(),
                                              )}
                                          </p>

                                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                            {formatInterventionStatus(
                                              intervention.parentContactStatus,
                                            )}
                                          </p>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 dark:text-gray-500">
                                          Not required
                                        </span>
                                      )}
                                    </td>

                                  </tr>
                                ),
                              )}

                            </tbody>

                          </table>

                        ) : (
                          <div className="px-5 py-10 text-center">
                            <p className="font-semibold text-gray-700 dark:text-gray-300">
                              No intervention records
                            </p>

                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              This student has no recorded interventions.
                            </p>
                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}