import { useEffect, useMemo, useState } from "react";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

type MenuItem = {
  label: string;
  icon: string;
  path: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  [key: string]: any;
};

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

const guidanceMenu: MenuItem[] = [
  {
    label: "Dashboard",
    icon: "⌂",
    path: "/guidance",
  },
  {
    label: "Students",
    icon: "◉",
    path: "/guidance/students",
  },
  {
    label: "Violations",
    icon: "!",
    path: "/guidance/violations",
  },
  {
    label: "Assessments",
    icon: "✓",
    path: "/guidance/assessments",
  },
  {
    label: "Interventions",
    icon: "↗",
    path: "/guidance/interventions",
  },
  {
    label: "Archive History",
    icon: "▣",
    path: "/guidance/archive",
  },
  {
    label: "Reports",
    icon: "▤",
    path: "/guidance/reports",
  },
  {
    label: "Account Management",
    icon: "♙",
    path: "/guidance/accounts",
  },
];

const teacherMenu: MenuItem[] = [
  {
    label: "Dashboard",
    icon: "⌂",
    path: "/teacher",
  },
  {
    label: "Students",
    icon: "◉",
    path: "/teacher/students",
  },
  {
    label: "Violations",
    icon: "!",
    path: "/teacher/violations",
  },
];

const parentMenu: MenuItem[] = [
  {
    label: "Dashboard",
    icon: "⌂",
    path: "/parent",
  },
  {
    label: "My Student",
    icon: "◉",
    path: "/parent/student",
  },
  {
    label: "Violations",
    icon: "!",
    path: "/parent/violations",
  },
];

function getAuthToken(): string | null {
  return (
    localStorage.getItem("viola_token") ||
    sessionStorage.getItem("viola_token")
  );
}

function getStoredUser(): User | null {
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

function clearAuthStorage() {
  localStorage.removeItem("viola_token");
  localStorage.removeItem("viola_user");
  localStorage.removeItem("viola_portal");

  sessionStorage.removeItem("viola_token");
  sessionStorage.removeItem("viola_user");
  sessionStorage.removeItem("viola_portal");
}

function getHomePath(role: string) {
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

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [user, setUser] =
    useState<User | null>(
      getStoredUser(),
    );

  useEffect(() => {
    const handleAuthChanged = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<User>;

      if (customEvent.detail) {
        setUser(customEvent.detail);
      } else {
        setUser(getStoredUser());
      }
    };

    const handleStorageChanged = () => {
      setUser(getStoredUser());
    };

    window.addEventListener(
      "viola-auth-changed",
      handleAuthChanged,
    );

    window.addEventListener(
      "storage",
      handleStorageChanged,
    );

    return () => {
      window.removeEventListener(
        "viola-auth-changed",
        handleAuthChanged,
      );

      window.removeEventListener(
        "storage",
        handleStorageChanged,
      );
    };
  }, []);

  const currentPortal =
    user?.role?.toLowerCase() || "";

  const menuItems = useMemo(() => {
    if (currentPortal === "guidance") {
      return guidanceMenu;
    }

    if (currentPortal === "teacher") {
      return teacherMenu;
    }

    if (currentPortal === "parent") {
      return parentMenu;
    }

    return [];
  }, [currentPortal]);

  useEffect(() => {
    const expectedPrefix =
      currentPortal === "guidance"
        ? "/guidance"
        : currentPortal === "teacher"
          ? "/teacher"
          : currentPortal === "parent"
            ? "/parent"
            : "";

    if (
      expectedPrefix &&
      !location.pathname.startsWith(
        expectedPrefix,
      ) &&
      !location.pathname.startsWith(
        "/settings",
      )
    ) {
      navigate(
        getHomePath(currentPortal),
        {
          replace: true,
        },
      );
    }
  }, [
    currentPortal,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    onClose();
  }, [
    location.pathname,
    onClose,
  ]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    const token =
      getAuthToken();

    try {
      if (token) {
        await fetch(
          `${API_BASE_URL}/logout`,
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
      }
    } catch {
    } finally {
      clearAuthStorage();

      setUser(null);

      window.dispatchEvent(
        new CustomEvent(
          "viola-auth-changed",
          {
            detail: null,
          },
        ),
      );

      onClose();

      navigate("/login", {
        replace: true,
      });

      setLoggingOut(false);
    }
  };

  const navigationContent = (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Main Menu
        </p>

        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end
            className={({ isActive }) =>
              `flex items-center rounded-lg px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-red-700 text-white shadow-sm"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white dark:text-gray-400"
              }`
            }
          >
            <span className="flex w-7 justify-center text-base">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-3">
        <NavLink
          to="/settings"
          end
          className={({ isActive }) =>
            `flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium transition ${
              isActive
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`
          }
        >
          <span className="mr-3">
            ⚙
          </span>

          Settings
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-1 flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium text-gray-300 transition hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="mr-3">
            ↪
          </span>

          {loggingOut
            ? "Logging out..."
            : "Logout"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-700 bg-gray-800 text-white lg:flex lg:flex-col dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-20 shrink-0 items-center border-b border-gray-700 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700 font-bold">
            V
          </div>

          <div className="ml-3">
            <h1 className="font-bold tracking-wide">
              VIOLA
            </h1>

            <p className="text-[10px] text-gray-400">
              Monitoring & Intervention
            </p>
          </div>
        </div>

        {navigationContent}
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-gray-700 bg-gray-800 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-gray-700 px-5">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700 font-bold">
              V
            </div>

            <div className="ml-3">
              <h1 className="font-bold tracking-wide">
                VIOLA
              </h1>

              <p className="text-[10px] text-gray-400">
                Monitoring & Intervention
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-300 transition hover:bg-gray-700 hover:text-white"
          >
            ×
          </button>
        </div>

        {navigationContent}
      </aside>
    </>
  );
}