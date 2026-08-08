import {
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

/* =========================================================
   PRODUCT ALERTS PROPS
========================================================= */

type ProductAlertsProps = {
  errorMessage: string;
  successMessage: string;
};

/* =========================================================
   PRODUCT ALERTS
========================================================= */

export default function ProductAlerts({
  errorMessage,
  successMessage,
}: ProductAlertsProps) {
  return (
    <>
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-600"
        >
          <AlertCircle
            size={21}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="text-sm font-extrabold">
              Product could not be saved
            </p>

            <p className="mt-1 text-sm leading-6">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700"
        >
          <CheckCircle2
            size={21}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="text-sm font-extrabold">
              Success
            </p>

            <p className="mt-1 text-sm">
              {successMessage}
            </p>
          </div>
        </div>
      )}
    </>
  );
}