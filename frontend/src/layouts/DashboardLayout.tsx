import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function DashboardLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const openMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={closeMobileSidebar}
      />

      {/* Main Application */}
      <div className="min-h-screen lg:pl-64">
        {/* Topbar */}
        <Topbar onMenuClick={openMobileSidebar} />

        {/* Page Content */}
        <main className="w-full px-4 py-5 sm:px-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}