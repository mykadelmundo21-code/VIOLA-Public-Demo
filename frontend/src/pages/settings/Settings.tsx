import { useEffect, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  contact: string;
  role: string;
  photo: string | null;
  dark_mode: boolean;
  notifications_enabled: boolean;
  case_updates: boolean;
  system_notifications: boolean;
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

function getRoleName(role: string): string {
  switch (role) {
    case "guidance":
      return "Guidance Administrator";

    case "teacher":
      return "Teacher / Faculty";

    case "parent":
      return "Parent / Guardian";

    default:
      return role;
  }
}

function normalizePhotoUrl(
  photo: string | null,
): string | null {
  if (!photo) {
    return null;
  }

  if (
    photo.startsWith("http://") ||
    photo.startsWith("https://")
  ) {
    return photo;
  }

  const backendUrl =
    API_BASE_URL.replace(/\/api\/?$/, "");

  if (photo.startsWith("/")) {
    return `${backendUrl}${photo}`;
  }

  if (photo.startsWith("storage/")) {
    return `${backendUrl}/${photo}`;
  }

  return `${backendUrl}/storage/${photo}`;
}

function notifyProfileUpdated(
  profile: UserProfile,
) {
  window.dispatchEvent(
    new CustomEvent(
      "viola-profile-updated",
      {
        detail: profile,
      },
    ),
  );
}

export default function Settings() {
  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [savingPreferences, setSavingPreferences] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState("");

  const [darkMode, setDarkMode] =
    useState(false);

  const [
    notificationsEnabled,
    setNotificationsEnabled,
  ] = useState(true);

  const [caseUpdates, setCaseUpdates] =
    useState(true);

  const [
    systemNotifications,
    setSystemNotifications,
  ] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getAuthToken();

      if (!token) {
        setError(
          "No authentication token found. Please log in again.",
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/settings/profile`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load profile.",
          );
        }

        const user =
          data.user;

        const loadedProfile: UserProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          contact:
            user.contact || "",
          role: user.role,
          photo:
            normalizePhotoUrl(
              user.photo,
            ),
          dark_mode:
            Boolean(user.dark_mode),
          notifications_enabled:
            Boolean(
              user.notifications_enabled,
            ),
          case_updates:
            Boolean(user.case_updates),
          system_notifications:
            Boolean(
              user.system_notifications,
            ),
        };

        setProfile(
          loadedProfile,
        );

        setDarkMode(
          loadedProfile.dark_mode,
        );

        setNotificationsEnabled(
          loadedProfile.notifications_enabled,
        );

        setCaseUpdates(
          loadedProfile.case_updates,
        );

        setSystemNotifications(
          loadedProfile.system_notifications,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load profile.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (darkMode) {
      document.documentElement.classList.add(
        "dark",
      );
    } else {
      document.documentElement.classList.remove(
        "dark",
      );
    }
  }, [darkMode, loading]);

  const handleProfileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (!profile) {
      return;
    }

    const {
      name,
      value,
    } = event.target;

    setProfile((current) =>
      current
        ? {
            ...current,
            [name]: value,
          }
        : current,
    );

    setSaved(false);
    setError("");
  };

  const handlePhotoChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file.",
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Profile picture must not exceed 5MB.",
      );
      event.target.value = "";
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setError(
        "Your session has expired. Please log in again.",
      );
      event.target.value = "";
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "photo",
      file,
    );

    setUploadingPhoto(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/profile/photo`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to upload profile picture.",
        );
      }

      const updatedUser =
        data.user;

      const updatedProfile: UserProfile = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        contact:
          updatedUser.contact || "",
        role: updatedUser.role,
        photo:
          normalizePhotoUrl(
            updatedUser.photo,
          ),
        dark_mode:
          Boolean(
            updatedUser.dark_mode,
          ),
        notifications_enabled:
          Boolean(
            updatedUser.notifications_enabled,
          ),
        case_updates:
          Boolean(
            updatedUser.case_updates,
          ),
        system_notifications:
          Boolean(
            updatedUser.system_notifications,
          ),
      };

      setProfile(
        updatedProfile,
      );

      notifyProfileUpdated(
        updatedProfile,
      );

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload profile picture.",
      );
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/profile`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: profile.name,
            email: profile.email,
            contact:
              profile.contact,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to save profile.",
        );
      }

      const updatedUser =
        data.user;

      const updatedProfile: UserProfile = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        contact:
          updatedUser.contact || "",
        role: updatedUser.role,
        photo:
          normalizePhotoUrl(
            updatedUser.photo,
          ),
        dark_mode:
          Boolean(
            updatedUser.dark_mode,
          ),
        notifications_enabled:
          Boolean(
            updatedUser.notifications_enabled,
          ),
        case_updates:
          Boolean(
            updatedUser.case_updates,
          ),
        system_notifications:
          Boolean(
            updatedUser.system_notifications,
          ),
      };

      setProfile(
        updatedProfile,
      );

      notifyProfileUpdated(
        updatedProfile,
      );

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (
    values: {
      dark_mode: boolean;
      notifications_enabled: boolean;
      case_updates: boolean;
      system_notifications: boolean;
    },
  ) => {
    const token = getAuthToken();

    if (!token) {
      setError(
        "Your session has expired. Please log in again.",
      );
      return;
    }

    setSavingPreferences(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/settings/preferences`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(values),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to save preferences.",
        );
      }

      const updatedUser =
        data.user;

      setDarkMode(
        Boolean(
          updatedUser.dark_mode,
        ),
      );

      setNotificationsEnabled(
        Boolean(
          updatedUser.notifications_enabled,
        ),
      );

      setCaseUpdates(
        Boolean(
          updatedUser.case_updates,
        ),
      );

      setSystemNotifications(
        Boolean(
          updatedUser.system_notifications,
        ),
      );

      setProfile((current) =>
        current
          ? {
              ...current,
              dark_mode:
                Boolean(
                  updatedUser.dark_mode,
                ),
              notifications_enabled:
                Boolean(
                  updatedUser.notifications_enabled,
                ),
              case_updates:
                Boolean(
                  updatedUser.case_updates,
                ),
              system_notifications:
                Boolean(
                  updatedUser.system_notifications,
                ),
            }
          : current,
      );

      window.dispatchEvent(
        new CustomEvent(
          "viola-preferences-updated",
          {
            detail: {
              dark_mode:
                Boolean(
                  updatedUser.dark_mode,
                ),
              notifications_enabled:
                Boolean(
                  updatedUser.notifications_enabled,
                ),
              case_updates:
                Boolean(
                  updatedUser.case_updates,
                ),
              system_notifications:
                Boolean(
                  updatedUser.system_notifications,
                ),
            },
          },
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save preferences.",
      );
    } finally {
      setSavingPreferences(false);
    }
  };

  const toggleDarkMode = async () => {
    const value = !darkMode;

    setDarkMode(value);

    await savePreferences({
      dark_mode: value,
      notifications_enabled:
        notificationsEnabled,
      case_updates:
        caseUpdates,
      system_notifications:
        systemNotifications,
    });
  };

  const toggleNotifications = async () => {
    const value =
      !notificationsEnabled;

    setNotificationsEnabled(
      value,
    );

    await savePreferences({
      dark_mode: darkMode,
      notifications_enabled:
        value,
      case_updates:
        value
          ? caseUpdates
          : false,
      system_notifications:
        value
          ? systemNotifications
          : false,
    });
  };

  const toggleCaseUpdates = async () => {
    if (!notificationsEnabled) {
      return;
    }

    const value = !caseUpdates;

    setCaseUpdates(value);

    await savePreferences({
      dark_mode: darkMode,
      notifications_enabled:
        notificationsEnabled,
      case_updates: value,
      system_notifications:
        systemNotifications,
    });
  };

  const toggleSystemNotifications =
    async () => {
      if (!notificationsEnabled) {
        return;
      }

      const value =
        !systemNotifications;

      setSystemNotifications(
        value,
      );

      await savePreferences({
        dark_mode: darkMode,
        notifications_enabled:
          notificationsEnabled,
        case_updates:
          caseUpdates,
        system_notifications:
          value,
      });
    };

  const initials =
    profile?.name
      ?.trim()
      .split(/\s+/)
      .map(
        (part) =>
          part.charAt(0),
      )
      .slice(0, 2)
      .join("")
      .toUpperCase() || "V";

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-gray-500">
          Loading settings...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-bold">
            Unable to load settings
          </p>

          <p className="mt-1 text-sm">
            {error ||
              "Unable to load your account information."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <div>
        <p className="text-sm font-medium text-red-700 dark:text-red-400">
          Account Settings
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white md:text-3xl">
          Settings
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Manage your profile, appearance, and notification preferences.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Profile Information
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Update the information connected to your VIOLA account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt="Profile"
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-gray-100 dark:ring-gray-700"
                onError={() => {
                  setError(
                    "Profile picture could not be displayed.",
                  );
                }}
              />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xl font-bold text-white dark:bg-gray-200 dark:text-gray-900">
                {initials}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Profile Picture
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG, or WebP. Maximum file size is 5MB.
              </p>

              <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                {uploadingPhoto
                  ? "Uploading..."
                  : "Change Picture"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={
                    handlePhotoChange
                  }
                  disabled={
                    uploadingPhoto
                  }
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Full Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              value={profile.name}
              onChange={
                handleProfileChange
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

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
              value={profile.email}
              onChange={
                handleProfileChange
              }
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="contact"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Contact Number
            </label>

            <input
              id="contact"
              name="contact"
              type="tel"
              value={profile.contact}
              onChange={
                handleProfileChange
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Account Type
            </label>

            <input
              id="role"
              type="text"
              value={getRoleName(
                profile.role,
              )}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-end dark:border-gray-700">
            {saved && (
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Changes saved successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Appearance
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Customize how VIOLA looks on your device.
          </p>
        </div>

        <div className="flex items-center justify-between gap-5 p-6">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Dark Mode
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Use a darker interface for comfortable viewing.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            disabled={
              savingPreferences
            }
            className={`relative h-7 w-12 shrink-0 rounded-full ${
              darkMode
                ? "bg-red-700"
                : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${
                darkMode
                  ? "left-6"
                  : "left-1"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white">
            Notifications
          </h2>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Manage your VIOLA notification preferences.
          </p>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          <div className="flex items-center justify-between gap-5 p-6">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Enable Notifications
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Receive notifications from VIOLA.
              </p>
            </div>

            <button
              type="button"
              onClick={
                toggleNotifications
              }
              disabled={
                savingPreferences
              }
              className={`relative h-7 w-12 shrink-0 rounded-full ${
                notificationsEnabled
                  ? "bg-red-700"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${
                  notificationsEnabled
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>

          <div
            className={`flex items-center justify-between gap-5 p-6 ${
              !notificationsEnabled
                ? "opacity-50"
                : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Case Updates
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Receive updates regarding student cases.
              </p>
            </div>

            <button
              type="button"
              disabled={
                !notificationsEnabled ||
                savingPreferences
              }
              onClick={
                toggleCaseUpdates
              }
              className={`relative h-7 w-12 shrink-0 rounded-full ${
                caseUpdates
                  ? "bg-red-700"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${
                  caseUpdates
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>

          <div
            className={`flex items-center justify-between gap-5 p-6 ${
              !notificationsEnabled
                ? "opacity-50"
                : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                System Notifications
              </p>

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Receive important system announcements.
              </p>
            </div>

            <button
              type="button"
              disabled={
                !notificationsEnabled ||
                savingPreferences
              }
              onClick={
                toggleSystemNotifications
              }
              className={`relative h-7 w-12 shrink-0 rounded-full ${
                systemNotifications
                  ? "bg-red-700"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${
                  systemNotifications
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}