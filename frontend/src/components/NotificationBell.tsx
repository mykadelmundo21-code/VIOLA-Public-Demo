import { useEffect, useRef, useState } from "react";

import { echo } from "../lib/echo";

type NotificationType = "violation" | "assessment" | "intervention" | "system";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  read: boolean;
};

type RealtimeNotification = {
  id?: string;
  title?: string;
  message?: string;
  time?: string;
  type?: NotificationType;
  violationId?: number | null;
  status?: string | null;
  read_at?: string | null;
};

type NotificationApiItem = {
  id?: string | number;
  title?: string;
  message?: string;
  time?: string;
  created_at?: string;
  type?: NotificationType;
  violationId?: number | null;
  violation_id?: number | null;
  status?: string | null;
  read_at?: string | null;
  read?: boolean;
};

type NotificationApiResponse = {
  notifications?: NotificationApiItem[];
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") || sessionStorage.getItem("viola_token")
  );
}

function getCurrentUserId(): number | null {
  try {
    const storedUser =
      localStorage.getItem("viola_user") ||
      sessionStorage.getItem("viola_user");

    if (!storedUser) {
      return null;
    }

    const user = JSON.parse(storedUser);

    if (user?.id === undefined || user?.id === null) {
      return null;
    }

    const userId = Number(user.id);

    if (!Number.isFinite(userId)) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

function getSettings() {
  return {
    enabled: localStorage.getItem("viola_notifications_enabled") !== "false",

    caseUpdates: localStorage.getItem("viola_case_updates") !== "false",

    systemNotifications:
      localStorage.getItem("viola_system_notifications") !== "false",
  };
}

function getTimeAgo(value: unknown): string {
  if (!value) {
    return "Recently";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const difference = Math.max(0, Date.now() - date.getTime()) / 1000;

  if (difference < 60) {
    return "Just now";
  }

  if (difference < 3600) {
    const minutes = Math.floor(difference / 60);

    return `${minutes} min ago`;
  }

  if (difference < 86400) {
    const hours = Math.floor(difference / 3600);

    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(difference / 86400);

  if (days < 7) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
}

function normalizeNotification(
  notification: NotificationApiItem,
  index: number,
): Notification {
  return {
    id: String(notification.id ?? `notification-${index}`),

    title: notification.title ?? "Notification",

    message: notification.message ?? "",

    time: getTimeAgo(notification.time ?? notification.created_at),

    type: notification.type ?? "system",

    read: Boolean(notification.read_at) || notification.read === true,
  };
}

function getIcon(type: NotificationType): string {
  switch (type) {
    case "violation":
      return "!";

    case "assessment":
      return "✓";

    case "intervention":
      return "↗";

    default:
      return "i";
  }
}

function getIconStyle(type: NotificationType): string {
  switch (type) {
    case "violation":
      return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400";

    case "assessment":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";

    case "intervention":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState(getSettings);

  const notificationRef = useRef<HTMLDivElement>(null);

  /*
   * Update notification settings.
   */
  useEffect(() => {
    const updateSettings = () => {
      const newSettings = getSettings();

      setSettings(newSettings);

      if (!newSettings.enabled) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "viola-notification-settings-changed",
      updateSettings,
    );

    return () => {
      window.removeEventListener(
        "viola-notification-settings-changed",
        updateSettings,
      );
    };
  }, []);

  /*
   * Load notifications from Laravel API.
   */
  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      const token = getAuthToken();

      if (!token) {
        if (!cancelled) {
          setNotifications([]);
          setLoading(false);
        }

        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          method: "GET",

          headers: {
            Accept: "application/json",

            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load notifications.");
        }

        const result: NotificationApiResponse = await response.json();

        if (cancelled) {
          return;
        }

        const serverNotifications = Array.isArray(result.notifications)
          ? result.notifications
          : [];

        const generated = serverNotifications.map((notification, index) =>
          normalizeNotification(notification, index),
        );

        setNotifications(generated.slice(0, 20));
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Listen for realtime Laravel Reverb notifications.
   */
  useEffect(() => {
    const token = getAuthToken();

    const userId = getCurrentUserId();

    if (!echo || !token || !userId) {
      return;
    }

    const channelName = `App.Models.User.${userId}`;

    const channel = echo.private(channelName);

    const handleNotification = (payload: RealtimeNotification) => {
      if (!payload || !payload.title || !payload.message) {
        return;
      }

      const notificationId = String(
        payload.id ?? `realtime-${Date.now()}-${Math.random()}`,
      );

      const newNotification: Notification = {
        id: notificationId,

        title: payload.title,

        message: payload.message,

        time: getTimeAgo(payload.time),

        type: payload.type ?? "system",

        read: false,
      };

      setNotifications((current) => {
        const exists = current.some(
          (notification) => notification.id === notificationId,
        );

        if (exists) {
          return current;
        }

        return [newNotification, ...current].slice(0, 20);
      });
    };

    channel.listen(".notification", handleNotification);

    return () => {
      echo?.leave(channelName);
    };
  }, []);

  /*
   * Close dropdown when clicking outside.
   */
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  /*
   * Close dropdown with Escape.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const visibleNotifications = notifications.filter((notification) => {
    if (!settings.enabled) {
      return false;
    }

    if (notification.type === "system") {
      return settings.systemNotifications;
    }

    return settings.caseUpdates;
  });

  const unreadCount = visibleNotifications.filter(
    (notification) => !notification.read,
  ).length;

  const markAsRead = async (id: string) => {
    const token = getAuthToken();

    if (!token) {
      return;
    }

    const previous = notifications;

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? {
              ...notification,
              read: true,
            }
          : notification,
      ),
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${encodeURIComponent(id)}/read`,
        {
          method: "PUT",

          headers: {
            Accept: "application/json",

            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to mark notification as read.");
      }
    } catch {
      setNotifications(previous);
    }
  };

  const markAllAsRead = async () => {
    const token = getAuthToken();

    if (!token) {
      return;
    }

    const previous = notifications;

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      })),
    );

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PUT",

        headers: {
          Accept: "application/json",

          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark notifications as read.");
      }
    } catch {
      setNotifications(previous);
    }
  };

  const handleToggle = () => {
    if (!settings.enabled) {
      return;
    }

    setIsOpen((current) => !current);
  };

  return (
    <div ref={notificationRef} className="relative flex shrink-0">
      {/* Bell */}
      <button
        type="button"
        disabled={!settings.enabled}
        onClick={handleToggle}
        aria-label={
          settings.enabled ? "Notifications" : "Notifications disabled"
        }
        aria-expanded={isOpen}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${
          settings.enabled
            ? "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0M18.75 10.5c0 1.577.324 3.13.948 4.577.287.665-.16 1.423-.884 1.505a48.11 48.11 0 0 1-13.628 0c-.724-.082-1.171-.84-.884-1.505A11.25 11.25 0 0 0 5.25 10.5a6.75 6.75 0 1 1 13.5 0Z"
          />
        </svg>

        {settings.enabled && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile overlay */}
      {isOpen && settings.enabled && (
        <div
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Notification panel */}
      {isOpen && settings.enabled && (
        <div
          className="
              fixed
              left-2
              right-2
              top-[72px]
              z-50
              overflow-hidden
              rounded-xl
              border
              border-gray-200
              bg-white
              shadow-2xl
              dark:border-gray-700
              dark:bg-gray-900

              sm:absolute
              sm:left-auto
              sm:right-0
              sm:top-auto
              sm:mt-3
              sm:w-[360px]
            "
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-5">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Notifications
              </h3>

              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {loading
                  ? "Loading notifications..."
                  : unreadCount > 0
                    ? `${unreadCount} unread notification${
                        unreadCount > 1 ? "s" : ""
                      }`
                    : "You're all caught up"}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="shrink-0 whitespace-nowrap text-xs font-semibold text-red-700 transition hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[calc(100vh-170px)] overflow-y-auto overscroll-contain sm:max-h-[420px]">
            {loading ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-red-700 dark:border-gray-700 dark:border-t-red-500" />

                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Loading...
                </p>
              </div>
            ) : visibleNotifications.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                  ✓
                </div>

                <p className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">
                  No notifications
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  You're all caught up.
                </p>
              </div>
            ) : (
              visibleNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                  className={`flex w-full gap-3 border-b border-gray-100 px-4 py-4 text-left transition dark:border-gray-800 sm:px-5 ${
                    !notification.read
                      ? "bg-red-50/40 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                      : "bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${getIconStyle(
                      notification.type,
                    )}`}
                  >
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`min-w-0 break-words text-sm ${
                          !notification.read
                            ? "font-bold text-gray-900 dark:text-white"
                            : "font-medium text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {notification.title}
                      </p>

                      {!notification.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                      )}
                    </div>

                    <p className="mt-1 break-words text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {notification.message}
                    </p>

                    <p className="mt-2 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      {notification.time}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 text-center dark:border-gray-700 dark:bg-gray-800 sm:px-5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="py-1 text-xs font-semibold text-gray-600 transition hover:text-red-700 dark:text-gray-300 dark:hover:text-red-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
