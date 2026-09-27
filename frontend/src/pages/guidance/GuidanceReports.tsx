import { useEffect, useMemo, useState } from "react";

type ReportViolation = {
  id: number;
  studentId: string;
  student: string;
  violation: string;
  grade: string;
  section: string;
  date: string;
  reportedBy: string;
  status: string;
};

type AssessmentSuggestion = {
  id: number;
  studentName: string;
  suggestion: string;
};

type Intervention = {
  id: number;
  studentName: string;
  status: string;
  parentContactRequired: boolean;
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

function formatDate(value: unknown): string {
  if (!value) {
    return "";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().split("T")[0];
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
}

function getDateRange(period: string) {
  const now = new Date();

  const start = new Date(now);
  const end = new Date(now);

  if (period === "This Month") {
    start.setDate(1);
  }

  if (period === "Last Month") {
    start.setMonth(now.getMonth() - 1, 1);
    end.setMonth(now.getMonth(), 0);
  }

  if (period === "This Quarter") {
    const currentQuarter =
      Math.floor(now.getMonth() / 3);

    start.setMonth(currentQuarter * 3, 1);
  }

  if (period === "This School Year") {
    const schoolYearStart =
      now.getMonth() >= 5
        ? now.getFullYear()
        : now.getFullYear() - 1;

    start.setFullYear(
      schoolYearStart,
      5,
      1,
    );
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
  };
}

function isWithinPeriod(
  dateValue: string,
  period: string,
): boolean {
  if (!dateValue) {
    return true;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  const { start, end } =
    getDateRange(period);

  return date >= start && date <= end;
}

function normalizeViolation(
  raw: any,
): ReportViolation {
  const student =
    raw.studentName ||
    raw.student?.name ||
    [
      raw.student?.first_name,
      raw.student?.middle_name,
      raw.student?.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Unknown Student";

  const violation =
    raw.violationType ||
    raw.violation_type?.name ||
    raw.violation?.violationType?.name ||
    raw.type ||
    "Unknown Violation";

  const grade =
    raw.gradeLevel ||
    raw.grade_level ||
    raw.student?.grade_level ||
    "";

  const section =
    raw.section ||
    raw.student?.section ||
    "";

  const date =
    raw.date ||
    raw.incident_at ||
    raw.created_at ||
    "";

  const reportedBy =
    raw.reportedBy ||
    raw.reported_by?.name ||
    raw.violation?.reportedBy?.name ||
    "Unknown";

  let status =
    raw.status ||
    raw.violation?.status ||
    "reported";

  status = String(status)
    .replace("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase(),
    );

  return {
    id: Number(raw.id || 0),
    studentId:
      raw.studentId ||
      raw.student_id ||
      raw.student?.student_id ||
      "",
    student,
    violation,
    grade,
    section,
    date: formatDate(date),
    reportedBy,
    status,
  };
}

export default function GuidanceReports() {
  const [violations, setViolations] =
    useState<ReportViolation[]>([]);

  const [assessmentSuggestions, setAssessmentSuggestions] =
    useState<AssessmentSuggestion[]>([]);

  const [interventions, setInterventions] =
    useState<Intervention[]>([]);

  const [gradeFilter, setGradeFilter] =
    useState("All");

  const [period, setPeriod] =
    useState("This School Year");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [exporting, setExporting] =
    useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError("");

      try {
        const token = getAuthToken();

        if (!token) {
          throw new Error(
            "No authentication token found. Please log in again.",
          );
        }

        const headers = {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [
          violationsResponse,
          suggestionsResponse,
          interventionsResponse,
        ] = await Promise.all([
          fetch(
            `${API_BASE_URL}/guidance/violations`,
            {
              headers,
            },
          ),

          fetch(
            `${API_BASE_URL}/guidance/assessment-suggestions`,
            {
              headers,
            },
          ),

          fetch(
            `${API_BASE_URL}/guidance/interventions`,
            {
              headers,
            },
          ),
        ]);

        if (
          violationsResponse.status === 401 ||
          suggestionsResponse.status === 401 ||
          interventionsResponse.status === 401
        ) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        if (
          violationsResponse.status === 403 ||
          suggestionsResponse.status === 403 ||
          interventionsResponse.status === 403
        ) {
          throw new Error(
            "You are not authorized to access these reports.",
          );
        }

        if (!violationsResponse.ok) {
          throw new Error(
            "Failed to load violation records.",
          );
        }

        if (!suggestionsResponse.ok) {
          throw new Error(
            "Failed to load assessment suggestions.",
          );
        }

        if (!interventionsResponse.ok) {
          throw new Error(
            "Failed to load intervention records.",
          );
        }

        const violationsJson =
          await violationsResponse.json();

        const suggestionsJson =
          await suggestionsResponse.json();

        const interventionsJson =
          await interventionsResponse.json();

        const violationData =
          Array.isArray(
            violationsJson.data,
          )
            ? violationsJson.data
            : [];

        const suggestionData =
          Array.isArray(
            suggestionsJson.data,
          )
            ? suggestionsJson.data
            : [];

        const interventionData =
          Array.isArray(
            interventionsJson.data,
          )
            ? interventionsJson.data
            : [];

        setViolations(
          violationData.map(
            normalizeViolation,
          ),
        );

        setAssessmentSuggestions(
          suggestionData,
        );

        setInterventions(
          interventionData,
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
            "Unable to load report data.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filteredRecords = useMemo(() => {
    return violations.filter((record) => {
      const matchesGrade =
        gradeFilter === "All" ||
        record.grade === gradeFilter;

      const matchesPeriod =
        isWithinPeriod(
          record.date,
          period,
        );

      return (
        matchesGrade &&
        matchesPeriod
      );
    });
  }, [
    violations,
    gradeFilter,
    period,
  ]);

  const totalViolations =
    filteredRecords.length;

  const reported =
    filteredRecords.filter(
      (record) =>
        record.status === "Reported",
    ).length;

  const underReview =
    filteredRecords.filter(
      (record) =>
        record.status === "Under Review",
    ).length;

  const resolved =
    filteredRecords.filter(
      (record) =>
        record.status === "Resolved",
    ).length;

  const grade11Count =
    filteredRecords.filter(
      (record) =>
        record.grade === "Grade 11",
    ).length;

  const grade12Count =
    filteredRecords.filter(
      (record) =>
        record.grade === "Grade 12",
    ).length;

  const violationTypeCounts =
    filteredRecords.reduce(
      (result, record) => {
        result[record.violation] =
          (result[record.violation] || 0) +
          1;

        return result;
      },
      {} as Record<string, number>,
    );

  const sortedViolationTypes =
    Object.entries(
      violationTypeCounts,
    ).sort(
      (a, b) => b[1] - a[1],
    );

  const maxViolationCount =
    sortedViolationTypes.length > 0
      ? sortedViolationTypes[0][1]
      : 1;

  const suggestedAssessments =
    assessmentSuggestions.length;

  const activeInterventions =
    interventions.filter(
      (item) =>
        item.status === "active",
    ).length;

  const scheduledInterventions =
    interventions.filter(
      (item) =>
        item.status === "scheduled",
    ).length;

  const completedInterventions =
    interventions.filter(
      (item) =>
        item.status === "completed",
    ).length;

  const parentContacts =
    interventions.filter(
      (item) =>
        item.parentContactRequired,
    ).length;

  const exportReport = () => {
    setExporting(true);

    try {
      const lines: string[] = [];

      lines.push(
        "VIOLA - Violation Monitoring Report",
      );

      lines.push(
        `Period,${escapeCsv(period)}`,
      );

      lines.push(
        `Grade Level,${escapeCsv(
          gradeFilter === "All"
            ? "All Grade Levels"
            : gradeFilter,
        )}`,
      );

      lines.push("");

      lines.push(
        "VIOLATION SUMMARY",
      );

      lines.push(
        `Total Violations,${totalViolations}`,
      );

      lines.push(
        `Reported,${reported}`,
      );

      lines.push(
        `Under Review,${underReview}`,
      );

      lines.push(
        `Resolved,${resolved}`,
      );

      lines.push("");

      lines.push(
        "VIOLATIONS BY TYPE",
      );

      lines.push(
        "Violation Type,Count",
      );

      if (
        sortedViolationTypes.length ===
        0
      ) {
        lines.push(
          `${escapeCsv(
            "No violation records",
          )},0`,
        );
      } else {
        sortedViolationTypes.forEach(
          ([type, count]) => {
            lines.push(
              `${escapeCsv(
                type,
              )},${count}`,
            );
          },
        );
      }

      lines.push("");

      lines.push(
        "VIOLATIONS BY GRADE",
      );

      lines.push(
        "Grade Level,Count",
      );

      lines.push(
        `Grade 11,${grade11Count}`,
      );

      lines.push(
        `Grade 12,${grade12Count}`,
      );

      lines.push("");

      lines.push(
        "ASSESSMENT SUGGESTIONS",
      );

      lines.push(
        `Students Suggested for Assessment,${suggestedAssessments}`,
      );

      lines.push("");

      lines.push(
        "INTERVENTION SUMMARY",
      );

      lines.push(
        `Total Interventions,${interventions.length}`,
      );

      lines.push(
        `Active,${activeInterventions}`,
      );

      lines.push(
        `Scheduled,${scheduledInterventions}`,
      );

      lines.push(
        `Completed,${completedInterventions}`,
      );

      lines.push(
        `Parent Contact Required,${parentContacts}`,
      );

      lines.push("");

      lines.push(
        "VIOLATION RECORDS",
      );

      lines.push(
        "Student ID,Student,Violation,Grade,Section,Date,Reported By,Status",
      );

      if (
        filteredRecords.length ===
        0
      ) {
        lines.push(
          `"","","","","","","","No records"`,
        );
      } else {
        filteredRecords.forEach(
          (record) => {
            lines.push(
              [
                record.studentId,
                record.student,
                record.violation,
                record.grade,
                record.section,
                record.date,
                record.reportedBy,
                record.status,
              ]
                .map(escapeCsv)
                .join(","),
            );
          },
        );
      }

      const csvContent =
        "\uFEFF" +
        lines.join("\r\n");

      const blob = new Blob(
        [csvContent],
        {
          type: "text/csv;charset=utf-8;",
        },
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      const date =
        new Date()
          .toISOString()
          .split("T")[0];

      link.href = url;

      link.download =
        `VIOLA_Report_${date}.csv`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-7">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Monitoring & Analytics
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Reports
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View summarized student violation,
            assessment suggestion, and intervention
            records.
          </p>
        </div>

        <button
          type="button"
          onClick={exportReport}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"
            />
          </svg>

          {exporting
            ? "Exporting..."
            : "Export Report"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="font-semibold text-red-800 dark:text-red-300">
            Unable to load report data
          </p>

          <p className="mt-1 text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Report Filters
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Adjust the records included in this report.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
            >
              <option value="This School Year">
                This School Year
              </option>

              <option value="This Month">
                This Month
              </option>

              <option value="Last Month">
                Last Month
              </option>

              <option value="This Quarter">
                This Quarter
              </option>
            </select>

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

              <option value="Grade 11">
                Grade 11
              </option>

              <option value="Grade 12">
                Grade 12
              </option>
            </select>

          </div>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Violation Summary
          </h2>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Overview for{" "}
            {period.toLowerCase()}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Violations
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : totalViolations}
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Recorded cases
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Reported
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : reported}
            </p>

            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Awaiting review
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Under Review
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : underReview}
            </p>

            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Active cases
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Resolved
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : resolved}
            </p>

            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              Completed cases
            </p>
          </div>

        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <div className="mb-6">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Violations by Type
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Distribution of recorded violation cases.
            </p>
          </div>

          <div className="space-y-5">

            {sortedViolationTypes.length > 0 ? (
              sortedViolationTypes.map(
                ([type, count]) => {
                  const percentage =
                    (count /
                      maxViolationCount) *
                    100;

                  return (
                    <div key={type}>

                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {type}
                        </span>

                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {count}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className="h-full rounded-full bg-red-700 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                    </div>
                  );
                },
              )
            ) : (
              <div className="py-10 text-center">
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  No violation records
                </p>

                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  There are no records for the selected filters.
                </p>
              </div>
            )}

          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <div className="mb-6">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Violations by Grade Level
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Comparison between Grade 11 and Grade 12.
            </p>
          </div>

          <div className="flex h-64 items-end justify-center gap-16 border-b border-gray-200 px-8 dark:border-gray-700">

            <div className="flex h-full flex-col items-center justify-end">

              <span className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                {grade11Count}
              </span>

              <div
                className="w-20 rounded-t-lg bg-gray-700 transition-all dark:bg-gray-500"
                style={{
                  height: `${Math.max(
                    grade11Count * 35,
                    12,
                  )}px`,
                }}
              />

              <span className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Grade 11
              </span>

            </div>

            <div className="flex h-full flex-col items-center justify-end">

              <span className="mb-2 text-sm font-bold text-gray-900 dark:text-white">
                {grade12Count}
              </span>

              <div
                className="w-20 rounded-t-lg bg-red-700 transition-all"
                style={{
                  height: `${Math.max(
                    grade12Count * 35,
                    12,
                  )}px`,
                }}
              />

              <span className="mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Grade 12
              </span>

            </div>

          </div>
        </div>

      </div>

      <div className="grid gap-5 xl:grid-cols-2">

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <div className="mb-5">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Assessment Suggestions
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Students identified for possible further assessment.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-5 dark:bg-gray-700/50">

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Suggested Cases
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading
                ? "—"
                : suggestedAssessments}
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Guidance reviews and decides the appropriate action.
            </p>

          </div>

        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          <div className="mb-5">
            <h2 className="font-bold text-gray-900 dark:text-white">
              Intervention Summary
            </h2>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Recorded Guidance intervention actions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {loading
                  ? "—"
                  : interventions.length}
              </p>
            </div>

            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/30">
              <p className="text-xs text-red-700 dark:text-red-400">
                Active
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {loading
                  ? "—"
                  : activeInterventions}
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Scheduled
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {loading
                  ? "—"
                  : scheduledInterventions}
              </p>
            </div>

            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
              <p className="text-xs text-green-700 dark:text-green-400">
                Completed
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {loading
                  ? "—"
                  : completedInterventions}
              </p>
            </div>

          </div>

          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Parent Contact Required
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {loading
                ? "—"
                : parentContacts}
            </p>
          </div>

        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">

          <h2 className="font-bold text-gray-900 dark:text-white">
            Violation Records
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Records included in the current report.
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[950px] text-left text-sm">

            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
              <tr>

                <th className="px-6 py-4 font-semibold">
                  Student
                </th>

                <th className="px-6 py-4 font-semibold">
                  Violation
                </th>

                <th className="px-6 py-4 font-semibold">
                  Grade & Section
                </th>

                <th className="px-6 py-4 font-semibold">
                  Date
                </th>

                <th className="px-6 py-4 font-semibold">
                  Reported By
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
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
                      Loading report data...
                    </p>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map(
                  (record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >

                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {record.student}
                        </p>

                        {record.studentId && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {record.studentId}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                        {record.violation}
                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {record.grade
                          ? `${record.grade} - ${record.section}`
                          : "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {record.date || "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {record.reportedBy}
                      </td>

                      <td className="px-6 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            record.status ===
                            "Resolved"
                              ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                              : record.status ===
                                  "Under Review"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          }`}
                        >
                          {record.status}
                        </span>

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

                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400">
                      !
                    </div>

                    <p className="mt-3 font-semibold text-gray-700 dark:text-gray-300">
                      No violation records available
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      There are no records matching the selected filters.
                    </p>

                  </td>

                </tr>
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}