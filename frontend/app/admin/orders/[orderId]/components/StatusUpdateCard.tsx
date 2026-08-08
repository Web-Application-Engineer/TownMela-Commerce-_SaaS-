"use client";

import { Check, LoaderCircle, Save } from "lucide-react";
import type { FormEvent } from "react";

import { getStatusClass } from "../../utils/orderHelpers";

/* =========================================================
   TYPES
========================================================= */

export type OrderStatus =
  | "Pending"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled";

type StatusUpdateCardProps = {
  currentStatus: OrderStatus;
  selectedStatus: OrderStatus;
  updatingStatus: boolean;
  onStatusChange: (status: OrderStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/* =========================================================
   CONSTANTS
========================================================= */

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const ORDER_PROGRESS_SEQUENCE: OrderStatus[] = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
];

/* =========================================================
   COMPONENT
========================================================= */

export default function StatusUpdateCard({
  currentStatus,
  selectedStatus,
  updatingStatus,
  onStatusChange,
  onSubmit,
}: StatusUpdateCardProps) {
  const currentStatusIndex =
    ORDER_PROGRESS_SEQUENCE.indexOf(currentStatus);

  const hasStatusChanged =
    selectedStatus !== currentStatus;

  const isCancelled =
    currentStatus === "Cancelled";

  return (
    <div className="space-y-5">
      {/* =================================================
          STATUS UPDATE CARD
      ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">
            Update Order Status
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Order-এর বর্তমান delivery status পরিবর্তন করুন।
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <label
            htmlFor="order-status"
            className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500"
          >
            Select Status
          </label>

          <select
            id="order-status"
            value={selectedStatus}
            disabled={updatingStatus}
            onChange={(event) =>
              onStatusChange(
                event.target.value as OrderStatus,
              )
            }
            className="
              min-h-12
              w-full
              cursor-pointer
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-3
              text-sm
              font-bold
              text-slate-700
              outline-none
              transition
              focus:border-[#FF6900]
              focus:bg-white
              focus:ring-4
              focus:ring-orange-100
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {ORDER_STATUS_OPTIONS.map((statusOption) => (
              <option
                key={statusOption}
                value={statusOption}
              >
                {statusOption}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={
              updatingStatus || !hasStatusChanged
            }
            className="
              mt-4
              inline-flex
              min-h-12
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#FF6900]
              px-4
              text-sm
              font-black
              text-white
              transition
              hover:bg-[#e85f00]
              focus:outline-none
              focus:ring-4
              focus:ring-orange-200
              disabled:cursor-not-allowed
              disabled:bg-slate-300
              disabled:text-slate-500
              disabled:ring-0
            "
          >
            {updatingStatus ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Updating Status...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Update Status
              </>
            )}
          </button>
        </form>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Current Status
          </p>

          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
              currentStatus,
            )}`}
          >
            {currentStatus}
          </span>
        </div>

        {hasStatusChanged && (
          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
              New Selected Status
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
                  currentStatus,
                )}`}
              >
                {currentStatus}
              </span>

              <span className="text-sm font-black text-orange-500">
                →
              </span>

              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClass(
                  selectedStatus,
                )}`}
              >
                {selectedStatus}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* =================================================
          ORDER PROGRESS
      ================================================= */}

      {!isCancelled ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-950">
              Order Progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Order delivery-এর বর্তমান অগ্রগতি।
            </p>
          </div>

          <div>
            {ORDER_PROGRESS_SEQUENCE.map(
              (statusOption, index) => {
                const isCompleted =
                  currentStatusIndex >= index;

                const isCurrent =
                  statusOption === currentStatus;

                const isLast =
                  index ===
                  ORDER_PROGRESS_SEQUENCE.length - 1;

                return (
                  <div
                    key={statusOption}
                    className="relative flex gap-3"
                  >
                    {!isLast && (
                      <div
                        className={`absolute left-[15px] top-8 h-[calc(100%-4px)] w-px ${
                          isCompleted
                            ? "bg-[#FF6900]"
                            : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div
                      className={`
                        relative
                        z-10
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        ${
                          isCompleted
                            ? "border-[#FF6900] bg-[#FF6900] text-white"
                            : "border-slate-200 bg-slate-100 text-slate-400"
                        }
                      `}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-black">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pb-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-black ${
                            isCompleted
                              ? "text-slate-950"
                              : "text-slate-400"
                          }`}
                        >
                          {statusOption}
                        </p>

                        {isCurrent && (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#FF6900]">
                            Current
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {getProgressDescription(
                          statusOption,
                        )}
                      </p>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <h2 className="text-lg font-black text-red-800">
            Order Cancelled
          </h2>

          <p className="mt-1 text-sm leading-6 text-red-700">
            এই order বর্তমানে cancelled অবস্থায় আছে।
          </p>
        </section>
      )}
    </div>
  );
}

/* =========================================================
   PROGRESS DESCRIPTION
========================================================= */

function getProgressDescription(
  status: OrderStatus,
) {
  switch (status) {
    case "Pending":
      return "Order গ্রহণ করা হয়েছে এবং confirmation-এর অপেক্ষায় আছে।";

    case "Processing":
      return "Order প্রস্তুত এবং processing করা হচ্ছে।";

    case "Shipped":
      return "Order courier-এর মাধ্যমে পাঠানো হয়েছে।";

    case "Delivered":
      return "Order সফলভাবে customer-এর কাছে পৌঁছেছে।";

    case "Cancelled":
      return "Order বাতিল করা হয়েছে।";

    default:
      return "";
  }
}