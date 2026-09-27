import { useEffect, useMemo, useRef, useState } from "react";

type InterventionStatus =
  | "active"
  | "scheduled"
  | "completed";

type Intervention = {
  id: number;
  violationId: number;
  studentId: string;
  studentName: string;
  gradeLevel: string;
  section: string;
  violationType: string;
  interventionType: string;
  reason: string | null;
  startDate: string;
  followUpDate: string | null;
  assignedTo: string;
  status: InterventionStatus;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type HistoryRecord = {
  id: number;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  modifiedBy: string;
  modifiedAt: string | null;
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

function normalizeString(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function normalizeNullableString(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return String(value);
}

function normalizeStatus(
  value: unknown,
): InterventionStatus {
  if (
    value === "active" ||
    value === "scheduled" ||
    value === "completed"
  ) {
    return value;
  }

  return "scheduled";
}

function normalizeIntervention(
  value: Partial<Intervention> &
    Record<string, unknown>,
): Intervention {
  return {
    id: Number(value.id || 0),

    violationId: Number(
      value.violationId ??
        value.violation_id ??
        0,
    ),

    studentId: normalizeString(
      value.studentId ??
        value.student_id,
    ),

    studentName:
      normalizeString(
        value.studentName ??
          value.student_name,
      ) || "Unknown Student",

    gradeLevel:
      normalizeString(
        value.gradeLevel ??
          value.grade_level,
      ) || "—",

    section:
      normalizeString(
        value.section,
      ) || "—",

    violationType:
      normalizeString(
        value.violationType ??
          value.violation_type,
      ) || "Unknown Violation",

    interventionType:
      normalizeString(
        value.interventionType ??
          value.intervention_type,
      ) || "Other",

    reason: normalizeNullableString(
      value.reason,
    ),

    startDate:
      normalizeString(
        value.startDate ??
          value.start_date,
      ),

    followUpDate:
      normalizeNullableString(
        value.followUpDate ??
          value.follow_up_date,
      ),

    assignedTo:
      normalizeString(
        value.assignedTo ??
          value.assigned_to,
      ) || "Guidance",

    status: normalizeStatus(
      value.status,
    ),

    notes: normalizeNullableString(
      value.notes,
    ),

    createdAt:
      normalizeNullableString(
        value.createdAt ??
          value.created_at,
      ),

    updatedAt:
      normalizeNullableString(
        value.updatedAt ??
          value.updated_at,
      ),
  };
}

function formatStatus(
  status: InterventionStatus,
): string {
  if (status === "active") {
    return "Active";
  }

  if (status === "scheduled") {
    return "Scheduled";
  }

  return "Completed";
}

function getStatusClass(
  status: InterventionStatus,
): string {
  if (status === "active") {
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";
  }

  if (status === "scheduled") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
  }

  return "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400";
}

function formatHistoryField(
  field: string,
): string {
  const labels: Record<string, string> = {
    intervention_type:
      "Intervention Type",

    reason:
      "Reason",

    start_date:
      "Start Date",

    follow_up_date:
      "Follow-up Date",

    status:
      "Status",

    notes:
      "Notes",
  };

  return (
    labels[field] ||
    field
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )
  );
}

function formatHistoryValue(
  field: string,
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (field === "status") {
    if (value === "active") {
      return "Active";
    }

    if (value === "scheduled") {
      return "Scheduled";
    }

    if (value === "completed") {
      return "Completed";
    }
  }


  return String(value);
}

function toInputDate(
  value: string | null,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date
    .toISOString()
    .slice(0, 10);
}

function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    },
  );
}

