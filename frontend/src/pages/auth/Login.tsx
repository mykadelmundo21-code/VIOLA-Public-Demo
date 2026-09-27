import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

type LoginResponse = {
  message?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string | null;
    profile_picture?: string | null;
    must_change_password?: boolean;
  };
  token?: string;
};

const API_URL = "http://localhost:8000/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [remember, setRemember] = useState(false);

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
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data: LoginResponse =
        await response.json();

      if (!response.ok) {
        if (response.status === 422) {
          throw new Error(
            data.message ||
              "The email or password you entered is incorrect.",
          );
        }

        throw new Error(
          data.message ||
            "Unable to sign in. Please try again.",
        );
      }

      if (!data.token || !data.user) {
        throw new Error(
          "Invalid response received from the server.",
        );
      }

      const role =
        data.user.role.toLowerCase();

      if (
        role !== "guidance" &&
        role !== "teacher" &&
        role !== "parent"
      ) {
        throw new Error(
          "Your account does not have a valid VIOLA role.",
        );
      }

      localStorage.removeItem("viola_token");
      localStorage.removeItem("viola_user");
      localStorage.removeItem("viola_portal");

      sessionStorage.removeItem("viola_token");
      sessionStorage.removeItem("viola_user");
      sessionStorage.removeItem("viola_portal");

      const storage = remember
        ? localStorage
        : sessionStorage;

      storage.setItem(
        "viola_token",
        data.token,
      );

      storage.setItem(
        "viola_user",
        JSON.stringify(data.user),
      );

      storage.setItem(
        "viola_portal",
        role,
      );

      window.dispatchEvent(
        new CustomEvent(
          "viola-auth-changed",
          {
            detail: data.user,
          },
        ),
      );

      window.dispatchEvent(
        new CustomEvent(
          "viola-profile-updated",
          {
            detail: data.user,
          },
        ),
      );

      window.dispatchEvent(
        new CustomEvent(
          "viola-preferences-loaded",
          {
            detail: data.user,
          },
        ),
      );

      if (data.user.must_change_password) {
        setSuccess(
          "Login successful. You need to change your temporary password.",
        );

        navigate("/change-password", {
          replace: true,
        });

        return;
      }

      setSuccess(
        "Login successful. Redirecting...",
      );

      switch (role) {
        case "guidance":
          navigate("/guidance", {
            replace: true,
          });
          break;

        case "teacher":
          navigate("/teacher", {
            replace: true,
          });
          break;

        case "parent":
          navigate("/parent", {
            replace: true,
          });
          break;
      }
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
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="grid min-h-[600px] md:grid-cols-2">

          <div className="flex flex-col justify-center bg-gray-800 p-10 text-white md:p-12 dark:bg-gray-950">

            <div className="mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-2xl font-bold text-red-700 shadow-sm">
                V
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight">
              VIOLA
            </h1>

            <p className="mt-3 text-lg font-medium text-gray-300">
              An Intelligent Student
              <br />
              Violation Monitoring
            </p>

            <div className="mt-10 border-t border-gray-600 pt-6">
              <p className="max-w-sm text-sm leading-relaxed text-gray-300">
                A centralized platform for violation reporting,
                student monitoring, assessment, and intervention.
              </p>
            </div>

            <div className="mt-8 h-1 w-16 rounded-full bg-red-600" />
          </div>

          <div className="flex items-center p-8 md:p-12">
            <div className="mx-auto w-full max-w-md">

              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-700">
                  Welcome Back
                </p>

                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Sign in to VIOLA
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Enter your account credentials to continue.
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

              {success && (
                <div
                  role="status"
                  className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
                >
                  {success}
                </div>
              )}

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
                    placeholder="Enter your email"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-900/30 dark:disabled:bg-gray-900"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-red-700 transition hover:text-red-800"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-red-500 dark:focus:ring-red-900/30 dark:disabled:bg-gray-900"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(event) =>
                      setRemember(event.target.checked)
                    }
                    disabled={loading}
                    className="h-4 w-4 rounded border-gray-300 text-red-700 accent-red-700 focus:ring-red-600"
                  />

                  <label
                    htmlFor="remember"
                    className="ml-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-red-700 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200 active:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
                <p className="text-center text-xs text-gray-400">
                  VIOLA • An Intelligent Student Violation Monitoring
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}