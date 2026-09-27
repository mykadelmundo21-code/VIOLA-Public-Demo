import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

type Student = {
  id: number;
  name: string;
  student_id: string;
  grade: string;
  section: string;
  school_year: string;
  status: string;
};

type DashboardResponse = {
  student: Student | null;
};

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

export default function ParentStudent() {
  const [student, setStudent] =
    useState<Student | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStudent = async () => {
      const token = getAuthToken();

      if (!token) {
        setError("You are not authenticated.");
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

        const data: DashboardResponse =
          await response.json();

        if (!response.ok) {
          throw new Error(
            (data as any)?.message ||
              "Failed to load student information.",
          );
        }

        setStudent(data.student);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load student information.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, []);

  const initials = useMemo(() => {
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
            Student Information
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Loading your child's school information...
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading student information...
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
            Student Information
          </h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-5 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="font-semibold text-red-700 dark:text-red-400">
            Unable to load student information
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
            Student Information
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            View your child's basic school information.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="font-semibold text-gray-700 dark:text-gray-200">
            No student linked
          </p>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This parent account is not currently linked to a
            student.
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
          Student Information
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          View your child's basic school information.
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-gray-800/50">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Student Profile
          </h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xl font-bold text-white dark:bg-gray-700">
              {initials}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {student.name}
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {student.student_id}
              </p>

              <span className="mt-3 inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                {student.status}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-5 border-t border-gray-200 pt-6 dark:border-gray-800 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Student ID
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {student.student_id}
              </p>
            </div>

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

            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                School Year
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-200">
                {student.school_year}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Access Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-bold text-gray-900 dark:text-white">
          Parent Access
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          This account is linked to the student shown above.
          Student information is provided for monitoring purposes
          and cannot be modified from the Parent Portal.
        </p>
      </div>
    </div>
  );
}