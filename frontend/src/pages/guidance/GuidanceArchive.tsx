import { useEffect, useMemo, useState } from "react";

type StudentArchive = {
  id: number;
  studentId: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  schoolYear: string;
  status: string;
  violationCount: number;
  interventionCount: number;
};

type Violation = {
  id: number;
  violationType: string;
  category?: string | null;
  incidentAt?: string | null;
  location?: string | null;
  description?: string | null;
  reportedBy?: string | null;
  status?: string | null;
};

type Intervention = {
  id: number;
  violationId?: number | null;
  violationType: string;
  interventionType?: string | null;
  reason?: string | null;
  startDate?: string | null;
  followUpDate?: string | null;
  status?: string | null;
  parentContactRequired: boolean;
  parentContactMethod?: string | null;
  parentContactStatus?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

type HistoryData = {
  student: {
    id: number;
    studentId: string;
    name: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    gradeLevel: string;
    section: string;
    schoolYear: string;
    status: string;
  };
  teacher?: {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  parents: {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
  }[];
  schoolYear: string;
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
    sessionStorage.getItem("viola_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

export default function GuidanceArchive() {
  const [students, setStudents] =
    useState<StudentArchive[]>([]);

  const [schoolYears, setSchoolYears] =
    useState<string[]>([]);

  const [selectedSchoolYear, setSelectedSchoolYear] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [historyData, setHistoryData] =
    useState<HistoryData | null>(null);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [folderOpen, setFolderOpen] =
    useState(false);

  const fetchArchive = async (
    schoolYear?: string,
  ) => {
    try {
      setLoading(true);
      setError("");

      const token = getAuthToken();

      if (!token) {
        setError(
          "Session expired. Please log in again.",
        );
        setLoading(false);
        return;
      }

      const query = schoolYear
        ? `?school_year=${encodeURIComponent(
            schoolYear,
          )}`
        : "";

      const response = await fetch(
        `${API_BASE_URL}/guidance/archive${query}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load archive.",
        );
      }

      setStudents(result.data || []);
      setSchoolYears(result.schoolYears || []);

      if (result.selectedSchoolYear) {
        setSelectedSchoolYear(
          result.selectedSchoolYear,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load archive.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, []);

  const filteredStudents = useMemo(() => {
    const keyword =
      search.trim().toLowerCase();

    if (!keyword) {
      return students;
    }

    return students.filter((student) => {
      return (
        student.studentName
          .toLowerCase()
          .includes(keyword) ||
        student.studentId
          .toLowerCase()
          .includes(keyword) ||
        student.gradeLevel
          .toLowerCase()
          .includes(keyword) ||
        student.section
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [students, search]);

  const getYearStats = (
    schoolYear: string,
  ) => {
    const yearStudents = students.filter(
      (student) =>
        student.schoolYear === schoolYear,
    );

    return {
      students: yearStudents.length,

      violations: yearStudents.reduce(
        (total, student) =>
          total + student.violationCount,
        0,
      ),

      interventions: yearStudents.reduce(
        (total, student) =>
          total + student.interventionCount,
        0,
      ),
    };
  };

  const openSchoolYear = async (
    schoolYear: string,
  ) => {
    setSelectedSchoolYear(schoolYear);
    setSearch("");
    setFolderOpen(true);

    await fetchArchive(schoolYear);
  };

  const backToSchoolYears = async () => {
    setFolderOpen(false);
    setSearch("");
    setSelectedSchoolYear("");

    await fetchArchive();
  };

  const viewHistory = async (
    studentId: number,
  ) => {
    try {
      setHistoryLoading(true);
      setError("");

      const token = getAuthToken();

      if (!token) {
        setError(
          "Session expired. Please log in again.",
        );
        setHistoryLoading(false);
        return;
      }

      const query = selectedSchoolYear
        ? `?school_year=${encodeURIComponent(
            selectedSchoolYear,
          )}`
        : "";

      const response = await fetch(
        `${API_BASE_URL}/guidance/archive/${studentId}${query}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load student history.",
        );
      }

      setHistoryData(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load student history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryData(null);
  };

  const getStatusClass = (
    status?: string | null,
  ) => {
    const value =
      (status || "").toLowerCase();

    if (
      value === "resolved" ||
      value === "completed" ||
      value === "closed"
    ) {
      return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400";
    }

    if (
      value === "under_review" ||
      value === "under review" ||
      value === "active"
    ) {
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    }

    if (
      value === "reported" ||
      value === "for review" ||
      value === "scheduled"
    ) {
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    }

    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
  };

  return (
    <div className="space-y-7">

      {!folderOpen ? (
        <>
          {/* PAGE HEADER */}
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Records Management
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
              Archive History
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              View historical student records by school year.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-800 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                Loading archive...
              </p>

              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Retrieving archived school years.
              </p>
            </div>
          ) : schoolYears.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-3xl dark:bg-gray-800">
                📁
              </div>

              <p className="mt-4 font-semibold text-gray-900 dark:text-white">
                No archived school years
              </p>

              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                Archived student records will appear here.
              </p>

            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {schoolYears.map(
                (schoolYear) => {
                  const stats =
                    getYearStats(
                      schoolYear,
                    );

                  return (
                    <button
                      key={schoolYear}
                      type="button"
                      onClick={() =>
                        openSchoolYear(
                          schoolYear,
                        )
                      }
                      className="group text-left"
                    >
                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700">

                        <div className="flex items-start justify-between">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-2xl dark:bg-gray-800">
                            📁
                          </div>

                          <span className="text-gray-400 transition group-hover:translate-x-1 dark:text-gray-500">
                            →
                          </span>
                        </div>

                        <div className="mt-5">
                          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            School Year
                          </p>

                          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                            {schoolYear}
                          </h2>
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-3">

                          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Students
                            </p>

                            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                              {stats.students}
                            </p>
                          </div>

                          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Violations
                            </p>

                            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                              {stats.violations}
                            </p>
                          </div>

                          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Interventions
                            </p>

                            <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                              {stats.interventions}
                            </p>
                          </div>

                        </div>

                        <div className="mt-5 border-t border-gray-100 pt-4 text-sm font-semibold text-gray-600 group-hover:text-gray-900 dark:border-gray-800 dark:text-gray-400 dark:group-hover:text-white">
                          Open Archive →
                        </div>

                      </div>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* ARCHIVE SCHOOL YEAR HEADER */}
          <div>
            <button
              type="button"
              onClick={
                backToSchoolYears
              }
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              ← Back to School Years
            </button>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Records Management
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                  Archive History
                </h1>

                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Historical student records for{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {selectedSchoolYear}
                  </span>
                  .
                </p>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredStudents.length} student
                {filteredStudents.length !== 1
                  ? "s"
                  : ""}
              </div>
            </div>
          </div>

          {/* SEARCH */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="relative w-full max-w-md">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
                placeholder="Search student..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-950/40"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/30">
              <p className="text-sm font-medium text-red-800 dark:text-red-400">
                {error}
              </p>
            </div>
          )}

          {/* STUDENT ARCHIVE TABLE */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">

                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                  <tr>

                    <th className="px-6 py-4 font-semibold">
                      Student
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Student ID
                    </th>

                    <th className="px-6 py-4 font-semibold">
                      Grade / Section
                    </th>

                    <th className="px-6 py-4 text-center font-semibold">
                      Violations
                    </th>

                    <th className="px-6 py-4 text-center font-semibold">
                      Interventions
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
                        className="px-6 py-14 text-center"
                      >
                        <p className="font-semibold text-gray-700 dark:text-gray-200">
                          Loading archive...
                        </p>

                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          Retrieving archived student records.
                        </p>
                      </td>
                    </tr>
                  ) : filteredStudents.length >
                    0 ? (
                    filteredStudents.map(
                      (student) => {
                        const initials =
                          student.studentName
                            .split(" ")
                            .filter(Boolean)
                            .map(
                              (name) =>
                                name[0],
                            )
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() ||
                          "ST";

                        return (
                          <tr
                            key={
                              student.id
                            }
                            className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">

                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                                  {initials}
                                </div>

                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {
                                      student.studentName
                                    }
                                  </p>

                                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                    {
                                      student.schoolYear
                                    }
                                  </p>
                                </div>

                              </div>
                            </td>

                            <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                              {
                                student.studentId
                              }
                            </td>

                            <td className="px-6 py-4">
                              <p className="font-medium text-gray-800 dark:text-gray-200">
                                {
                                  student.gradeLevel
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {
                                  student.section
                                }
                              </p>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex min-w-8 justify-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                                {
                                  student.violationCount
                                }
                              </span>
                            </td>

                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex min-w-8 justify-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {
                                  student.interventionCount
                                }
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  viewHistory(
                                    student.id,
                                  )
                                }
                                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-800"
                              >
                                View History
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-14 text-center"
                      >
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
                          ✓
                        </div>

                        <p className="mt-3 font-semibold text-gray-700 dark:text-gray-200">
                          No archived students found
                        </p>

                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          No archived student records are available for this school year.
                        </p>
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  {filteredStudents.length}
                </span>{" "}
                archived student
                {filteredStudents.length !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>

          </div>
        </>
      )}

      {/* HISTORY MODAL */}
      {historyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">

            {/* MODAL HEADER */}
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                  Archived Record
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  {historyData.student.name}
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {
                    historyData.student.studentId
                  }{" "}
                  ·{" "}
                  {
                    historyData.student.gradeLevel
                  }{" "}
                  -{" "}
                  {
                    historyData.student.section
                  }
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  School Year{" "}
                  {
                    historyData.schoolYear
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={closeHistory}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                ✕
              </button>

            </div>

            {/* MODAL BODY */}
            <div className="max-h-[calc(90vh-90px)] overflow-y-auto p-6">

              {historyLoading ? (
                <div className="py-16 text-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    Loading student history...
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Retrieving archived records.
                  </p>
                </div>
              ) : (
                <>
                  {/* SUMMARY */}
                  <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">

                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Violation Records
                      </p>

                      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {
                          historyData.violationCount
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Intervention Records
                      </p>

                      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                        {
                          historyData.interventionCount
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Student Status
                      </p>

                      <p className="mt-3 text-sm font-semibold capitalize text-gray-700 dark:text-gray-200">
                        {
                          historyData.student.status
                        }
                      </p>
                    </div>

                  </div>

                  {/* VIOLATION HISTORY */}
                  <div className="mb-8 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

                    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Violation History
                      </p>
                    </div>

                    <div className="overflow-x-auto">

                      {historyData.violations.length >
                      0 ? (
                        <table className="w-full min-w-[900px] text-left text-sm">

                          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
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

                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

                            {historyData.violations.map(
                              (violation) => (
                                <tr
                                  key={
                                    violation.id
                                  }
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                >

                                  <td className="px-5 py-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                      {
                                        violation.violationType
                                      }
                                    </p>

                                    {violation.category && (
                                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                        {
                                          violation.category
                                        }
                                      </p>
                                    )}
                                  </td>

                                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                    {
                                      violation.incidentAt ||
                                      "Not available"
                                    }
                                  </td>

                                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                    {
                                      violation.location ||
                                      "Not specified"
                                    }
                                  </td>

                                  <td className="px-5 py-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                      {
                                        violation.reportedBy ||
                                        "Unknown"
                                      }
                                    </p>
                                  </td>

                                  <td className="px-5 py-4">
                                    {violation.status && (
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                          violation.status,
                                        )}`}
                                      >
                                        {violation.status.replace(
                                          /_/g,
                                          " ",
                                        )}
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
                          <p className="font-semibold text-gray-700 dark:text-gray-200">
                            No violation records
                          </p>

                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            This student has no recorded violations.
                          </p>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* INTERVENTION HISTORY */}
                  <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">

                    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Intervention History
                      </p>
                    </div>

                    <div className="overflow-x-auto">

                      {historyData.interventions.length >
                      0 ? (
                        <table className="w-full min-w-[950px] text-left text-sm">

                          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                            <tr>

                              <th className="px-5 py-3 font-semibold">
                                Violation
                              </th>

                              <th className="px-5 py-3 font-semibold">
                                Intervention
                              </th>

                              <th className="px-5 py-3 font-semibold">
                                Start Date
                              </th>

                              <th className="px-5 py-3 font-semibold">
                                Follow-up
                              </th>

                              <th className="px-5 py-3 font-semibold">
                                Status
                              </th>

                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

                            {historyData.interventions.map(
                              (intervention) => (
                                <tr
                                  key={
                                    intervention.id
                                  }
                                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                >

                                  <td className="px-5 py-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                      {
                                        intervention.violationType
                                      }
                                    </p>
                                  </td>

                                  <td className="px-5 py-4">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">
                                      {
                                        intervention.interventionType ||
                                        "Intervention"
                                      }
                                    </p>

                                    {intervention.reason && (
                                      <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
                                        {
                                          intervention.reason
                                        }
                                      </p>
                                    )}
                                  </td>

                                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                    {
                                      intervention.startDate ||
                                      "Not specified"
                                    }
                                  </td>

                                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                    {
                                      intervention.followUpDate ||
                                      "Not specified"
                                    }
                                  </td>

                                  <td className="px-5 py-4">
                                    {intervention.status && (
                                      <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                          intervention.status,
                                        )}`}
                                      >
                                        {
                                          intervention.status
                                        }
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
                          <p className="font-semibold text-gray-700 dark:text-gray-200">
                            No intervention records
                          </p>

                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            This student has no recorded interventions.
                          </p>
                        </div>
                      )}

                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}