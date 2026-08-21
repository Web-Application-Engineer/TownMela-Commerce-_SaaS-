"use client";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-[#F8FAFC]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6900]">
            Customer Info
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#0B1F3A] sm:text-4xl">
            Privacy Policy
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
            This page explains the general types of information that may be
            collected when customers use the store and how that information may
            be used.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <PolicySection
            title="Information We May Collect"
            text="Information may include customer name, phone number, email address, delivery address, order details and other information provided during checkout or customer support."
          />

          <PolicySection
            title="How Information May Be Used"
            text="Customer information may be used to process orders, arrange delivery, provide support, prevent misuse and improve the shopping experience."
          />

          <PolicySection
            title="Service Providers"
            text="Relevant information may be shared with service providers such as delivery or payment partners when necessary to complete an order or provide requested services."
          />

          <PolicySection
            title="Data Security"
            text="Reasonable measures should be used to protect customer information. However, no online system can guarantee absolute security."
          />

          <PolicySection
            title="Policy Updates"
            text="This policy may be updated when store practices, features or legal requirements change."
          />
        </div>
      </section>
    </main>
  );
}

function PolicySection({
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
