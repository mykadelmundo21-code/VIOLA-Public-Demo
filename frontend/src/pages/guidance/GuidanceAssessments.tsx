import { useEffect, useMemo, useState } from "react";

type SuggestionType =
  | "assessment"
  | "parent_conference"
  | "assessment_and_parent";

type AssessmentSuggestion = {
  id: number;
  studentId: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  violationType: string;
  violationCount: number;
  reason: string;
  suggestion: SuggestionType;
  createdAt: string;
};

type ReviewViolation = {
  id: number;
  violationType: string;
  category?: string | null;
  incidentAt?: string | null;
  location?: string | null;
  description?: string | null;
  reportedBy?: string | null;
  reportedByEmail?: string | null;
  status?: string | null;
};

type ReviewIntervention = {
  id: number;
  violationId?: number | null;
  violationType?: string | null;
  interventionType?: string | null;
  reason?: string | null;
  startDate?: string | null;
  followUpDate?: string | null;
  status?: string | null;
  parentContactRequired?: boolean;
  parentContactMethod?: string | null;
  parentContactStatus?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ReviewData = {
  student: {
    id: number;
    studentId: string;
    name: string;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    gradeLevel: string;
    section: string;
    schoolYear: string;
    status: string;
  };
  currentViolation: ReviewViolation;
  violationCount: number;
  reason: string;
  suggestion: SuggestionType;
  violations: ReviewViolation[];
  interventions: ReviewIntervention[];
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

function getSuggestionLabel(
  suggestion: SuggestionType,
): string {
  if (suggestion === "assessment") {
    return "Student Assessment";
  }

  if (suggestion === "parent_conference") {
    return "Parent Conference";
  }

  return "Assessment + Parent Conference";
}

function getSuggestionClass(
  suggestion: SuggestionType,
): string {
  if (suggestion === "parent_conference") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }

  if (suggestion === "assessment_and_parent") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
}

function formatStatus(status?: string | null): string {
  if (!status) return "—";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export default function GuidanceAssessments() {
  const [suggestions, setSuggestions] = useState<
    AssessmentSuggestion[]
  >([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] =
    useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewData, setReviewData] =
    useState<ReviewData | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
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
          `${API_BASE_URL}/guidance/assessment-suggestions`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        let result: {
          data?: AssessmentSuggestion[];
          message?: string;
        } = {};

        try {
          result = await response.json();
        } catch {
          result = {};
        }

        if (response.status === 401) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You are not authorized to access assessment suggestions.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to load assessment suggestions.",
          );
        }

        setSuggestions(
          Array.isArray(result.data)
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
            "Unable to load assessment suggestions.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  const handleReview = async (
    violationId: number,
  ) => {
    setReviewOpen(true);
    setReviewLoading(true);
    setReviewError("");
    setReviewData(null);

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "No authentication token found. Please log in again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/guidance/assessment-suggestions/${violationId}/review`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let result: {
        data?: ReviewData;
        message?: string;
      } = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (response.status === 401) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      if (response.status === 403) {
        throw new Error(
          "You are not authorized to review this assessment suggestion.",
        );
      }

      if (response.status === 404) {
        throw new Error(
          "The violation record could not be found.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load assessment review.",
        );
      }

      if (!result.data) {
        throw new Error(
          "No review information was returned.",
        );
      }

      setReviewData(result.data);
    } catch (err) {
      if (err instanceof TypeError) {
        setReviewError(
          "Unable to connect to the VIOLA server. Make sure the Laravel backend is running.",
        );
      } else if (err instanceof Error) {
        setReviewError(err.message);
      } else {
        setReviewError(
          "Unable to load assessment review.",
        );
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const closeReview = () => {
    setReviewOpen(false);
    setReviewData(null);
    setReviewError("");
  };

  const filteredSuggestions = useMemo(() => {
    const term = search.toLowerCase().trim();

    return suggestions.filter((item) => {
      const matchesSearch =
        !term ||
        item.studentName
          .toLowerCase()
          .includes(term) ||
        item.studentId
          .toLowerCase()
          .includes(term) ||
        item.violationType
          .toLowerCase()
          .includes(term) ||
        item.reason
          .toLowerCase()
          .includes(term);

      const matchesFilter =
        filter === "All" ||
        (filter === "Assessment" &&
          item.suggestion === "assessment") ||
        (filter === "Parent Conference" &&
          item.suggestion ===
            "parent_conference") ||
        (filter === "Assessment + Parent" &&
          item.suggestion ===
            "assessment_and_parent");

      return matchesSearch && matchesFilter;
    });
  }, [suggestions, search, filter]);

  const assessmentCount = suggestions.filter(
    (item) =>
      item.suggestion === "assessment",
  ).length;

  const parentCount = suggestions.filter(
    (item) =>
      item.suggestion === "parent_conference",
  ).length;

  const combinedCount = suggestions.filter(
    (item) =>
      item.suggestion ===
      "assessment_and_parent",
  ).length;

  return (
    <>
      <div className="space-y-7">

        {/* Header */}
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Intelligent Suggestions
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
            Assessment Suggestions
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            VIOLA identifies student cases that may benefit
            from further assessment or parent involvement.
            Guidance makes the final decision.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
            <p className="font-semibold text-red-800 dark:text-red-400">
              Unable to load suggestions
            </p>

            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid gap-4 sm:grid-cols-3">

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Assessment Suggested
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : assessmentCount}
            </p>

            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Students needing further review
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Parent Conference
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : parentCount}
            </p>

            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Parent involvement suggested
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Both Suggested
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? "—" : combinedCount}
            </p>

            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Assessment and parent involvement
            </p>
          </div>

        </div>

        {/* Suggestions */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

          {/* Toolbar */}
          <div className="border-b border-gray-200 p-5 dark:border-gray-700">

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              <div className="relative w-full xl:max-w-md">

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
                  placeholder="Search student or violation..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                />

              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
              >
                <option value="All">
                  All Suggestions
                </option>

                <option value="Assessment">
                  Assessment
                </option>

                <option value="Parent Conference">
                  Parent Conference
                </option>

                <option value="Assessment + Parent">
                  Assessment + Parent
                </option>
              </select>

            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] text-left text-sm">

              <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">

                <tr>

                  <th className="px-6 py-4 font-semibold">
                    Student
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Violation
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Violation Count
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Reason
                  </th>

                  <th className="px-6 py-4 font-semibold">
                    Suggested Action
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
                        Loading suggestions...
                      </p>

                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Checking violation records.
                      </p>
                    </td>
                  </tr>
                ) : filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
                      >

                        <td className="px-6 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                              {item.studentName
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

                            <div>

                              <p className="font-semibold text-gray-900 dark:text-white">
                                {item.studentName}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {item.studentId}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {item.gradeLevel} -{" "}
                                {item.section}
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                          {item.violationType}
                        </td>

                        <td className="px-6 py-4">

                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.violationCount}
                          </span>

                        </td>

                        <td className="max-w-xs px-6 py-4 text-gray-600 dark:text-gray-300">
                          {item.reason}
                        </td>

                        <td className="px-6 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSuggestionClass(
                              item.suggestion,
                            )}`}
                          >
                            {getSuggestionLabel(
                              item.suggestion,
                            )}
                          </span>

                        </td>

                        <td className="px-6 py-4 text-right">

                          <button
                            type="button"
                            onClick={() =>
                              handleReview(item.id)
                            }
                            className="font-semibold text-red-700 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Review
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
                        ✓
                      </div>

                      <p className="mt-3 font-semibold text-gray-700 dark:text-gray-300">
                        No suggestions available
                      </p>

                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        No student cases currently require a suggested assessment or parent conference.
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
                {filteredSuggestions.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {suggestions.length}
              </span>{" "}
              suggestions
            </p>

          </div>

        </div>

      </div>

      {/* Review Modal */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70">

          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                  Guidance Review
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  Assessment Suggestion Review
                </h2>

              </div>

              <button
                type="button"
                onClick={closeReview}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                ×
              </button>

            </div>

            {/* Modal Content */}
            <div className="max-h-[calc(90vh-85px)] overflow-y-auto p-6">

              {reviewLoading ? (
                <div className="py-16 text-center">

                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    Loading review details...
                  </p>

                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    Retrieving student and violation history.
                  </p>

                </div>
              ) : reviewError ? (

                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">

                  <p className="font-semibold text-red-800 dark:text-red-400">
                    Unable to load review
                  </p>

                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {reviewError}
                  </p>

                </div>

              ) : reviewData ? (

                <div className="space-y-6">

                  {/* Student Information */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-700/50">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Student
                        </p>

                        <h3 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                          {reviewData.student.name}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {reviewData.student.studentId}
                        </p>

                      </div>

                      <span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600">
                        {reviewData.student.gradeLevel} -{" "}
                        {reviewData.student.section}
                      </span>

                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-3">

                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          School Year
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {reviewData.student.schoolYear}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Student Status
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {formatStatus(
                            reviewData.student.status,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Total Violations
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {reviewData.violationCount}
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* Suggestion */}
                  <div className="rounded-xl border border-red-100 bg-red-50 p-5 dark:border-red-500/20 dark:bg-red-500/10">

                    <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                      VIOLA Suggestion
                    </p>

                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${getSuggestionClass(
                          reviewData.suggestion,
                        )}`}
                      >
                        {getSuggestionLabel(
                          reviewData.suggestion,
                        )}
                      </span>

                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {reviewData.reason}
                    </p>

                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      This is only a system-generated suggestion.
                      Guidance makes the final decision.
                    </p>

                  </div>

                  {/* Current Violation */}
                  <div>

                    <div className="mb-3">

                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Current Violation
                      </h3>

                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        The violation that triggered this suggestion.
                      </p>

                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">

                      <div className="grid gap-5 md:grid-cols-2">

                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Violation
                          </p>

                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {
                              reviewData.currentViolation.violationType
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Status
                          </p>

                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {formatStatus(
                              reviewData.currentViolation.status,
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Incident Date
                          </p>

                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {reviewData.currentViolation.incidentAt ||
                              "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Location
                          </p>

                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {reviewData.currentViolation.location ||
                              "—"}
                          </p>
                        </div>

                      </div>

                      {reviewData.currentViolation.description && (
                        <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700">

                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Description
                          </p>

                          <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            {
                              reviewData.currentViolation
                                .description
                            }
                          </p>

                        </div>
                      )}

                      <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-700">

                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Reported By
                        </p>

                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                          {reviewData.currentViolation.reportedBy ||
                            "Unknown"}
                        </p>

                        {reviewData.currentViolation
                          .reportedByEmail && (
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                            {
                              reviewData.currentViolation
                                .reportedByEmail
                            }
                          </p>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* Violation History */}
                  <div>

                    <div className="mb-3">

                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Violation History
                      </h3>

                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Previous and current recorded violations.
                      </p>

                    </div>

                    {reviewData.violations.length > 0 ? (

                      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">

                        <div className="overflow-x-auto">

                          <table className="w-full min-w-[750px] text-left text-sm">

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
                                  Status
                                </th>

                                <th className="px-5 py-3 font-semibold">
                                  Reported By
                                </th>

                              </tr>

                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

                              {reviewData.violations.map(
                                (violation) => (

                                  <tr
                                    key={violation.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                  >

                                    <td className="px-5 py-4 font-medium text-gray-800 dark:text-gray-200">
                                      {
                                        violation.violationType
                                      }
                                    </td>

                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                      {violation.incidentAt ||
                                        "—"}
                                    </td>

                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                      {violation.location ||
                                        "—"}
                                    </td>

                                    <td className="px-5 py-4">

                                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                        {formatStatus(
                                          violation.status,
                                        )}
                                      </span>

                                    </td>

                                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                      {violation.reportedBy ||
                                        "Unknown"}
                                    </td>

                                  </tr>

                                ),
                              )}

                            </tbody>

                          </table>

                        </div>

                      </div>

                    ) : (

                      <div className="rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
                        No violation history available.
                      </div>

                    )}

                  </div>

                  {/* Intervention History */}
                  <div>

                    <div className="mb-3">

                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        Intervention History
                      </h3>

                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Existing interventions related to this student.
                      </p>

                    </div>

                    {reviewData.interventions.length > 0 ? (

                      <div className="space-y-3">

                        {reviewData.interventions.map(
                          (intervention) => (

                            <div
                              key={intervention.id}
                              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
                            >

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                <div>

                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {intervention.interventionType ||
                                      "Intervention"}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                    {
                                      intervention.violationType
                                    }
                                  </p>

                                </div>

                                <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                  {formatStatus(
                                    intervention.status,
                                  )}
                                </span>

                              </div>

                              <div className="mt-4 grid gap-4 sm:grid-cols-3">

                                <div>

                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Start Date
                                  </p>

                                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                    {intervention.startDate ||
                                      "—"}
                                  </p>

                                </div>

                                <div>

                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Follow-up Date
                                  </p>

                                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                    {intervention.followUpDate ||
                                      "—"}
                                  </p>

                                </div>

                                <div>

                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Assigned To
                                  </p>

                                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                    {intervention.assignedTo ||
                                      "Guidance"}
                                  </p>

                                </div>

                              </div>

                              {intervention.reason && (
                                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">

                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Reason
                                  </p>

                                  <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                    {intervention.reason}
                                  </p>

                                </div>
                              )}

                              {intervention.notes && (
                                <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">

                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Notes
                                  </p>

                                  <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                    {intervention.notes}
                                  </p>

                                </div>
                              )}

                            </div>

                          ),
                        )}

                      </div>

                    ) : (

                      <div className="rounded-xl border border-gray-200 px-5 py-8 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
                        No intervention history available.
                      </div>

                    )}

                  </div>

                  {/* Footer Notice */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-700/50">

                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      VIOLA provides this information to support
                      Guidance in reviewing the case. The system does
                      not automatically assign disciplinary action or
                      make the final decision.
                    </p>

                  </div>

                </div>

              ) : null}

            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700/50">

              <button
                type="button"
                onClick={closeReview}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}