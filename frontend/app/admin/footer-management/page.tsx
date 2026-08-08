import FooterHeader from "./components/FooterHeader";
import FooterManagementClient from "./components/FooterManagementClient";

/* =========================================================
   FOOTER MANAGEMENT PAGE
========================================================= */

export default function FooterManagementPage() {
  return (
    <main className="min-h-screen bg-[#f6f7f9] px-3 py-5 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px]">
        <FooterHeader />

        <FooterManagementClient />
      </div>
    </main>
  );
}