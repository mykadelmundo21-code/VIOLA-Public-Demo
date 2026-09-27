import { useEffect, useMemo, useState } from "react";

type ViolationStatus =
  | "reported"
  | "under_review"
  | "resolved"
  | "closed";

type InterventionStatus =
  | "scheduled"
  | "active"
  | "completed";

type Violation = {
  id: number;
  studentDbId: number | null;
  studentId: string | null;
  studentName: string;
  gradeLevel: string | null;
  section: string | null;
  violationType: string;
  category: string | null;
  date: string | null;
  incidentAt: string | null;
  location: string | null;
  description: string | null;
  reportedBy: string;
  reportedByEmail: string | null;
  status: ViolationStatus;
};

type InterventionSummary = {
  id: number;
  violationId: number;
  interventionType: string;
  status: InterventionStatus;
  followUpDate: string | null;
};

type ApiResponse<T> = {
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
};

const violationTypes = [
  "All Violation Types",
  "Repetitive Disruptive Behaviors",
  "Bullying",
  "Illegal Drugs",
  "E-cigarettes and Cigarettes",
  "Deadly Weapons",
  "Verbal Threats",
  "Threats through Social Media",
  "Profanity",
  "Physical Altercation",
  "Foul Words",
  "Sexual Harassment",
  "Physical Abuse",
];

const interventionTypes = [
  "Counseling",
  "Parent Conference",
  "Behavioral Monitoring",
  "Restorative Action",
  "Referral",
  "Other",
];

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

function formatStatus(
  status: ViolationStatus,
): string {
  switch (status) {
    case "under_review":
      return "Under Review";

    case "resolved":
      return "Resolved";

    case "closed":
      return "Closed";

    case "reported":
    default:
      return "Pending Review";
  }
}

