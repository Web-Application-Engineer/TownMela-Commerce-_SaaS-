"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_URL =
  typeof window !== "undefined"
    ? window.location.origin.replace(/\/+$/, "")
    : (
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:5000"
      ).replace(/\/+$/, "");

interface SupplierSnapshot {
  supplierCode?: string | null;
  businessName?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string | null;
}

interface WarehouseSnapshot {
  warehouseName?: string | null;
  warehouseCode?: string | null;
  address?: string | null;
}

interface InventoryPostingState {
  status?: string;
  postedAt?: string | null;
  postedBy?: string | null;
  postingReference?: string | null;
}

interface GoodsReceivedPreview {
  _id: string;
  goodsReceivedNumber?: string;
  purchaseOrderNumber?: string;
  supplierSnapshot?: SupplierSnapshot;
  warehouseSnapshot?: WarehouseSnapshot;
  receivedDate?: string;
  receivedAt?: string;
  currency?: string;
  status?: string;
  inventoryPosting?: InventoryPostingState;
}

interface ProductSnapshot {
  productName?: string | null;
  sku?: string | null;
  unitName?: string | null;
  variantName?: string | null;
}

interface PostingItem {
  goodsReceivedItemId: string;
  lineNumber?: number;
  product?: string | null;
  variant?: string | null;
  productSnapshot?: ProductSnapshot;
  warehouse?: string | null;
  acceptedQuantity?: number;
  alreadyPostedQuantity?: number;
  postableQuantity?: number;
  unitCost?: number;
  totalCost?: number;
  batchNumber?: string | null;
  serialNumberCount?: number;
  canPost?: boolean;
  errors?: string[];
}

interface PostingSummary {
  totalItems?: number;
  postableItemCount?: number;
  blockedItemCount?: number;
  totalPostableQuantity?: number;
  totalPostingValue?: number;
  canPost?: boolean;
  status?: string;
}

interface PreviewData {
  goodsReceived: GoodsReceivedPreview;
  items: PostingItem[];
  summary: PostingSummary;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field?: string;
    message?: string;
  }>;
}

const getStorageValue = (keys: string[]): string => {
  if (typeof window === "undefined") return "";

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value?.trim()) return value.trim();
  }

  return "";
};

const getAccessToken = () =>
  getStorageValue([
    "accessToken",
    "token",
    "authToken",
    "jwt",
    "townmelaAdminToken",
  ]);

const getTenantId = () =>
  getStorageValue([
    "tenantId",
    "tenant_id",
    "activeTenantId",
    "currentTenantId",
  ]);

const createHeaders = (includeJson = false): Headers => {
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (includeJson) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  const tenantId = getTenantId();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) headers.set("X-Tenant-Id", tenantId);

  return headers;
};

const ensureContext = () => {
  if (!getAccessToken()) {
    throw new Error(
      "Your admin session is missing or expired. Please log in again.",
    );
  }

  if (!getTenantId()) {
    throw new Error(
      "Tenant context is missing. Please log out and sign in again.",
    );
  }
};

const isValidObjectId = (value: string) =>
  /^[a-f\d]{24}$/i.test(value.trim());

const getErrorMessage = (
  result: ApiResponse<unknown>,
  fallback: string,
): string => {
  const details = Array.isArray(result.errors)
    ? result.errors
        .map((item) =>
          item.field
            ? `${item.field}: ${item.message || ""}`
            : item.message || "",
        )
        .filter(Boolean)
        .join(" | ")
    : "";

  return details || result.message || fallback;
};

const safeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getToday = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (value: number, currency = "BDT") => {
  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-BD")}`;
  }
};

const formatDate = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const statusClass = (status?: string) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "posted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized.includes("failed") ||
    normalized.includes("reversed")
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

function InfoCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}

