import {
  CheckCircle2,
  X,
} from "lucide-react";

type SuccessAlertProps = {
  message: string;
  onClose: () => void;
};

export default function SuccessAlert({
  message,
  onClose,
}: SuccessAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
      <div className="flex items-start gap-3">
        <CheckCircle2
          size={20}
          className="mt-0.5 shrink-0"
        />

        <p className="text-sm font-bold leading-6">
          {message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close success message"
        className="shrink-0 rounded-lg p-1 transition hover:bg-emerald-100"
      >
        <X size={18} />
      </button>
    </div>
  );
}