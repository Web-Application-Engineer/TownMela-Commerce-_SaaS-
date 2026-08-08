import { LoaderCircle } from "lucide-react";

type LoadingStateProps = {
  title?: string;
  message?: string;
};

export default function LoadingState({
  title = "Orders load হচ্ছে",
  message = "অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।",
}: LoadingStateProps) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-[#FF6900]" />

        <h2 className="mt-4 text-lg font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {message}
        </p>
      </div>
    </div>
  );
}