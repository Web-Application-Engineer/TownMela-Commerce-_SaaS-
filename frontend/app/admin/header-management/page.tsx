import HeaderManagementHeader from "./components/HeaderManagementHeader";
import HeaderManagementClient from "./components/HeaderManagementClient";

/* =========================================================
   HEADER MANAGEMENT PAGE
========================================================= */

export default function HeaderManagementPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px]">
        <HeaderManagementHeader />

        <HeaderManagementClient />
      </div>
    </main>
  );
}