export default function GuidanceInterventions() {
  const [interventions, setInterventions] =
    useState<Intervention[]>([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notifyingId, setNotifyingId] =
    useState<number | null>(null);

  const [notifyMessage, setNotifyMessage] =
    useState("");

  const [
    editingIntervention,
    setEditingIntervention,
  ] =
    useState<Intervention | null>(null);

  const [
    historyIntervention,
    setHistoryIntervention,
  ] =
    useState<Intervention | null>(null);

  const [history, setHistory] =
    useState<HistoryRecord[]>([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historyError, setHistoryError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [editMessage, setEditMessage] =
    useState("");

  const editQueryHandled = useRef(false);

  const fetchInterventions =
    async () => {
      setLoading(true);
      setError("");

      try {
        const token =
          getAuthToken();

        if (!token) {
          throw new Error(
            "No authentication token found. Please log in again.",
          );
        }

        const response =
          await fetch(
            `${API_BASE_URL}/guidance/interventions`,
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

        let result: {
          data?: unknown;
          message?: string;
        } = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (
          response.status === 401
        ) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        if (
          response.status === 403
        ) {
          throw new Error(
            "You are not authorized to access interventions.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to load interventions.",
          );
        }

        const rawData =
          Array.isArray(result.data)
            ? result.data
            : [];

        const normalized =
          rawData.map((item) =>
            normalizeIntervention(
              item as Record<
                string,
                unknown
              >,
            ),
          );

        setInterventions(
          normalized,
        );

        if (!editQueryHandled.current) {
          const editParam =
            new URLSearchParams(
              window.location.search,
            ).get("edit");

          const editId = Number(editParam);

          if (
            editParam &&
            Number.isInteger(editId) &&
            editId > 0
          ) {
            const target =
              normalized.find(
                (item) =>
                  item.id === editId,
              );

            if (target) {
              editQueryHandled.current = true;

              setEditingIntervention({
                ...target,
                startDate:
                  toInputDate(
                    target.startDate,
                  ),
                followUpDate:
                  toInputDate(
                    target.followUpDate,
                  ),
              });

              window.history.replaceState(
                {},
                document.title,
                window.location.pathname,
              );
            }
          }
        }
      } catch (err) {
        if (
          err instanceof TypeError
        ) {
          setError(
            "Unable to connect to the VIOLA server. Make sure the Laravel backend is running.",
          );
        } else if (
          err instanceof Error
        ) {
          setError(err.message);
        } else {
          setError(
            "Unable to load interventions.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchInterventions();
  }, []);

  const notifyParent =
    async (
      intervention: Intervention,
    ) => {
      const token =
        getAuthToken();

      if (!token) {
        setNotifyMessage(
          "Your session has expired. Please log in again.",
        );

        return;
      }

      setNotifyingId(
        intervention.id,
      );

      setNotifyMessage("");

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/guidance/interventions/${intervention.id}/notify-parent`,
            {
              method: "POST",
              headers: {
                Accept:
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        let result: {
          message?: string;
          parent_count?: number;
        } = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (
          response.status === 401
        ) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        if (
          response.status === 403
        ) {
          throw new Error(
            "You are not authorized to notify parents.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to notify parent.",
          );
        }

        setNotifyMessage(
          result.message ||
            "Parent notification sent successfully.",
        );

        setInterventions(
          (current) => current,
        );
      } catch (err) {
        if (
          err instanceof TypeError
        ) {
          setNotifyMessage(
            "Unable to connect to the VIOLA server.",
          );
        } else if (
          err instanceof Error
        ) {
          setNotifyMessage(
            err.message,
          );
        } else {
          setNotifyMessage(
            "Failed to notify parent.",
          );
        }
      } finally {
        setNotifyingId(null);
      }
    };

  const openHistory =
    async (
      intervention: Intervention,
    ) => {
      const token =
        getAuthToken();

      if (!token) {
        setHistoryError(
          "Your session has expired. Please log in again.",
        );

        return;
      }

      setHistoryIntervention(
        intervention,
      );

      setHistory([]);

      setHistoryError("");

      setHistoryLoading(true);

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/guidance/interventions/${intervention.id}/history`,
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

        let result: {
          data?: unknown;
          message?: string;
        } = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to load intervention history.",
          );
        }

        const rawHistory =
          Array.isArray(
            result.data,
          )
            ? result.data
            : [];

        const normalizedHistory =
          rawHistory.map(
            (
              item: any,
            ): HistoryRecord => ({
              id: Number(
                item.id || 0,
              ),

              oldValues:
                item.oldValues ??
                item.old_values ??
                null,

              newValues:
                item.newValues ??
                item.new_values ??
                null,

              modifiedBy:
                normalizeString(
                  item.modifiedBy ??
                    item.modified_by,
                ) ||
                "Unknown User",

              modifiedAt:
                normalizeNullableString(
                  item.modifiedAt ??
                    item.modified_at,
                ),
            }),
          );

        setHistory(
          normalizedHistory,
        );
      } catch (err) {
        if (
          err instanceof TypeError
        ) {
          setHistoryError(
            "Unable to connect to the VIOLA server.",
          );
        } else if (
          err instanceof Error
        ) {
          setHistoryError(
            err.message,
          );
        } else {
          setHistoryError(
            "Failed to load intervention history.",
          );
        }
      } finally {
        setHistoryLoading(false);
      }
    };

  const saveEdit =
    async () => {
      if (
        !editingIntervention
      ) {
        return;
      }

      const token =
        getAuthToken();

      if (!token) {
        setEditMessage(
          "Your session has expired. Please log in again.",
        );

        return;
      }

      setSaving(true);
      setEditMessage("");

      try {
        const payload = {
          intervention_type:
            editingIntervention.interventionType.trim(),

          reason:
            editingIntervention.reason?.trim() ||
            null,

          start_date:
            editingIntervention.startDate,

          follow_up_date:
            editingIntervention.followUpDate ||
            null,

          status:
            editingIntervention.status,

          notes:
            editingIntervention.notes?.trim() ||
            null,
        };

        const response =
          await fetch(
            `${API_BASE_URL}/guidance/interventions/${editingIntervention.id}`,
            {
              method: "PUT",
              headers: {
                Accept:
                  "application/json",
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify(
                payload,
              ),
            },
          );

        let result: {
          message?: string;
          data?: unknown;
          errors?: Record<
            string,
            string[]
          >;
        } = {};

        try {
          result =
            await response.json();
        } catch {
          result = {};
        }

        if (
          response.status === 401
        ) {
          throw new Error(
            "Your session has expired. Please log in again.",
          );
        }

        if (
          response.status === 403
        ) {
          throw new Error(
            "You are not authorized to edit interventions.",
          );
        }

        if (
          response.status === 422
        ) {
          if (
            result.errors
          ) {
            const firstError =
              Object.values(
                result.errors,
              )[0]?.[0];

            throw new Error(
              firstError ||
                result.message ||
                "Please check the intervention details.",
            );
          }

          throw new Error(
            result.message ||
              "Please check the intervention details.",
          );
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to update intervention.",
          );
        }

        await fetchInterventions();

        setEditingIntervention(
          null,
        );

        setEditMessage(
          result.message ||
            "Intervention updated successfully.",
        );
      } catch (err) {
        if (
          err instanceof TypeError
        ) {
          setEditMessage(
            "Unable to connect to the VIOLA server.",
          );
        } else if (
          err instanceof Error
        ) {
          setEditMessage(
            err.message,
          );
        } else {
          setEditMessage(
            "Failed to update intervention.",
          );
        }
      } finally {
        setSaving(false);
      }
    };

  const filteredInterventions =
    useMemo(() => {
      const term =
        search
          .toLowerCase()
          .trim();

      return interventions.filter(
        (item) => {
          const studentName =
            normalizeString(
              item.studentName,
            ).toLowerCase();

          const studentId =
            normalizeString(
              item.studentId,
            ).toLowerCase();

          const violationType =
            normalizeString(
              item.violationType,
            ).toLowerCase();

          const interventionType =
            normalizeString(
              item.interventionType,
            ).toLowerCase();

          const matchesSearch =
            !term ||
            studentName.includes(
              term,
            ) ||
            studentId.includes(
              term,
            ) ||
            violationType.includes(
              term,
            ) ||
            interventionType.includes(
              term,
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            formatStatus(
              item.status,
            ) ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      interventions,
      search,
      statusFilter,
    ]);

  const total =
    interventions.length;

  const active =
    interventions.filter(
      (item) =>
        item.status ===
        "active",
    ).length;

  const scheduled =
    interventions.filter(
      (item) =>
        item.status ===
        "scheduled",
    ).length;


  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Student Support
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Interventions
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Record and monitor actions taken by
          Guidance after reviewing student
          violation cases.
        </p>
      </div>

      {notifyMessage && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {notifyMessage}
          </p>
        </div>
      )}

      {editMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 dark:border-green-900/50 dark:bg-green-950/30">
          <p className="text-sm font-medium text-green-800 dark:text-green-400">
            {editMessage}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="font-semibold text-red-800 dark:text-red-400">
            Unable to load interventions
          </p>

          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Interventions
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : total}
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Recorded Guidance actions
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Active
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? "—" : active}
          </p>

          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            Currently ongoing
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Scheduled
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {loading
              ? "—"
              : scheduled}
          </p>

          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Upcoming actions
          </p>
        </div>

      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
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
                placeholder="Search student or intervention..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-950/40"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:focus:border-red-500"
            >
              <option value="All">
                All Status
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Scheduled">
                Scheduled
              </option>

              <option value="Completed">
                Completed
              </option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">
                  Student
                </th>

                <th className="px-6 py-4 font-semibold">
                  Violation
                </th>

                <th className="px-6 py-4 font-semibold">
                  Intervention
                </th>

                <th className="px-6 py-4 font-semibold">
                  Follow-up
                </th>

                <th className="px-6 py-4 font-semibold">
                  Status
                </th>

                <th className="px-6 py-4 font-semibold">
                  Modified
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
                    colSpan={7}
                    className="px-6 py-14 text-center"
                  >
                    <p className="font-semibold text-gray-700 dark:text-gray-200">
                      Loading interventions...
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Retrieving Guidance records.
                    </p>
                  </td>
                </tr>
              ) : filteredInterventions.length >
                0 ? (
                filteredInterventions.map(
                  (item) => {

                    const notifying =
                      notifyingId ===
                      item.id;

                    const safeStudentName =
                      item.studentName ||
                      "Unknown Student";

                    const initials =
                      safeStudentName
                        .split(" ")
                        .filter(Boolean)
                        .map(
                          (name) =>
                            name[0],
                        )
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() ||
                      "US";

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-white dark:bg-gray-700">
                              {initials}
                            </div>

                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {safeStudentName}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {item.studentId ||
                                  "—"}
                              </p>

                              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                                {item.gradeLevel ||
                                  "—"}{" "}
                                -{" "}
                                {item.section ||
                                  "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {item.violationType ||
                              "Unknown Violation"}
                          </p>

                          {item.reason && (
                            <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
                              {item.reason}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                          {item.interventionType ||
                            "Other"}
                        </td>

                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {item.followUpDate
                            ? toInputDate(
                                item.followUpDate,
                              )
                            : "—"}
                        </td>


                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              item.status,
                            )}`}
                          >
                            {formatStatus(
                              item.status,
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.updatedAt &&
                            item.createdAt &&
                            item.updatedAt !==
                              item.createdAt ? (
                              <>
                                <p>
                                  Modified{" "}
                                  {formatDateTime(
                                    item.updatedAt,
                                  )}
                                </p>

                                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                                  Created{" "}
                                  {formatDateTime(
                                    item.createdAt,
                                  )}
                                </p>
                              </>
                            ) : (
                              <p>
                                Not modified
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingIntervention(
                                  {
                                    ...item,

                                    startDate:
                                      toInputDate(
                                        item.startDate,
                                      ),

                                    followUpDate:
                                      toInputDate(
                                        item.followUpDate,
                                      ),
                                  },
                                )
                              }
                              className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openHistory(
                                  item,
                                )
                              }
                              className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              History
                            </button>

                            <button
                              type="button"
                              disabled={notifying}
                              onClick={() =>
                                notifyParent(item)
                              }
                              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                notifying
                                  ? "cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                                  : "bg-red-700 text-white hover:bg-red-800"
                              }`}
                            >
                              {notifying
                                ? "Sending..."
                                : "Notify Parent"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800">
                      ✓
                    </div>

                    <p className="mt-3 font-semibold text-gray-700 dark:text-gray-200">
                      No interventions found
                    </p>

                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      No Guidance interventions
                      have been recorded yet.
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
              {filteredInterventions.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-200">
              {interventions.length}
            </span>{" "}
            interventions
          </p>
        </div>
      </div>

      {editingIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                    Intervention #
                    {editingIntervention.id}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    Edit Intervention
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {editingIntervention.studentName ||
                      "Unknown Student"}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setEditingIntervention(
                      null,
                    )
                  }
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Intervention Type
                </label>

                <select
                  value={
                    editingIntervention.interventionType ||
                    "Other"
                  }
                  onChange={(event) =>
                    setEditingIntervention(
                      (current) =>
                        current
                          ? {
                              ...current,
                              interventionType:
                                event.target.value,
                            }
                          : current,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Counseling">
                    Counseling
                  </option>

                  <option value="Parent Conference">
                    Parent Conference
                  </option>

                  <option value="Behavioral Monitoring">
                    Behavioral Monitoring
                  </option>

                  <option value="Restorative Action">
                    Restorative Action
                  </option>

                  <option value="Referral">
                    Referral
                  </option>

                  <option value="Other">
                    Other
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Reason
                </label>

                <textarea
                  rows={3}
                  value={
                    editingIntervention.reason ||
                    ""
                  }
                  onChange={(event) =>
                    setEditingIntervention(
                      (current) =>
                        current
                          ? {
                              ...current,
                              reason:
                                event.target.value,
                            }
                          : current,
                    )
                  }
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      editingIntervention.startDate ||
                      ""
                    }
                    onChange={(event) =>
                      setEditingIntervention(
                        (current) =>
                          current
                            ? {
                                ...current,
                                startDate:
                                  event.target.value,
                              }
                            : current,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Follow-up Date
                  </label>

                  <input
                    type="date"
                    value={
                      editingIntervention.followUpDate ||
                      ""
                    }
                    min={
                      editingIntervention.startDate ||
                      undefined
                    }
                    onChange={(event) =>
                      setEditingIntervention(
                        (current) =>
                          current
                            ? {
                                ...current,
                                followUpDate:
                                  event.target
                                    .value ||
                                  null,
                              }
                            : current,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Status
                </label>

                <select
                  value={
                    editingIntervention.status
                  }
                  onChange={(event) =>
                    setEditingIntervention(
                      (current) =>
                        current
                          ? {
                              ...current,
                              status:
                                event.target
                                  .value as InterventionStatus,
                            }
                          : current,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
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


              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Notes
                </label>

                <textarea
                  rows={4}
                  value={
                    editingIntervention.notes ||
                    ""
                  }
                  onChange={(event) =>
                    setEditingIntervention(
                      (current) =>
                        current
                          ? {
                              ...current,
                              notes:
                                event.target.value,
                            }
                          : current,
                    )
                  }
                  placeholder="Additional Guidance notes..."
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Record Information
                </p>

                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">
                      Created
                    </p>

                    <p className="mt-1 font-medium text-gray-700 dark:text-gray-200">
                      {formatDateTime(
                        editingIntervention.createdAt,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Last Modified
                    </p>

                    <p className="mt-1 font-medium text-gray-700 dark:text-gray-200">
                      {editingIntervention.updatedAt &&
                      editingIntervention.createdAt &&
                      editingIntervention.updatedAt !==
                        editingIntervention.createdAt
                        ? formatDateTime(
                            editingIntervention.updatedAt,
                          )
                        : "Not modified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-5 dark:border-gray-800">
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setEditingIntervention(
                    null,
                  )
                }
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveEdit}
                className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                    Intervention #
                    {historyIntervention.id}
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                    Modification History
                  </h2>

                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {historyIntervention.studentName ||
                      "Unknown Student"}{" "}
                    ·{" "}
                    {
                      historyIntervention.interventionType
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setHistoryIntervention(
                      null,
                    )
                  }
                  className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <div className="py-12 text-center">
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    Loading history...
                  </p>
                </div>
              ) : historyError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {historyError}
                  </p>
                </div>
              ) : history.length ===
                0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    No modifications yet
                  </p>

                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    This intervention has not
                    been edited.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {history.map(
                    (record) => {
                      const oldValues =
                        record.oldValues ||
                        {};

                      const newValues =
                        record.newValues ||
                        {};

                      const fields =
                        Array.from(
                          new Set([
                            ...Object.keys(
                              oldValues,
                            ),
                            ...Object.keys(
                              newValues,
                            ),
                          ]),
                        ).filter(
                          (field) =>
                            String(
                              oldValues[
                                field
                              ] ??
                                "",
                            ) !==
                            String(
                              newValues[
                                field
                              ] ??
                                "",
                            ),
                        );

                      return (
                        <div
                          key={
                            record.id
                          }
                          className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                        >
                          <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                Modified by{" "}
                                {
                                  record.modifiedBy
                                }
                              </p>

                              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                {formatDateTime(
                                  record.modifiedAt,
                                )}
                              </p>
                            </div>

                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              Modification #
                              {
                                record.id
                              }
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            {fields.map(
                              (field) => (
                                <div
                                  key={
                                    field
                                  }
                                  className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60"
                                >
                                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {formatHistoryField(
                                      field,
                                    )}
                                  </p>

                                  <div className="mt-2 flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
                                    <div className="flex-1 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
                                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                                        Previous
                                      </p>

                                      <p className="break-words">
                                        {formatHistoryValue(
                                          field,
                                          oldValues[
                                            field
                                          ],
                                        )}
                                      </p>
                                    </div>

                                    <div className="hidden text-gray-400 sm:block">
                                      →
                                    </div>

                                    <div className="flex-1 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-green-700 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-400">
                                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                                        Updated
                                      </p>

                                      <p className="break-words">
                                        {formatHistoryValue(
                                          field,
                                          newValues[
                                            field
                                          ],
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ),
                            )}

                            {fields.length ===
                              0 && (
                              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                                No field changes were
                                recorded for this
                                modification.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-200 px-6 py-5 dark:border-gray-800">
              <button
                type="button"
                onClick={() =>
                  setHistoryIntervention(
                    null,
                  )
                }
                className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}