export default function CreateInventoryPostingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goodsReceivedId =
    searchParams.get("goodsReceivedId")?.trim() || "";

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [postingDate, setPostingDate] = useState(getToday());
  const [remarks, setRemarks] = useState("");

  const loadPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      ensureContext();

      if (!goodsReceivedId) {
        throw new Error(
          "Goods Received identifier is missing from the URL.",
        );
      }

      if (!isValidObjectId(goodsReceivedId)) {
        throw new Error(
          "The Goods Received identifier in the URL is invalid.",
        );
      }

      const response = await fetch(
        `${API_URL}/api/goods-received-inventory-posting/${encodeURIComponent(
          goodsReceivedId,
        )}/preview`,
        {
          method: "GET",
          headers: createHeaders(),
          credentials: "include",
          cache: "no-store",
        },
      );

      const result =
        (await response.json().catch(() => ({}))) as ApiResponse<PreviewData>;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            `Failed to load inventory posting preview (${response.status}).`,
          ),
        );
      }

      if (
        !result.data?.goodsReceived ||
        !Array.isArray(result.data.items) ||
        !result.data.summary
      ) {
        throw new Error(
          "Inventory posting preview response is incomplete.",
        );
      }

      setPreview(result.data);
    } catch (requestError) {
      setPreview(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load inventory posting preview.",
      );
    } finally {
      setLoading(false);
    }
  }, [goodsReceivedId]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const goodsReceived = preview?.goodsReceived;
  const items = preview?.items || [];
  const summary = preview?.summary;

  const currency =
    goodsReceived?.currency ||
    goodsReceived?.supplierSnapshot?.currency ||
    "BDT";

  const postingStatus =
    goodsReceived?.inventoryPosting?.status ||
    summary?.status ||
    "Not Posted";

  const totalQuantity = safeNumber(
    summary?.totalPostableQuantity,
  );

  const totalValue = safeNumber(
    summary?.totalPostingValue,
  );

  const postableItemCount = safeNumber(
    summary?.postableItemCount,
  );

  const blockedItemCount = safeNumber(
    summary?.blockedItemCount,
  );

  const alreadyPosted =
    postingStatus.trim().toLowerCase() === "posted";

  const canPost =
    Boolean(summary?.canPost) &&
    postableItemCount > 0 &&
    totalQuantity > 0 &&
    !alreadyPosted;

  const handlePost = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      setPosting(true);
      setError("");
      setSuccess("");

      ensureContext();

      if (!isValidObjectId(goodsReceivedId)) {
        throw new Error(
          "The Goods Received identifier is invalid.",
        );
      }

      if (!postingDate) {
        throw new Error("Posting date is required.");
      }

      if (!canPost) {
        throw new Error(
          "This goods receipt is not currently eligible for inventory posting.",
        );
      }

      const response = await fetch(
        `${API_URL}/api/goods-received-inventory-posting/${encodeURIComponent(
          goodsReceivedId,
        )}/post`,
        {
          method: "POST",
          headers: createHeaders(true),
          credentials: "include",
          body: JSON.stringify({
            postingDate: new Date(
              `${postingDate}T00:00:00`,
            ).toISOString(),
            remarks: remarks.trim() || undefined,
          }),
        },
      );

      const result =
        (await response.json().catch(() => ({}))) as ApiResponse<unknown>;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            `Failed to post inventory (${response.status}).`,
          ),
        );
      }

      setSuccess(
        result.message || "Inventory posted successfully.",
      );

      window.setTimeout(() => {
        router.push(
          `/admin/supplier-and-purchase/goods-received/${goodsReceivedId}`,
        );
        router.refresh();
      }, 900);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to post inventory.",
      );
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto flex min-h-[65vh] max-w-[1400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600" />
            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading inventory posting preview...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/admin" className="hover:text-orange-600">
            Admin
          </Link>
          <span>/</span>
          <Link
            href="/admin/supplier-and-purchase"
            className="hover:text-orange-600"
          >
            Supplier &amp; Purchase
          </Link>
          <span>/</span>
          <Link
            href="/admin/supplier-and-purchase/goods-received"
            className="hover:text-orange-600"
          >
            Goods Received
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">
            Inventory Posting
          </span>
        </nav>

        <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              Inventory Control
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Create Inventory Posting
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Review accepted goods, confirm posting details, and update
              warehouse stock.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={posting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh Preview
            </button>

            <Link
              href={
                goodsReceivedId
                  ? `/admin/supplier-and-purchase/goods-received/${goodsReceivedId}`
                  : "/admin/supplier-and-purchase/goods-received"
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700"
            >
              Back to Goods Received
            </Link>
          </div>
        </header>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="GRN"
            value={
              goodsReceived?.goodsReceivedNumber ||
              "Goods Received"
            }
            description="Source goods receipt."
          />

          <InfoCard
            label="Posting Status"
            value={postingStatus}
            description="Current inventory posting status."
          />

          <InfoCard
            label="Posting Quantity"
            value={totalQuantity.toLocaleString("en-BD")}
            description="Accepted quantity to add into stock."
          />

          <InfoCard
            label="Inventory Value"
            value={formatMoney(totalValue, currency)}
            description="Estimated inventory value."
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Posting Information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Source document and warehouse information.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                postingStatus,
              )}`}
            >
              {postingStatus}
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Purchase Order
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {goodsReceived?.purchaseOrderNumber || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Supplier
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {goodsReceived?.supplierSnapshot?.businessName || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Warehouse
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {goodsReceived?.warehouseSnapshot?.warehouseName || "—"}
              </p>
              {goodsReceived?.warehouseSnapshot?.warehouseCode ? (
                <p className="mt-1 text-xs text-slate-500">
                  {goodsReceived.warehouseSnapshot.warehouseCode}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Received Date
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(
                  goodsReceived?.receivedDate ||
                    goodsReceived?.receivedAt,
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Inventory Posting Items
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review each stock movement before posting.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                Postable: {postableItemCount}
              </span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                Blocked: {blockedItemCount}
              </span>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No inventory posting items were returned by the preview
              endpoint.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "#",
                      "Product",
                      "SKU",
                      "Unit",
                      "Accepted",
                      "Already Posted",
                      "Postable",
                      "Unit Cost",
                      "Line Value",
                      "Warehouse",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const acceptedQuantity =
                      safeNumber(item.acceptedQuantity);
                    const alreadyPostedQuantity =
                      safeNumber(item.alreadyPostedQuantity);
                    const postableQuantity =
                      safeNumber(item.postableQuantity);
                    const unitCost =
                      safeNumber(item.unitCost);
                    const lineValue =
                      safeNumber(item.totalCost) ||
                      postableQuantity * unitCost;

                    return (
                      <tr
                        key={
                          item.goodsReceivedItemId ||
                          String(index)
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-sm text-slate-500">
                          {item.lineNumber || index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-900">
                            {item.productSnapshot?.productName ||
                              "Unnamed Product"}
                          </p>

                          {item.productSnapshot?.variantName ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.productSnapshot.variantName}
                            </p>
                          ) : null}

                          {item.canPost === false &&
                          Array.isArray(item.errors) &&
                          item.errors.length > 0 ? (
                            <p className="mt-1 max-w-[300px] text-xs font-semibold text-red-600">
                              {item.errors.join(" | ")}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.productSnapshot?.sku || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.productSnapshot?.unitName || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                          {acceptedQuantity.toLocaleString("en-BD")}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {alreadyPostedQuantity.toLocaleString("en-BD")}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-emerald-700">
                          {postableQuantity.toLocaleString("en-BD")}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {formatMoney(unitCost, currency)}
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-slate-900">
                          {formatMoney(lineValue, currency)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {goodsReceived?.warehouseSnapshot
                            ?.warehouseName || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              item.canPost
                                ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"
                                : "inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"
                            }
                          >
                            {item.canPost ? "Ready" : "Blocked"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form
          onSubmit={handlePost}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
            <div>
              <label
                htmlFor="postingDate"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Posting Date *
              </label>

              <input
                id="postingDate"
                type="date"
                max={getToday()}
                value={postingDate}
                onChange={(event) =>
                  setPostingDate(event.target.value)
                }
                disabled={posting || alreadyPosted}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="remarks"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Remarks
              </label>

              <textarea
                id="remarks"
                rows={4}
                maxLength={2000}
                value={remarks}
                onChange={(event) =>
                  setRemarks(event.target.value)
                }
                disabled={posting || alreadyPosted}
                placeholder="Optional posting remarks"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
              />
            </div>
          </div>

          {!canPost && !alreadyPosted && preview ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              Inventory posting is currently blocked. Review the item
              validation results above.
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Link
              href={
                goodsReceivedId
                  ? `/admin/supplier-and-purchase/goods-received/${goodsReceivedId}`
                  : "/admin/supplier-and-purchase/goods-received"
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                posting ||
                alreadyPosted ||
                !isValidObjectId(goodsReceivedId) ||
                !canPost
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-orange-600 px-7 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {alreadyPosted
                ? "Inventory Already Posted"
                : posting
                  ? "Posting Inventory..."
                  : "Post Inventory"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}