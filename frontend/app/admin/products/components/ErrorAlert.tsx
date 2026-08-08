import {
  AlertCircle,
  X,
} from "lucide-react";

type ErrorAlertProps = {
  message: string;
  onClose: () => void;
};

export default function ErrorAlert({
  message,
  onClose,
}: ErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-800">
      <div className="flex items-start gap-3">
        <AlertCircle
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
        aria-label="Close error message"
        className="shrink-0 rounded-lg p-1 transition hover:bg-red-100"
      >
        <X size={18} />
      </button>
    </div>
  );
}