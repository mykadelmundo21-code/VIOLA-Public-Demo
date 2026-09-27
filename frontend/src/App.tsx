import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  useEffect,
  useState,
} from "react";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import ChangePassword from "./pages/auth/ChangePassword";

import GuidanceDashboard from "./pages/guidance/GuidanceDashboard";
import GuidanceStudents from "./pages/guidance/GuidanceStudents";
import GuidanceViolations from "./pages/guidance/GuidanceViolations";
import GuidanceAssessments from "./pages/guidance/GuidanceAssessments";
import GuidanceInterventions from "./pages/guidance/GuidanceInterventions";
import GuidanceArchive from "./pages/guidance/GuidanceArchive";
import GuidanceReports from "./pages/guidance/GuidanceReports";
import GuidanceAccounts from "./pages/guidance/GuidanceAccounts";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherViolations from "./pages/teacher/TeacherViolations";
import TeacherViolationHistory from "./pages/teacher/TeacherViolationHistory";

import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentStudent from "./pages/parent/ParentStudent";
import ParentViolations from "./pages/parent/ParentViolations";

import Settings from "./pages/settings/Settings";

import DashboardLayout from "./layouts/DashboardLayout";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000/api";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  dark_mode?: boolean;
  must_change_password?: boolean;
  [key: string]: any;
};

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

function setDarkMode(enabled: boolean) {
  if (enabled) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
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

function isAllowedPath(
  pathname: string,
  role: string,
): boolean {
  const normalizedRole =
    role.toLowerCase();

  if (
    pathname === "/settings" ||
    pathname.startsWith("/settings")
  ) {
    return true;
  }

  if (normalizedRole === "guidance") {
    return pathname.startsWith("/guidance");
  }

  if (normalizedRole === "teacher") {
    return pathname.startsWith("/teacher");
  }

  if (normalizedRole === "parent") {
    return pathname.startsWith("/parent");
  }

  return false;
}

function RoleProtectedRoute({
  children,
  allowedRole,
}: {
  children: React.ReactNode;
  allowedRole: string;
}) {
  const location = useLocation();

  const token = getAuthToken();
  const user = getStoredUser();

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  const role =
    user.role?.toLowerCase();

  if (role !== allowedRole) {
    return (
      <Navigate
        to={getRoleHome(role || "")}
        replace
      />
    );
  }

  return children;
}

function DashboardAccessGuard() {
  const location = useLocation();

  const token = getAuthToken();
  const user = getStoredUser();

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const role =
    user.role?.toLowerCase();

  if (
    !isAllowedPath(
      location.pathname,
      role || "",
    )
  ) {
    return (
      <Navigate
        to={getRoleHome(role || "")}
        replace
      />
    );
  }

  return <DashboardLayout />;
}

function AuthInitializer() {
  const location = useLocation();

  const [checkedToken, setCheckedToken] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    const initializeUser =
      async () => {
        const token =
          getAuthToken();

        if (!token) {
          setDarkMode(false);

          if (!cancelled) {
            setCheckedToken(true);
          }

          return;
        }

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/me`,
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

          if (!response.ok) {
            clearAuthStorage();
            setDarkMode(false);

            if (!cancelled) {
              setCheckedToken(true);
            }

            return;
          }

          const data =
            await response.json();

          const user =
            data.user;

          if (!user) {
            clearAuthStorage();
            setDarkMode(false);

            if (!cancelled) {
              setCheckedToken(true);
            }

            return;
          }

          const role =
            String(user.role || "")
              .toLowerCase();

          const storage =
            localStorage.getItem(
              "viola_token",
            )
              ? localStorage
              : sessionStorage;

          storage.setItem(
            "viola_user",
            JSON.stringify(user),
          );

          storage.setItem(
            "viola_portal",
            role,
          );

          setDarkMode(
            Boolean(user.dark_mode),
          );

          window.dispatchEvent(
            new CustomEvent(
              "viola-auth-changed",
              {
                detail: user,
              },
            ),
          );

          window.dispatchEvent(
            new CustomEvent(
              "viola-preferences-loaded",
              {
                detail: user,
              },
            ),
          );

          window.dispatchEvent(
            new CustomEvent(
              "viola-profile-updated",
              {
                detail: user,
              },
            ),
          );
        } catch {
          setDarkMode(false);
        } finally {
          if (!cancelled) {
            setCheckedToken(true);
          }
        }
      };

    initializeUser();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleAuthChanged = (
      event: Event,
    ) => {
      const customEvent =
        event as CustomEvent<User>;

      const user =
        customEvent.detail;

      if (!user) {
        return;
      }

      setDarkMode(
        Boolean(user.dark_mode),
      );
    };

    window.addEventListener(
      "viola-auth-changed",
      handleAuthChanged,
    );

    return () => {
      window.removeEventListener(
        "viola-auth-changed",
        handleAuthChanged,
      );
    };
  }, []);

  if (!checkedToken) {
    return null;
  }

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />

      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/forgot-password"
          element={
            <ForgotPassword />
          }
        />

        <Route
          path="/reset-password"
          element={
            <ResetPassword />
          }
        />

        <Route
          path="/change-password"
          element={
            <ChangePassword />
          }
        />

        <Route
          element={
            <DashboardAccessGuard />
          }
        >
          {/* Guidance */}

          <Route
            path="/guidance"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceDashboard />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/guidance/students"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceStudents />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/guidance/violations"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceViolations />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/guidance/assessments"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceAssessments />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/guidance/interventions"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceInterventions />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/guidance/archive"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceArchive />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/guidance/reports"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceReports />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/guidance/accounts"
            element={
              <RoleProtectedRoute allowedRole="guidance">
                <GuidanceAccounts />
              </RoleProtectedRoute>
            }
          />

          {/* Teacher */}

          <Route
            path="/teacher"
            element={
              <RoleProtectedRoute allowedRole="teacher">
                <TeacherDashboard />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/teacher/students"
            element={
              <RoleProtectedRoute allowedRole="teacher">
                <TeacherStudents />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/teacher/violations"
            element={
              <RoleProtectedRoute allowedRole="teacher">
                <TeacherViolations />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/teacher/violation-history"
            element={
              <RoleProtectedRoute allowedRole="teacher">
                <TeacherViolationHistory />
              </RoleProtectedRoute>
            }
          />

          {/* Parent */}

          <Route
            path="/parent"
            element={
              <RoleProtectedRoute allowedRole="parent">
                <ParentDashboard />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/parent/student"
            element={
              <RoleProtectedRoute allowedRole="parent">
                <ParentStudent />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/parent/violations"
            element={
              <RoleProtectedRoute allowedRole="parent">
                <ParentViolations />
              </RoleProtectedRoute>
            }
          />

          {/* Settings */}

          <Route
            path="/settings"
            element={<Settings />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;