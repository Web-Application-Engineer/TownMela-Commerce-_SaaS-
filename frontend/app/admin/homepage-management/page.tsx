import HomepageHeader from "./components/HomepageHeader";
import HomepageManagementClient from "./components/HomepageManagementClient";
import SaveSettingsCard from "./components/SaveSettingsCard";

/* =========================================================
   HOMEPAGE MANAGEMENT PAGE
========================================================= */

export default function HomepageManagementPage() {
  return (
    <main className="min-h-screen bg-[#F6F7F9]">
      <div className="mx-auto w-full max-w-[1450px] space-y-6 px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <HomepageHeader />

        {/* =================================================
            CLIENT-SIDE HOMEPAGE MANAGEMENT
        ================================================= */}

        <HomepageManagementClient />

        {/* =================================================
            SAVE SETTINGS
        ================================================= */}

        <SaveSettingsCard />
      </div>
    </main>
  );
}