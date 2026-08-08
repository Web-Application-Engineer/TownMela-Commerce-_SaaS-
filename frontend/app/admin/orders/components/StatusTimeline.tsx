import {
  CheckCircle2,
  Clock3,
  Package,
  RefreshCcw,
  Truck,
  XCircle,
} from "lucide-react";

import {
  formatDate,
  getStatusClass,
} from "../utils/orderHelpers";

/* =========================================================
   TYPES
========================================================= */

export type StatusHistoryItem = {
  _id?: string;
  status?: string;
  note?: string;
  changedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type StatusTimelineProps = {
  history?: StatusHistoryItem[];
  currentStatus: string;
  createdAt?: string;
  updatedAt?: string;
};

/* =========================================================
   HELPER
========================================================= */

function getTimelineIcon(status?: string) {
  switch (status?.toLowerCase()) {
    case "pending":
      return Clock3;

    case "processing":
      return RefreshCcw;

    case "shipped":
      return Truck;

    case "delivered":
      return CheckCircle2;

    case "cancelled":
      return XCircle;

    default:
      return Package;
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function StatusTimeline({
  history = [],
  currentStatus,
  createdAt,
  updatedAt,
}: StatusTimelineProps) {
  const timelineItems =
    history.length > 0
      ? history
      : [
          {
            status: currentStatus,
            changedAt: updatedAt || createdAt,
          },
        ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Section heading */}

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
          <Clock3 className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-black text-slate-950">
            Order Status History
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            Complete order progress timeline
          </p>
        </div>
      </div>

      {/* Timeline */}

      <div>
        {timelineItems.map((historyItem, index) => {
          const TimelineIcon = getTimelineIcon(
            historyItem.status,
          );

          const isLast =
            index === timelineItems.length - 1;

          const historyDate =
            historyItem.changedAt ||
            historyItem.createdAt ||
            historyItem.updatedAt;

          return (
            <article
              key={
                historyItem._id ||
                `${historyItem.status}-${historyDate}-${index}`
              }
              className="relative flex gap-4"
            >
              {/* Vertical connecting line */}

              {!isLast && (
                <div className="absolute left-[19px] top-10 h-[calc(100%-16px)] w-px bg-slate-200" />
              )}

              {/* Status icon */}

              <div
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${getStatusClass(
                  historyItem.status,
                )}`}
              >
                <TimelineIcon className="h-4 w-4" />
              </div>

              {/* Status information */}

              <div className="min-w-0 flex-1 pb-7">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-black text-slate-900">
                    {historyItem.status || "Status Updated"}
                  </h3>

                  <span className="text-xs font-semibold text-slate-500">
                    {formatDate(historyDate)}
                  </span>
                </div>

                {historyItem.note && (
                  <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                    {historyItem.note}
                  </p>
                )}

                {!historyItem.note && (
                  <p className="mt-1 text-sm text-slate-500">
                    Order status changed to{" "}
                    <span className="font-bold text-slate-700">
                      {historyItem.status || "Updated"}
                    </span>
                    .
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}