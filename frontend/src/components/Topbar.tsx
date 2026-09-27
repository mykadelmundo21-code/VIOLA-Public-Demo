import {
  useEffect,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";

type TopbarProps = {
  onMenuClick: () => void;
};

type UserProfile = {
  id: number;
  name: string;
  email: string;
  contact: string;
  role: string;
  photo: string | null;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

const pageTitles: Record<string, string> = {
  "/guidance":
    "Dashboard",

  "/guidance/students":
    "Students",

  "/guidance/violations":
    "Violations",

  "/guidance/assessments":
    "Assessments",

  "/guidance/interventions":
    "Interventions",

  "/guidance/archive":
    "Archive History",

  "/guidance/reports":
    "Reports",

  "/guidance/accounts":
    "Account Management",

  "/teacher":
    "Dashboard",

  "/teacher/students":
    "Students",

  "/teacher/violations":
    "Report Violation",

  "/parent":
    "Dashboard",

  "/parent/student":
    "My Student",

  "/parent/violations":
    "Violations",

  "/settings":
    "Settings",
};

function getAuthToken(): string | null {
  return (
    localStorage.getItem(
      "viola_token",
    ) ||
    sessionStorage.getItem(
      "viola_token",
    )
  );
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
    API_BASE_URL.replace(
      /\/api\/?$/,
      "",
    );

  if (photo.startsWith("/")) {
    return `${backendUrl}${photo}`;
  }

  if (photo.startsWith("storage/")) {
    return `${backendUrl}/${photo}`;
  }

  return `${backendUrl}/storage/${photo}`;
}

function getRoleName(
  role: string,
): string {
  switch (role) {
    case "guidance":
      return "Administrator";

    case "teacher":
      return "Faculty";

    case "parent":
      return "Guardian";

    default:
      return role;
  }
}

export default function Topbar({
  onMenuClick,
}: TopbarProps) {
  const location =
    useLocation();

  const path =
    location.pathname;

  const [
    profile,
    setProfile,
  ] =
    useState<UserProfile | null>(
      null,
    );

  const isGuidance =
    path.startsWith(
      "/guidance",
    );

  const isTeacher =
    path.startsWith(
      "/teacher",
    );

  const isParent =
    path.startsWith(
      "/parent",
    );

  useEffect(() => {
    const fetchProfile =
      async () => {
        const token =
          getAuthToken();

        if (!token) {
          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/settings/profile`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                  Authorization: `Bearer ${token}`,
                },
              },
            );

          if (!response.ok) {
            return;
          }

          const data =
            await response.json();

          if (!data.user) {
            return;
          }

          setProfile({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            contact:
              data.user.contact ||
              "",
            role: data.user.role,
            photo:
              normalizePhotoUrl(
                data.user.photo,
              ),
          });
        } catch {
          return;
        }
      };

    fetchProfile();
  }, [path]);

  useEffect(() => {
    const handleProfileUpdate =
      (event: Event) => {
        const customEvent =
          event as CustomEvent<UserProfile>;

        if (!customEvent.detail) {
          return;
        }

        setProfile({
          ...customEvent.detail,
          photo:
            normalizePhotoUrl(
              customEvent.detail.photo,
            ),
        });
      };

    window.addEventListener(
      "viola-profile-updated",
      handleProfileUpdate,
    );

    return () => {
      window.removeEventListener(
        "viola-profile-updated",
        handleProfileUpdate,
      );
    };
  }, []);

  let portal = "";
  let fallbackName = "";
  let fallbackRole = "";
  let fallbackInitials = "";

  if (isGuidance) {
    portal =
      "Guidance Portal";

    fallbackName =
      "Guidance";

    fallbackRole =
      "Administrator";

    fallbackInitials =
      "G";
  } else if (isTeacher) {
    portal =
      "Teacher Portal";

    fallbackName =
      "Teacher";

    fallbackRole =
      "Faculty";

    fallbackInitials =
      "T";
  } else if (isParent) {
    portal =
      "Parent Portal";

    fallbackName =
      "Parent";

    fallbackRole =
      "Guardian";

    fallbackInitials =
      "P";
  } else {
    portal =
      "VIOLA Portal";

    fallbackName =
      "VIOLA User";

    fallbackRole = "";

    fallbackInitials =
      "V";
  }

  const userName =
    profile?.name ||
    fallbackName;

  const role =
    profile?.role
      ? getRoleName(
          profile.role,
        )
      : fallbackRole;

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
      .toUpperCase() ||
    fallbackInitials;

  const pageTitle =
    pageTitles[path] ||
    "Overview";

  return (
    <header className="sticky top-0 z-30 flex min-h-20 w-full items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 sm:px-5 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3">

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-expanded="false"
          className="relative z-50 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-xl text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 lg:hidden"
        >
          <span className="pointer-events-none leading-none">
            ☰
          </span>
        </button>

        <div className="min-w-0">

          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-gray-400 sm:text-xs">
            {portal}
          </p>

          <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg dark:text-white">
            {pageTitle}
          </h2>

        </div>
      </div>

      <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-4">

        <NotificationBell />

        <div className="hidden h-8 w-px bg-gray-200 sm:block dark:bg-gray-700" />

        <div className="flex items-center gap-2 sm:gap-3">

          {profile?.photo ? (
            <img
              src={profile.photo}
              alt={userName}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-gray-100 sm:h-10 sm:w-10 dark:ring-gray-700"
              onError={() => {
                setProfile(
                  (current) =>
                    current
                      ? {
                          ...current,
                          photo: null,
                        }
                      : current,
                );
              }}
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-white sm:h-10 sm:w-10 dark:bg-gray-200 dark:text-gray-900">
              {initials}
            </div>
          )}

          <div className="hidden min-w-0 sm:block">

            <p className="max-w-[160px] truncate text-sm font-semibold text-gray-900 dark:text-white">
              {userName}
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {role}
            </p>

          </div>
        </div>
      </div>
    </header>
  );
}