function getStatusClass(
  status: ViolationStatus,
): string {
  switch (status) {
    case "resolved":
      return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";

    case "closed":
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400";

    case "under_review":
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

    case "reported":
    default:
      return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatIncidentDate(
  incidentAt: string | null,
  fallback: string | null,
): string {
  if (!incidentAt) {
    return fallback ?? "—";
  }

  const date = new Date(incidentAt);

  if (Number.isNaN(date.getTime())) {
    return fallback ?? "—";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GuidanceViolations() {
  const [violations, setViolations] =
    useState<Violation[]>([]);

  const [interventions, setInterventions] =
    useState<InterventionSummary[]>([]);

  const [interventionsLoading, setInterventionsLoading] =
    useState(true);

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState("All Violation Types");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedViolation, setSelectedViolation] =
    useState<Violation | null>(null);

  const [updating, setUpdating] =
    useState(false);

  const [updateError, setUpdateError] =
    useState("");

  const [updateSuccess, setUpdateSuccess] =
    useState("");

  const [showInterventionForm, setShowInterventionForm] =
    useState(false);

  const [savingIntervention, setSavingIntervention] =
    useState(false);

  const [interventionError, setInterventionError] =
    useState("");

  const [interventionSuccess, setInterventionSuccess] =
    useState("");

  const [interventionType, setInterventionType] =
    useState("Counseling");

  const [reason, setReason] = useState("");

  const [startDate, setStartDate] = useState("");

  const [followUpDate, setFollowUpDate] =
    useState("");

  const [interventionStatus, setInterventionStatus] =
    useState<InterventionStatus>("scheduled");

  const [caseStatus, setCaseStatus] =
    useState<ViolationStatus>("reported");

  const [notes, setNotes] = useState("");

  const fetchViolations = async () => {
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
        `${API_BASE_URL}/guidance/violations`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let result: ApiResponse<Violation[]> = {};

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
          "You are not authorized to access Guidance violation records.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load violation records.",
        );
      }

      setViolations(
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
          "Unable to load violation records.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInterventions = async () => {
    setInterventionsLoading(true);

    try {
      const token = getAuthToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/guidance/interventions`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      let result: ApiResponse<InterventionSummary[]> = {};

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
          "You are not authorized to access Guidance interventions.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to load intervention records.",
        );
      }

      setInterventions(
        Array.isArray(result.data)
          ? result.data
          : [],
      );
    } catch {
      setInterventions([]);
    } finally {
      setInterventionsLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
    fetchInterventions();
  }, []);

  const filteredViolations = useMemo(() => {
    const searchTerm =
      search.toLowerCase().trim();

    return violations.filter(
      (violation) => {
        const matchesSearch =
          !searchTerm ||
          violation.studentName
            .toLowerCase()
            .includes(searchTerm) ||
          (violation.studentId ?? "")
            .toLowerCase()
            .includes(searchTerm) ||
          violation.violationType
            .toLowerCase()
            .includes(searchTerm);

        const matchesType =
          typeFilter ===
            "All Violation Types" ||
          violation.violationType ===
            typeFilter;

        const matchesStatus =
          statusFilter === "All" ||
          formatStatus(
            violation.status,
          ) === statusFilter;

        return (
          matchesSearch &&
          matchesType &&
          matchesStatus
        );
      },
    );
  }, [
    violations,
    search,
    typeFilter,
    statusFilter,
  ]);

  const totalViolations =
    violations.length;

  const pendingReview =
    violations.filter(
      (item) =>
        item.status === "reported",
    ).length;

  const underReview =
    violations.filter(
      (item) =>
        item.status === "under_review",
    ).length;

  const resolvedViolations =
    violations.filter(
      (item) =>
        item.status === "resolved",
    ).length;

  const resetInterventionForm = () => {
    setInterventionType("Counseling");
    setReason("");
    setStartDate(
      new Date()
        .toISOString()
        .split("T")[0],
    );
    setFollowUpDate("");
    setInterventionStatus("scheduled");
    setCaseStatus("reported");
    setNotes("");
  };

  const handleReview = (
    violation: Violation,
  ) => {
    setSelectedViolation(violation);
    setCaseStatus(violation.status);

    setUpdateError("");
    setUpdateSuccess("");

    setInterventionError("");
    setInterventionSuccess("");

    setShowInterventionForm(false);

    resetInterventionForm();
  };

  const closeModal = () => {
    if (
      updating ||
      savingIntervention
    ) {
      return;
    }

    setSelectedViolation(null);

    setShowInterventionForm(false);

    setUpdateError("");
    setUpdateSuccess("");

    setInterventionError("");
    setInterventionSuccess("");

    resetInterventionForm();
  };

  const handleCaseStatusChange = async (
    nextStatus: ViolationStatus,
  ) => {
    if (!selectedViolation) {
      return;
    }

    if (nextStatus === selectedViolation.status) {
      setCaseStatus(nextStatus);
      return;
    }

    if (
      nextStatus === "reported" &&
      selectedViolation.status !== "reported"
    ) {
      setUpdateError(
        "A reviewed case cannot be returned to Pending Review.",
      );
      setCaseStatus(selectedViolation.status);
      return;
    }

    if (
      nextStatus === "closed" &&
      selectedViolation.status !== "closed"
    ) {
      const existing = selectedViolation
        ? interventions.find(
            (intervention) =>
              intervention.violationId ===
              selectedViolation.id,
          ) ?? null
        : null;

      if (existing && existing.status !== "completed") {
        setUpdateError(
          "Complete the intervention before closing this case.",
        );
        setCaseStatus(selectedViolation.status);
        return;
      }
    }

    setUpdating(true);
    setUpdateError("");
    setUpdateSuccess("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "No authentication token found. Please log in again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/guidance/violations/${selectedViolation.id}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        },
      );

      let result: ApiResponse<Violation> = {};

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
          "You are not authorized to update violation records.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to update the violation status.",
        );
      }

      const updatedViolation = result.data;
      const finalStatus =
        updatedViolation?.status ?? nextStatus;

      setViolations((current) =>
        current.map((item) =>
          item.id === selectedViolation.id
            ? {
                ...item,
                ...(updatedViolation ?? {}),
                status: finalStatus,
              }
            : item,
        ),
      );

      setSelectedViolation((current) =>
        current
          ? {
              ...current,
              ...(updatedViolation ?? {}),
              status: finalStatus,
            }
          : null,
      );

      setCaseStatus(finalStatus);

      setUpdateSuccess(
        `Case status changed to ${formatStatus(finalStatus)}.`,
      );

      await fetchViolations();
    } catch (err) {
      if (err instanceof TypeError) {
        setUpdateError(
          "Unable to connect to the VIOLA server.",
        );
      } else if (err instanceof Error) {
        setUpdateError(err.message);
      } else {
        setUpdateError(
          "Unable to update the violation.",
        );
      }

      setCaseStatus(selectedViolation.status);
    } finally {
      setUpdating(false);
    }
  };

  const existingIntervention = selectedViolation
    ? interventions.find(
        (intervention) =>
          intervention.violationId ===
          selectedViolation.id,
      ) ?? null
    : null;

  const handleCreateIntervention = () => {
    if (!selectedViolation) {
      return;
    }

    if (existingIntervention) {
      window.location.href =
        `/guidance/interventions?edit=${existingIntervention.id}`;

      return;
    }

    if (
      selectedViolation.status !==
      "under_review"
    ) {
      setInterventionError(
        "The violation must be under review before creating an intervention.",
      );

      return;
    }

    if (
      !selectedViolation.studentDbId
    ) {
      setInterventionError(
        "Student database record could not be identified.",
      );

      return;
    }

    resetInterventionForm();

    setInterventionError("");
    setInterventionSuccess("");

    setShowInterventionForm(true);
  };

  const handleSaveIntervention = async () => {
    if (!selectedViolation) {
      return;
    }

    if (
      !selectedViolation.studentDbId
    ) {
      setInterventionError(
        "Student database record could not be identified.",
      );

      return;
    }

    if (existingIntervention) {
      window.location.href =
        `/guidance/interventions?edit=${existingIntervention.id}`;

      return;
    }

    if (
      selectedViolation.status !==
      "under_review"
    ) {
      setInterventionError(
        "The violation must be under review before creating an intervention.",
      );

      return;
    }

    if (!startDate) {
      setInterventionError(
        "Please select a start date.",
      );

      return;
    }

    if (
      followUpDate &&
      followUpDate < startDate
    ) {
      setInterventionError(
        "Follow-up date cannot be earlier than the start date.",
      );

      return;
    }

    setSavingIntervention(true);
    setInterventionError("");
    setInterventionSuccess("");

    try {
      const token = getAuthToken();

      if (!token) {
        throw new Error(
          "No authentication token found. Please log in again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/guidance/interventions`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_id:
              selectedViolation.studentDbId,

            violation_id:
              selectedViolation.id,

            intervention_type:
              interventionType,

            reason:
              reason.trim() || null,

            start_date:
              startDate,

            follow_up_date:
              followUpDate || null,

            status:
              interventionStatus,

            notes:
              notes.trim() || null,
          }),
        },
      );

      let result: ApiResponse<unknown> = {};

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
          "You are not authorized to create interventions.",
        );
      }

      if (response.status === 422) {
        if (result.errors) {
          const validationMessages =
            Object.values(
              result.errors,
            )
              .flat()
              .join(" ");

          throw new Error(
            validationMessages ||
              "Please check the intervention details.",
          );
        }

        throw new Error(
          result.message ||
            "The intervention details are invalid.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to save the intervention.",
        );
      }

      const createdIntervention =
        result.data as
          | InterventionSummary
          | undefined;

      if (
        createdIntervention &&
        typeof createdIntervention ===
          "object" &&
        "id" in createdIntervention
      ) {
        setInterventions((current) => [
          ...current.filter(
            (item) =>
              item.violationId !==
              selectedViolation.id,
          ),
          createdIntervention,
        ]);
      } else {
        await fetchInterventions();
      }

      setInterventionSuccess(
        "Intervention recorded successfully.",
      );

      setUpdateSuccess(
        "Intervention recorded successfully.",
      );

      setShowInterventionForm(false);

      resetInterventionForm();
    } catch (err) {
      if (err instanceof TypeError) {
        setInterventionError(
          "Unable to connect to the VIOLA server.",
        );
      } else if (err instanceof Error) {
        setInterventionError(
          err.message,
        );
      } else {
        setInterventionError(
          "Unable to save the intervention.",
        );
      }
    } finally {
      setSavingIntervention(false);
    }
  };

  return (
    <div className="space-y-7">

      {/* Header */}
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Student Discipline
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Violations
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Review and monitor reported student violations.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-500/20 dark:bg-red-500/10">
          <p className="font-semibold text-red-800 dark:text-red-400">
            Unable to load violations
          </p>

          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Violations
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : totalViolations}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            All recorded reports
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Pending Review
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : pendingReview}
          </p>

          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Awaiting Guidance review
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Under Review
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : underReview}
          </p>

          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Currently being reviewed
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Resolved
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : resolvedViolations}
          </p>

          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            Completed cases
          </p>
        </div>

      </div>

      {/* Filters and Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">

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

            <div className="flex flex-col gap-3 sm:flex-row">

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value,
                  )
                }
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
              >
                {violationTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
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
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
              >
                <option value="All">
                  All Status
                </option>

                <option value="Pending Review">
                  Pending Review
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

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1000px] text-left text-sm">

            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">

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

                <th className="px-6 py-4 text-right font-semibold">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">

              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center text-gray-500 dark:text-gray-400"
                  >
                    Loading violation records...
                  </td>
                </tr>
              ) : filteredViolations.length > 0 ? (
                filteredViolations.map(
                  (violation) => (
                    <tr
                      key={violation.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    >

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                            {getInitials(
                              violation.studentName,
                            )}
                          </div>

                          <div>

                            <p className="font-semibold text-gray-900 dark:text-white">
                              {
                                violation.studentName
                              }
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                              {violation.studentId ??
                                "No student ID"}
                            </p>

                          </div>

                        </div>

                      </td>

                      <td className="px-6 py-4">

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

                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {violation.gradeLevel
                          ? `${violation.gradeLevel} - ${
                              violation.section ??
                              ""
                            }`
                          : "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {violation.date ??
                          "—"}
                      </td>

                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {
                          violation.reportedBy
                        }
                      </td>

                      <td className="px-6 py-4">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            violation.status,
                          )}`}
                        >
                          {formatStatus(
                            violation.status,
                          )}
                        </span>

                      </td>

                      <td className="px-6 py-4 text-right">

                        <button
                          type="button"
                          onClick={() =>
                            handleReview(
                              violation,
                            )
                          }
                          className="font-semibold text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
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
                    colSpan={7}
                    className="px-6 py-14 text-center"
                  >
                    <p className="font-semibold text-gray-700 dark:text-gray-300">
                      No violations found
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      No records match the current filters.
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
                : filteredViolations.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {loading
                ? 0
                : violations.length}
            </span>{" "}
            violation reports
          </p>

        </div>

      </div>

      {/* Review Modal */}
      {selectedViolation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-700">

              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Violation Review
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                  Review Violation Report
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Review the submitted information before taking action.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  updating ||
                  savingIntervention
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="space-y-6 px-6 py-6">

              {/* Student */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-700/50">

                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Student
                </p>

                <div className="mt-3 flex items-center gap-3">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-white dark:bg-gray-700">
                    {getInitials(
                      selectedViolation.studentName,
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {
                        selectedViolation.studentName
                      }
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedViolation.studentId ??
                        "No student ID"}
                    </p>
                  </div>

                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Grade & Section
                    </p>

                    <p className="mt-1 font-semibold text-gray-800 dark:text-gray-200">
                      {selectedViolation.gradeLevel
                        ? `${selectedViolation.gradeLevel} - ${
                            selectedViolation.section ??
                            ""
                          }`
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Current Status
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        selectedViolation.status,
                      )}`}
                    >
                      {formatStatus(
                        selectedViolation.status,
                      )}
                    </span>
                  </div>

                </div>

              </div>

              {/* Case Status */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Case Status
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Update the overall violation case status. Intervention status is managed separately.
                    </p>
                  </div>

                  <select
                    value={caseStatus}
                    onChange={(event) =>
                      handleCaseStatusChange(
                        event.target.value as ViolationStatus,
                      )
                    }
                    disabled={updating || savingIntervention}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20 sm:w-52"
                  >
                    <option value="reported">
                      Pending Review
                    </option>
                    <option value="under_review">
                      Under Review
                    </option>
                    <option value="resolved">
                      Resolved
                    </option>
                    <option value="closed">
                      Closed
                    </option>
                  </select>
                </div>
              </div>

              {/* Violation Details */}
              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Violation Details
                </p>

                <div className="mt-3 grid gap-5 sm:grid-cols-2">

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Violation Type
                    </p>

                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {
                        selectedViolation.violationType
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Category
                    </p>

                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                      {selectedViolation.category ??
                        "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Incident Date
                    </p>

                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                      {formatIncidentDate(
                        selectedViolation.incidentAt,
                        selectedViolation.date,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Location
                    </p>

                    <p className="mt-1 text-gray-700 dark:text-gray-300">
                      {selectedViolation.location ??
                        "—"}
                    </p>
                  </div>

                </div>

              </div>

              {/* Description */}
              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Description
                </p>

                <div className="mt-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700">

                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {selectedViolation.description ||
                      "No description was provided."}
                  </p>

                </div>

              </div>

              {/* Report Information */}
              <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-700">

                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Report Information
                </p>

                <div className="mt-3 grid gap-4 sm:grid-cols-2">

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Reported By
                    </p>

                    <p className="mt-1 font-semibold text-gray-800 dark:text-gray-200">
                      {
                        selectedViolation.reportedBy
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Email
                    </p>

                    <p className="mt-1 break-all text-sm text-gray-600 dark:text-gray-300">
                      {selectedViolation.reportedByEmail ??
                        "—"}
                    </p>
                  </div>

                </div>

              </div>

              {/* Pending Review */}
              {selectedViolation.status ===
                "reported" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/20 dark:bg-amber-500/10">

                  <p className="font-semibold text-amber-800 dark:text-amber-400">
                    This case is awaiting Guidance review.
                  </p>

                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    Start the review before recording an intervention.
                  </p>

                </div>
              )}

              {/* Under Review */}
              {selectedViolation.status ===
                "under_review" && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-700/50">

                  {!showInterventionForm ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Guidance Action
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                        Case is Under Review
                      </h3>

                      {existingIntervention ? (
                        <>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            An intervention has already been recorded for this case.
                          </p>

                          <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  Current Intervention
                                </p>

                                <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                                  {existingIntervention.interventionType}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  Status
                                </p>

                                <p className="mt-1 font-semibold capitalize text-gray-800 dark:text-gray-200">
                                  {existingIntervention.status}
                                </p>
                              </div>

                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          Record the appropriate intervention based on the Guidance review.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Guidance Action
                          </p>

                          <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                            Record Intervention
                          </h3>
                        </div>

                        <button
                          type="button"
                          disabled={
                            savingIntervention
                          }
                          onClick={() => {
                            setShowInterventionForm(
                              false,
                            );

                            setInterventionError(
                              "",
                            );

                            setInterventionSuccess(
                              "",
                            );
                          }}
                          className="text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Cancel
                        </button>

                      </div>

                      <div className="mt-5 space-y-5">

                        {/* Intervention Type */}
                        <div>

                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Intervention Type
                          </label>

                          <select
                            value={
                              interventionType
                            }
                            onChange={(event) =>
                              setInterventionType(
                                event.target.value,
                              )
                            }
                            disabled={
                              savingIntervention
                            }
                            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                          >
                            {interventionTypes.map(
                              (type) => (
                                <option
                                  key={type}
                                  value={type}
                                >
                                  {type}
                                </option>
                              ),
                            )}
                          </select>

                        </div>

                        {/* Reason */}
                        <div>

                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Reason
                          </label>

                          <textarea
                            value={reason}
                            onChange={(event) =>
                              setReason(
                                event.target.value,
                              )
                            }
                            disabled={
                              savingIntervention
                            }
                            rows={3}
                            placeholder="Enter the reason for the intervention..."
                            className="mt-2 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                          />

                        </div>

                        {/* Dates */}
                        <div className="grid gap-4 sm:grid-cols-2">

                          <div>

                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                              Start Date
                            </label>

                            <input
                              type="date"
                              value={startDate}
                              onChange={(event) =>
                                setStartDate(
                                  event.target.value,
                                )
                              }
                              disabled={
                                savingIntervention
                              }
                              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                            />

                          </div>

                          <div>

                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                              Follow-up Date
                            </label>

                            <input
                              type="date"
                              value={followUpDate}
                              min={
                                startDate ||
                                undefined
                              }
                              onChange={(event) =>
                                setFollowUpDate(
                                  event.target.value,
                                )
                              }
                              disabled={
                                savingIntervention
                              }
                              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                            />

                          </div>

                        </div>

                        {/* Intervention Status */}
                        <div>

                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Intervention Status
                          </label>

                          <select
                            value={
                              interventionStatus
                            }
                            onChange={(event) =>
                              setInterventionStatus(
                                event.target.value as InterventionStatus,
                              )
                            }
                            disabled={
                              savingIntervention
                            }
                            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                          >
                            <option value="scheduled">
                              Scheduled
                            </option>

                            <option value="active">
                              Active
                            </option>

                            <option value="completed">
                              Completed
                            </option>
                          </select>

                        </div>

                        {/* Notes */}
                        <div>

                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Notes
                          </label>

                          <textarea
                            value={notes}
                            onChange={(event) =>
                              setNotes(
                                event.target.value,
                              )
                            }
                            disabled={
                              savingIntervention
                            }
                            rows={3}
                            placeholder="Additional Guidance notes..."
                            className="mt-2 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-500/20"
                          />

                        </div>

                        {interventionError && (
                          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                            <p className="text-sm font-semibold text-red-800 dark:text-red-400">
                              {interventionError}
                            </p>
                          </div>
                        )}

                        {interventionSuccess && (
                          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-500/20 dark:bg-green-500/10">
                            <p className="text-sm font-semibold text-green-800 dark:text-green-400">
                              {interventionSuccess}
                            </p>
                          </div>
                        )}

                      </div>
                    </>
                  )}

                </div>
              )}

              {updateSuccess && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-500/20 dark:bg-green-500/10">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-400">
                    {updateSuccess}
                  </p>
                </div>
              )}

              {updateError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-400">
                    {updateError}
                  </p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-6 py-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  updating ||
                  savingIntervention
                }
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Close
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">

                {selectedViolation.status ===
                  "under_review" &&
                  !showInterventionForm && (
                  <button
                    type="button"
                    onClick={
                      handleCreateIntervention
                    }
                    disabled={
                      interventionsLoading
                    }
                    className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
                  >
                    {interventionsLoading
                      ? "Loading..."
                      : existingIntervention
                        ? "Update Intervention"
                        : "Create Intervention"}
                  </button>
                )}

                {selectedViolation.status ===
                  "under_review" &&
                  showInterventionForm && (
                  <button
                    type="button"
                    onClick={
                      handleSaveIntervention
                    }
                    disabled={
                      savingIntervention
                    }
                    className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
                  >
                    {savingIntervention
                      ? "Saving..."
                      : "Save Intervention"}
                  </button>
                )}

                {selectedViolation.status ===
                  "resolved" && (
                  <div className="rounded-lg bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    Case Resolved
                  </div>
                )}

                {selectedViolation.status ===
                  "closed" && (
                  <div className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    Case Closed
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}