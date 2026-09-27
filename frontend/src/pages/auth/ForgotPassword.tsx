  import { useState, type FormEvent } from "react";
  import { Link, useNavigate } from "react-router-dom";

  const API_URL = "http://localhost:8000/api";

  export default function ForgotPassword() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    const handleSubmit = async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");
      setLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/forgot-password`,
          {
            method: "POST",

            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              email: email.trim(),
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to process your request.",
          );
        }

        setSuccess(
          "A password reset code has been sent to your email.",
        );

        /*
        * Give the user a moment to see the success message,
        * then move to the reset password page.
        */
        setTimeout(() => {
          navigate(
            `/reset-password?email=${encodeURIComponent(
              email.trim(),
            )}`,
          );
        }, 1200);
      } catch (err) {
        if (err instanceof TypeError) {
          setError(
            "Unable to connect to the VIOLA server. Make sure Laravel is running.",
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

          {/* Logo */}
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800 text-2xl font-bold text-white">
            <span className="text-red-500">
              V
            </span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
              Account Recovery
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Forgot your password?
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Enter your registered email address and we'll send
              you a verification code to reset your password.
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
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
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
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your registered email"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-900/30"
                required
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
                  Sending...
                </>
              ) : (
                "Send Reset Code"
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