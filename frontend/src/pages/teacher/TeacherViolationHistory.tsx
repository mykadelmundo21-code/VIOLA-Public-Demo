import {
  useEffect,
  useMemo,
  useState,
} from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

type Violation = {
  id: number;
  studentId: string;
  studentName: string;
  gradeLevel: string | null;
  section: string | null;
  violationType: string;
  category: string | null;
  date: string | null;
  incidentAt: string | null;
  location: string | null;
  description: string;
  status:
    | "reported"
    | "under_review"
    | "resolved"
    | "closed"
    | string;
  createdAt: string | null;
  updatedAt: string | null;
};

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

function statusLabel(
  status: string,
): string {
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
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase(),
        );
  }
}

function statusClass(
  status: string,
): string {
  switch (status) {
    case "reported":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

    case "under_review":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

    case "resolved":
      return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400";

    case "closed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getInitials(
  name: string,
): string {
  return (
    name ||
    "Unknown Student"
  )
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

export default function TeacherViolationHistory() {
  const [violations, setViolations] =
    useState<Violation[]>([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadViolations =
    async () => {
      const token =
        getAuthToken();

      if (!token) {
        setError(
          "You are not authenticated.",
        );
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            `${API_BASE_URL}/teacher/violations`,
            {
              method: "GET",
              headers: {
                Accept:
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to load violation history.",
          );
        }

        setViolations(
          Array.isArray(result.data)
            ? result.data
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load violation history.",
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadViolations();
  }, []);

  const filteredViolations =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return violations.filter(
        (violation) => {
          const matchesSearch =
            !term ||
            violation.studentName
              .toLowerCase()
              .includes(term) ||
            violation.studentId
              .toLowerCase()
              .includes(term) ||
            violation.violationType
              .toLowerCase()
              .includes(term);

          const matchesStatus =
            statusFilter === "All" ||
            statusLabel(
              violation.status,
            ) === statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      violations,
      search,
      statusFilter,
    ]);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Teacher Portal
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Violation History
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Monitor the violation reports you submitted and
          their latest Guidance status.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="font-semibold text-red-700 dark:text-red-400">
            Unable to load violation history
          </p>

          <p className="mt-1 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Reports
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : violations.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Under Review
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : violations.filter(
                  (item) =>
                    item.status ===
                      "reported" ||
                    item.status ===
                      "under_review",
                ).length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Resolved
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : violations.filter(
                  (item) =>
                    item.status ===
                      "resolved" ||
                    item.status ===
                      "closed",
                ).length}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search student or violation..."
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="All">
              All Status
            </option>

            <option value="For Review">
              For Review
            </option>

            <option value="Under Review">
              Under Review
            </option>

            <option value="Resolved">
              Resolved
            </option>

            <option value="Closed">
              Closed
            </option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  Student
                </th>

                <th className="px-6 py-4 font-semibold">
                  Violation
                </th>

                <th className="px-6 py-4 font-semibold">
                  Incident Date
                </th>

                <th className="px-6 py-4 font-semibold">
                  Description
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 font-semibold">
                  Last Updated
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-sm text-gray-400"
                  >
                    Loading violation history...
                  </td>
                </tr>
              ) : filteredViolations.length >
                0 ? (
                filteredViolations.map(
                  (violation) => (
                    <tr
                      key={
                        violation.id
                      }
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                            {getInitials(
                              violation.studentName,
                            ) ||
                              "US"}
                          </div>

                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {
                                violation.studentName
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              {
                                violation.studentId
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400">
                              {
                                violation.gradeLevel
                              }{" "}
                              -{" "}
                              {
                                violation.section
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {
                            violation.violationType
                          }
                        </p>

                        {violation.category && (
                          <p className="mt-1 text-xs text-gray-400">
                            {
                              violation.category
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {violation.date ||
                          "—"}
                      </td>

                      <td className="max-w-md px-6 py-4 text-gray-600 dark:text-gray-300">
                        <p className="line-clamp-2">
                          {
                            violation.description
                          }
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            violation.status,
                          )}`}
                        >
                          {statusLabel(
                            violation.status,
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {violation.updatedAt
                          ? new Date(
                              violation.updatedAt,
                            ).toLocaleString()
                          : "—"}

                        <p className="mt-1 text-[11px] text-gray-400">
                          Record #
                          {
                            violation.id
                          }
                        </p>
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
                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                      No violation reports found
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Your submitted violation reports will
                      appear here.
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
            <span className="font-semibold">
              {
                filteredViolations.length
              }
            </span>{" "}
            of{" "}
            <span className="font-semibold">
              {violations.length}
            </span>{" "}
            reports
          </p>
        </div>
      </div>
    </div>
  );
}