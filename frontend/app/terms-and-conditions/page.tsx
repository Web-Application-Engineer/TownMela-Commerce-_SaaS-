"use client";

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-[#F8FAFC]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6900]">
            Customer Info
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#0B1F3A] sm:text-4xl">
            Terms & Conditions
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
            These general terms describe the conditions that apply when using
            the store and placing an order.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <TermsSection
            title="Store Use"
            text="Customers should use the website lawfully and provide accurate information when placing orders or contacting the store."
          />

          <TermsSection
            title="Product Information"
            text="The store aims to keep product descriptions, prices and availability accurate, but information may be updated or corrected when necessary."
          />

          <TermsSection
            title="Orders"
            text="An order may require confirmation before it is treated as accepted. The store may contact the customer if additional information is needed."
          />

          <TermsSection
            title="Delivery"
            text="Delivery time may vary depending on location, courier operations, holidays or other circumstances outside the store's direct control."
          />

          <TermsSection
            title="Returns & Refunds"
            text="Returns and refunds are subject to the Return & Refund Policy and any product-specific conditions shown on the store."
          />

          <TermsSection
            title="Changes"
            text="These terms may be updated when store operations, services or requirements change."
          />
        </div>
      </section>
    </main>
  );
}

function TermsSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section>
      <h2 className="text-xl font-black text-[#0B1F3A]">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
        {text}
      </p>
    </section>
  );
}
