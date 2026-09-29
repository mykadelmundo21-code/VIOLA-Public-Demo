import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type RecentViolation = {
  id: number;
  studentName: string;
  studentId: string;
  violation: string;
  date: string;
  status: "Reported" | "Under Review" | "Resolved" | "Closed";
};

type DashboardData = {
  statistics: {
    total_students: number;
    total_violations: number;
    pending_reports: number;
    resolved_reports: number;
  };
  recent_violations: RecentViolation[];
};

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem("viola_token") ||
        sessionStorage.getItem("viola_token");

      if (!token) {
        setError("You are not authenticated.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"}/teacher/dashboard`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load dashboard.");
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const statistics = data?.statistics ?? {
    total_students: 0,
    total_violations: 0,
    pending_reports: 0,
    resolved_reports: 0,
  };

  const recentViolations = data?.recent_violations ?? [];

  return (
    <div className="space-y-7 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Teacher Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Monitor your students and submit violation reports.
          </p>
        </div>

        <Link
          to="/teacher/violations"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
        >
          <span className="text-lg leading-none">+</span>
          Report Violation
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            My Students
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : statistics.total_students}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Grade 11 & Grade 12
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Violations Reported
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : statistics.total_violations}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Reports submitted
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Pending Reports
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : statistics.pending_reports}
          </p>

          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Awaiting guidance review
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Resolved
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : statistics.resolved_reports}
          </p>

          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Completed reports
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:col-span-2 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Recent Violation Reports
              </h2>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Latest reports submitted by you.
              </p>
            </div>

            <Link
              to="/teacher/violation-history"
              className="text-sm font-semibold text-red-700 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              Loading recent reports...
            </div>
          ) : recentViolations.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              No violation reports yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentViolations.map((violation) => {
                const initials = (violation.studentName || "Unknown Student")
                  .split(" ")
                  .filter(Boolean)
                  .map((name) => name[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={violation.id}
                    className="flex flex-col gap-4 px-6 py-4 transition hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                        {initials || "US"}
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {violation.studentName}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                          {violation.studentId}
                        </p>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {violation.violation}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          violation.status === "Resolved"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                            : violation.status === "Under Review"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {violation.status}
                      </span>

                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {violation.date}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Quick Actions
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Common teacher actions.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to="/teacher/violations"
              className="group flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition hover:border-red-200 hover:bg-red-50 dark:border-gray-700 dark:hover:border-red-900/50 dark:hover:bg-red-950/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <span className="text-lg font-bold">+</span>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Report Violation
                </p>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Submit a new student report.
                </p>
              </div>
            </Link>

            <Link
              to="/teacher/violation-history"
              className="group flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <span className="text-lg">≡</span>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Violation History
                </p>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  View all reports submitted by you.
                </p>
              </div>
            </Link>

            <Link
              to="/teacher/students"
              className="group flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <span className="text-lg">●</span>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  View Students
                </p>

                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  View assigned student records.
                </p>
              </div>
            </Link>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Teacher Access
            </p>

            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              Teachers can submit and monitor violation reports. Guidance
              personnel handle assessment, intervention, and case resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
