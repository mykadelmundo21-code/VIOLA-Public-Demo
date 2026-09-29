import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");

  const [code, setCode] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  useEffect(() => {
    const emailFromUrl = searchParams.get("email") || "";

    setEmail(emailFromUrl);
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (code.length !== 6) {
      setError("Please enter the 6-digit verification code.");

      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");

      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email: email.trim(),
          code,
          password,
          password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          const firstError = Object.values(data.errors)[0] as string[];

          throw new Error(
            firstError?.[0] || data.message || "Unable to reset password.",
          );
        }

        throw new Error(data.message || "Unable to reset password.");
      }

      setSuccess("Password reset successfully. Redirecting to login...");

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1500);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the VIOLA server. Make sure Laravel is running.",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-800 dark:bg-gray-900 md:p-10">
        {/* Logo */}
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800 text-2xl font-bold text-white">
          <span className="text-red-500">V</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
            Account Security
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Reset your password
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Enter the verification code sent to your email and create a new
            password.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
          >
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              required
            />
          </div>

          {/* Verification Code */}
          <div>
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Verification Code
            </label>

            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="Enter 6-digit code"
              autoComplete="one-time-code"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-center text-lg font-bold tracking-[0.4em] text-gray-900 outline-none transition placeholder:text-gray-400 placeholder:tracking-normal focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              required
            />
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              New Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              required
            />
          </div>

          {/* Password Requirements */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              Password requirements
            </p>

            <ul className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <li>• Use at least 8 characters</li>
              <li>• Avoid using easily guessed information</li>
            </ul>
          </div>

          {/* Reset Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-red-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 active:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* Back */}
        <div className="mt-8 border-t border-gray-200 pt-6 text-center dark:border-gray-800">
          <Link
            to="/login"
            className="text-sm font-medium text-gray-600 transition hover:text-red-700 dark:text-gray-400"
          >
            ← Back to Login
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          VIOLA • An Intelligent Student Violation Monitoring
        </p>
      </div>
    </div>
  );
}
