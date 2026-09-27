import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Student = {
  id: number;
  name: string;
  student_id: string;
  grade: string;
  section: string;
};

type RecentViolation = {
  id: number;
  type: string;
  date: string;
  status: string;
};

type DashboardData = {
  student: Student | null;
  statistics: {
    total_violations: number;
    under_review: number;
    resolved: number;
  };
  recent_violations: RecentViolation[];
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getStatusClass(status: string): string {
  switch (status) {
    case "Resolved":
      return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400";

    case "Closed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    case "Under Review":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

    case "For Review":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export default function ParentDashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = getAuthToken();

      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/parent/dashboard`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Unable to load parent dashboard.",
          );
        }

        setDashboard(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load parent dashboard.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const student = dashboard?.student;

  const studentInitials = useMemo(() => {
    return student ? getInitials(student.name) : "";
  }, [student]);

  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Parent Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Loading your child's school records...
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Parent Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Dashboard
          </h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="font-semibold text-red-700 dark:text-red-400">
            Unable to load dashboard
          </p>

          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Parent Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Monitor your child's school records and guidance
            updates.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            No student linked
          </p>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This parent account is not currently linked to a
            student record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Parent Portal
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Dashboard
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Monitor your child's school records and guidance
          updates.
        </p>
      </div>

      {/* Student Profile */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-gray-800/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Student Information
          </p>
        </div>

        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-800 text-lg font-bold text-white dark:bg-gray-700">
            {studentInitials}
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {student.name}
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Student ID: {student.student_id}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 sm:flex sm:gap-8">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Grade Level
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {student.grade}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Section
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {student.section}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Violations
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {dashboard?.statistics.total_violations ?? 0}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Recorded cases
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Under Review
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {dashboard?.statistics.under_review ?? 0}
          </p>

          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Guidance review ongoing
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Resolved
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {dashboard?.statistics.resolved ?? 0}
          </p>

          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Completed cases
          </p>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Recent Violation Records
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Recent guidance-related records for your child.
            </p>
          </div>

          <Link
            to="/parent/violations"
            className="text-sm font-semibold text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            View all
          </Link>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {dashboard?.recent_violations?.length ? (
            dashboard.recent_violations.map((violation) => (
              <div
                key={violation.id}
                className="flex flex-col gap-3 px-6 py-5 transition hover:bg-gray-50 dark:hover:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {violation.type}
                  </p>

                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {violation.date}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                    violation.status,
                  )}`}
                >
                  {violation.status}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                No violation records
              </p>

              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                There are no recorded violations for your child.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/50">
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Parent accounts have view-only access to student
          information, violation records, and guidance updates.
        </p>
      </div>
    </div>
  );
}