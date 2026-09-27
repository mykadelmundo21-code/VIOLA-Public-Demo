import {
  useMemo,
  useEffect,
  useState,
} from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

type Student = {
  id: number;
  name: string;
  student_id: string;
  grade: string;
  section: string;
};

type Violation = {
  id: number;
  type: string;
  category: string | null;
  date: string;
  description: string;
  status:
    | "For Review"
    | "Under Review"
    | "Resolved"
    | "Closed"
    | string;
  rawStatus?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ParentViolationsResponse = {
  student: Student | null;
  violations: Violation[];
};

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

function getInitials(
  name: string,
): string {
  return (name || "Student")
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

function getStatusClass(
  status: string,
): string {
  switch (status) {
    case "For Review":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

    case "Under Review":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

    case "Resolved":
      return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400";

    case "Closed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

export default function ParentViolations() {
  const [student, setStudent] =
    useState<Student | null>(null);

  const [violations, setViolations] =
    useState<Violation[]>([]);

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
            `${API_BASE_URL}/parent/violations`,
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

        const data: ParentViolationsResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            (
              data as any
            )?.message ||
              "Failed to load violation records.",
          );
        }

        setStudent(
          data.student,
        );

        setViolations(
          Array.isArray(
            data.violations,
          )
            ? data.violations
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load violation records.",
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
      if (
        statusFilter ===
        "All"
      ) {
        return violations;
      }

      return violations.filter(
        (violation) =>
          violation.status ===
          statusFilter,
      );
    }, [
      violations,
      statusFilter,
    ]);

  const underReviewCount =
    violations.filter(
      (violation) =>
        violation.status ===
          "For Review" ||
        violation.status ===
          "Under Review",
    ).length;

  const resolvedCount =
    violations.filter(
      (violation) =>
        violation.status ===
          "Resolved" ||
        violation.status ===
          "Closed",
    ).length;

  if (loading) {
    return (
      <div className="space-y-7">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Parent Portal
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Violation Records
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Loading your child's violation records...
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading violation records...
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
            Violation Records
          </h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="font-semibold text-red-700 dark:text-red-400">
            Unable to load violation records
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
            Violation Records
          </h1>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            No student linked
          </p>

          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            This parent account is not currently linked to a
            student.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Parent Portal
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Violation Records
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          View your child's recorded violation history and
          latest case status.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-white dark:bg-gray-700">
            {getInitials(
              student.name,
            )}
          </div>

          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white">
              {student.name}
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {student.student_id} •{" "}
              {student.grade} -{" "}
              {student.section}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Records
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {violations.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Under Review
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {underReviewCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Resolved
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {resolvedCount}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">
              Violation History
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Records submitted by school personnel.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:w-auto"
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

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filteredViolations.length >
          0 ? (
            filteredViolations.map(
              (violation) => (
                <div
                  key={
                    violation.id
                  }
                  className="p-6 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {
                            violation.type
                          }
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            violation.status,
                          )}`}
                        >
                          {
                            violation.status
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        Incident Date:{" "}
                        {
                          violation.date
                        }
                      </p>

                      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {
                          violation.description
                        }
                      </p>

                      {violation.updatedAt && (
                        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                          Last status update:{" "}
                          {new Date(
                            violation.updatedAt,
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500">
                      Record #
                      {
                        violation.id
                      }
                    </span>
                  </div>
                </div>
              ),
            )
          ) : (
            <div className="px-6 py-14 text-center">
              <p className="font-semibold text-gray-700 dark:text-gray-200">
                No records found
              </p>

              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                There are no violations matching the selected
                status.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/50">
        <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Violation records are provided for parent
          transparency and monitoring. For questions regarding
          a case, please coordinate with the Guidance Office.
        </p>
      </div>
    </div>
  );
}