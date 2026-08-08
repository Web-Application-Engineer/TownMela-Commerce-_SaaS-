import {
  LoaderCircle,
} from "lucide-react";

export default function LoadingState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center">
      <LoaderCircle
        size={38}
        className="animate-spin text-[#FF6900]"
      />

      <p className="mt-4 text-sm font-bold text-gray-500">
        Loading products...
      </p>
    </div>
  );
}