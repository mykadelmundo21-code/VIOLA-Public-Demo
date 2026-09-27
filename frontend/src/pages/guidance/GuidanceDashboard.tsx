import { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";

const API_URL = "http://localhost:8000/api";

type RecentViolation = {
  id: number;
  student: string;
  type: string;
  date: string;
  status: string;
};

type DashboardData = {
  total_students: number;
  active_violations: number;
  pending_assessments: number;
  active_interventions: number;

  violation_distribution: {
    category: string;
    count: number;
  }[];

  monthly_activity: {
    month: string;
    count: number;
  }[];

  recent_violations: RecentViolation[];

  pending_reviews: number;
  followups: number;
};

export default function GuidanceDashboard() {
  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem("viola_token") ||
          sessionStorage.getItem("viola_token");

        if (!token) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        const response = await fetch(
          `${API_URL}/guidance/dashboard`,
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
          if (response.status === 401) {
            throw new Error(
              "Your session has expired. Please log in again.",
            );
          }

          throw new Error(
            result.message ||
              "Unable to load guidance dashboard.",
          );
        }

        const data = result.data ?? result;

        setDashboard(data);
      } catch (err) {
        if (err instanceof TypeError) {
          setError(
            "Unable to connect to the Laravel server. Make sure the backend is running.",
          );
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Unable to load dashboard.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-7">

        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Guidance Dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Loading student monitoring data...
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none"
            />
          ))}
        </div>

      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="space-y-7">

        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Guidance Dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Dashboard
          </h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400">
            Unable to load dashboard
          </h2>

          <p className="mt-2 text-sm text-red-600 dark:text-red-300">
            {error ||
              "No dashboard data was returned."}
          </p>
        </div>

      </div>
    );
  }

  const distribution =
    dashboard.violation_distribution ?? [];

  const monthlyActivity =
    dashboard.monthly_activity ?? [];

  const recentViolations =
    dashboard.recent_violations ?? [];

  const maxMonthlyValue =
    Math.max(
      ...monthlyActivity.map(
        (item) => Number(item.count) || 0,
      ),
      1,
    );

  return (
    <div className="space-y-7">

      {/* PAGE HEADER */}

      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Guidance Dashboard
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Dashboard
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Overview of student violation monitoring and intervention activities.
        </p>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Total Students"
          value={String(
            dashboard.total_students ?? 0,
          )}
          subtitle="Active student records"
          icon="◉"
          accent="gray"
        />

        <StatCard
          title="Active Violations"
          value={String(
            dashboard.active_violations ?? 0,
          )}
          subtitle="Requires monitoring"
          icon="!"
          accent="red"
        />

        <StatCard
          title="Assessment Suggestions"
          value={String(
            dashboard.pending_assessments ?? 0,
          )}
          subtitle="Suggested for review"
          icon="✓"
          accent="red"
        />

        <StatCard
          title="Active Interventions"
          value={String(
            dashboard.active_interventions ?? 0,
          )}
          subtitle="Currently monitored"
          icon="↗"
          accent="gray"
        />

      </div>

      {/* ANALYTICS */}

      <div className="grid gap-5 xl:grid-cols-2">

        {/* VIOLATION DISTRIBUTION */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <div className="mb-6">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Violation Distribution
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Current distribution of reported violations
            </p>
          </div>

          <div className="flex items-center justify-center py-4">

            <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">

              <div className="absolute inset-6 flex items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">

                <div className="text-center">

                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dashboard.active_violations ?? 0}
                  </p>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Reports
                  </p>

                </div>

              </div>

            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">

            {distribution.length > 0 ? (
              distribution.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/60"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {item.category}
                  </span>

                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-2 rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-400 dark:bg-gray-700/60 dark:text-gray-500">
                No violation records available.
              </div>
            )}

          </div>

        </div>

        {/* MONTHLY ACTIVITY */}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <div className="mb-6">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Violation Activity
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Monthly reported violations
            </p>
          </div>

          <div className="flex h-64 items-end justify-between gap-3 border-b border-gray-200 px-2 pt-5 dark:border-gray-700">

            {monthlyActivity.length > 0 ? (
              monthlyActivity.map((item) => {
                const value =
                  Number(item.count) || 0;

                const height =
                  (value / maxMonthlyValue) * 80;

                return (
                  <div
                    key={item.month}
                    className="flex h-full flex-1 flex-col items-center justify-end"
                  >

                    <span className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {value}
                    </span>

                    <div
                      className="w-full max-w-10 rounded-t-md bg-red-700 transition hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
                      style={{
                        height: `${Math.max(
                          height,
                          value > 0 ? 4 : 0,
                        )}%`,
                      }}
                    />

                  </div>
                );
              })
            ) : (
              <div className="flex w-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                No monthly violation data available.
              </div>
            )}

          </div>

          <div className="mt-3 flex justify-between px-2 text-xs text-gray-400 dark:text-gray-500">

            {monthlyActivity.map((item) => (
              <span key={item.month}>
                {item.month}
              </span>
            ))}

          </div>

        </div>

      </div>

      {/* RECENT VIOLATION REPORTS */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">

          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Recent Violation Reports
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Latest reports submitted by faculty
            </p>
          </div>

          <a
            href="/guidance/violations"
            className="text-sm font-semibold text-red-700 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            View All
          </a>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[700px] text-left text-sm">

            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">

              <tr>
                <th className="px-6 py-4 font-semibold">
                  Student
                </th>

                <th className="px-6 py-4 font-semibold">
                  Violation
                </th>

                <th className="px-6 py-4 font-semibold">
                  Date
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
                </th>
              </tr>

            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

              {recentViolations.length > 0 ? (
                recentViolations.map((item) => {

                  const status =
                    item.status
                      ?.toLowerCase()
                      .replace("_", " ") || "";

                  return (
                    <tr
                      key={`${item.id}-${item.date}`}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    >

                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        {item.student}
                      </td>

                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {item.type}
                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {item.date}
                      </td>

                      <td className="px-6 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            status === "resolved" ||
                            status === "closed"
                              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : status === "under review"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {item.status}
                        </span>

                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No violation reports available.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* PENDING ACTIONS */}

      <div className="grid gap-5 md:grid-cols-3">

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pending Reviews
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {dashboard.pending_reviews ?? 0}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Violation reports awaiting review
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Assessment Suggestions
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {dashboard.pending_assessments ?? 0}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Suggested based on monitored violations
          </p>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Follow-ups
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {dashboard.followups ?? 0}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Student follow-ups due
          </p>

        </div>

      </div>

    </div>
  );
}