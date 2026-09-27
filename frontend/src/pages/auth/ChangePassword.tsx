import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:8000/api";

type StoredUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  must_change_password?: boolean;
  [key: string]: any;
};

function getToken(): string | null {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

function getStoredUser(): StoredUser | null {
  const raw =
    localStorage.getItem("viola_user") ||
    sessionStorage.getItem("viola_user");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getRoleHome(role: string) {
  switch (role.toLowerCase()) {
    case "guidance":
      return "/guidance";

    case "teacher":
      return "/teacher";

    case "parent":
      return "/parent";

    default:
      return "/login";
  }
}

export default function ChangePassword() {
  const navigate = useNavigate();

  const user = getStoredUser();
  const token = getToken();

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  if (!token || !user) {
    navigate("/login", {
      replace: true,
    });

    return null;
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(
        "New password must be at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "New password and confirmation do not match.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/change-password`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            password,
            password_confirmation: confirmPassword,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 422 &&
          data.errors
        ) {
          const firstError =
            Object.values(data.errors)
              .flat()
              .find(
                (message) =>
                  typeof message === "string",
              );

          throw new Error(
            firstError ||
              data.message ||
              "Unable to change password.",
          );
        }

        throw new Error(
          data.message ||
            "Unable to change password. Please try again.",
        );
      }

      const updatedUser =
        data.user || {
          ...user,
          must_change_password: false,
        };

      const storage =
        localStorage.getItem("viola_token")
          ? localStorage
          : sessionStorage;

      storage.setItem(
        "viola_user",
        JSON.stringify(updatedUser),
      );

      storage.setItem(
        "viola_portal",
        String(
          updatedUser.role ||
            user.role,
        ).toLowerCase(),
      );

      window.dispatchEvent(
        new CustomEvent(
          "viola-auth-changed",
          {
            detail: updatedUser,
          },
        ),
      );

      window.dispatchEvent(
        new CustomEvent(
          "viola-profile-updated",
          {
            detail: updatedUser,
          },
        ),
      );

      window.dispatchEvent(
        new CustomEvent(
          "viola-preferences-loaded",
          {
            detail: updatedUser,
          },
        ),
      );

      navigate(
        getRoleHome(
          updatedUser.role ||
            user.role,
        ),
        {
          replace: true,
        },
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
          "Something went wrong. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900 md:p-10">

        <div className="mb-8">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-red-700 text-2xl font-bold text-white shadow-sm">
            V
          </div>

          <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
            First Login
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Change Your Password
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            For security, you need to change your temporary password before continuing to VIOLA.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="current-password"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Temporary Password
            </label>

            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(
                  event.target.value,
                )
              }
              placeholder="Enter your temporary password"
              autoComplete="current-password"
              disabled={loading}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-900/30 dark:disabled:bg-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              New Password
            </label>

            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              placeholder="Enter your new password"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-900/30 dark:disabled:bg-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Confirm New Password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Confirm your new password"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={8}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-900/30 dark:disabled:bg-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-red-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 active:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}