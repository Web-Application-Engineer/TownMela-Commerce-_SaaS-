"use client";

import Link from "next/link";

export default function AboutUsPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-200 bg-[#F8FAFC]">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF6900]">
            Customer Info
          </p>

          <h1 className="mt-3 text-3xl font-black text-[#0B1F3A] sm:text-4xl">
            About Us
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-600 sm:text-base">
            Learn more about our store, our service commitment and how we support
            customers throughout their shopping journey.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black text-[#0B1F3A]">
              Who We Are
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
              We are committed to providing customers with a simple, reliable
              and convenient online shopping experience. Our goal is to make it
              easy to discover products, place orders and get the support needed
              before and after purchase.
            </p>

            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
              Store information, delivery details and customer service policies
              may be updated over time. Please check the relevant information
              shown on product and checkout pages before placing an order.
            </p>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-6 sm:p-8">
            <h2 className="text-xl font-black text-[#0B1F3A]">
              Need Help?
            </h2>

            <p className="mt-3 text-sm leading-7 text-gray-600">
              If you need help with a product or order, use the contact options
              available on the product page or visit our contact page.
            </p>

            <Link
              href="/contact-us"
              className="mt-6 inline-flex rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#E85F00]"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
