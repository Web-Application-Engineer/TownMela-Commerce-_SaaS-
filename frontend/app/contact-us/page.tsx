"use client";

export default function ContactUsPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-[#F8FAFC]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6900]">
            Customer Info
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#0B1F3A] sm:text-4xl">
            Contact Us
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
            Get in touch with the store for product, order, delivery or general
            customer support.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-black text-[#0B1F3A]">
            Customer Support
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
            For the fastest support, use the phone, WhatsApp or other contact
            information displayed on the relevant product page. You can also use
            the Quick Contact form in the footer where available.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-5">
              <h3 className="font-bold text-[#0B1F3A]">
                Product & Order Support
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Contact the store regarding product details, order confirmation,
                delivery status or payment information.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-5">
              <h3 className="font-bold text-[#0B1F3A]">
                Returns & Refunds
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                For return or refund questions, review the Return & Refund Policy
                and contact the store with your order information.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
