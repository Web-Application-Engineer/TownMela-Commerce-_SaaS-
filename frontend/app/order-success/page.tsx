import { Suspense } from "react";

import OrderSuccessClient from "./OrderSuccessClient";

function OrderSuccessLoading() {
  return (
    <main className="min-h-screen w-full bg-[#F7F8FA] py-8">
      <section className="mx-auto w-full max-w-[1450px] px-3 sm:px-4 lg:px-5">
        <div className="mx-auto min-h-[400px] max-w-4xl animate-pulse rounded-3xl border border-gray-200 bg-white" />
      </section>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderSuccessLoading />}>
      <OrderSuccessClient />
    </Suspense>
  );
}