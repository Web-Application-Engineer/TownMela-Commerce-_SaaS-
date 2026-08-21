"use client";

export default function ReturnRefundPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-[#F8FAFC]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6900]">
            Customer Info
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#0B1F3A] sm:text-4xl">
            Return & Refund Policy
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
            Review the general process for requesting a return, replacement or
            refund.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <PolicySection
            title="Return Requests"
            text="If there is a problem with an order, contact the store as soon as possible and provide the order details and a clear description of the issue."
          />

          <PolicySection
            title="Product Condition"
            text="Items may need to be returned in their original condition with relevant packaging, accessories or other supplied items unless the store confirms otherwise."
          />

          <PolicySection
            title="Inspection"
            text="A return or replacement may be reviewed after the item is received or sufficient evidence of the issue is provided."
          />

          <PolicySection
            title="Refunds"
            text="Approved refunds may be processed using an appropriate payment method after the return or claim has been reviewed."
          />

          <PolicySection
            title="Delivery Charges"
            text="Delivery or return shipping charges may depend on the reason for the return and the store's decision for the specific order."
          />

          <PolicySection
            title="Contact"
            text="For return or refund assistance, use the store contact information shown on the relevant product page or contact page."
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
