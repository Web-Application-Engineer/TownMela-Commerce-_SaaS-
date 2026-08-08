"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MoreVertical,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

type CourierStatus = "active" | "inactive";

type CourierApiRecord = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  providerType?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  totalShipments?: number;
  deliveredShipments?: number;
  pendingShipments?: number;
  totalCharge?: number;
};

type Courier = {
  id: string;
  name: string;
  code: string;
  description: string;
  status: CourierStatus;
  isDefault: boolean;
  totalShipments: number;
  deliveredShipments: number;
  pendingShipments: number;
  totalCharge: number;
};

type CouriersResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    couriers?: CourierApiRecord[];
  };
};

type MutationResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    courier?: CourierApiRecord;
  };
};

function getErrorMessage(
  payload: { message?: string; error?: string } | null,
  fallback: string,
): string {
  return payload?.message || payload?.error || fallback;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeCourier(record: CourierApiRecord): Courier {
  const id = record._id || record.id || "";

  return {
    id,
    name: record.name?.trim() || "Unnamed Courier",
    code: record.code?.trim() || "-",
    description:
      record.description?.trim() ||
      `${record.providerType || "Courier"} delivery provider.`,
    status: record.isActive === false ? "inactive" : "active",
    isDefault: Boolean(record.isDefault),
    totalShipments: toNumber(record.totalShipments),
    deliveredShipments: toNumber(record.deliveredShipments),
    pendingShipments: toNumber(record.pendingShipments),
    totalCharge: toNumber(record.totalCharge),
  };
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);

export default function CouriersPage() {
  const {
    selectedTenantId,
  } = useTenant();

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CourierStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyCourierId, setBusyCourierId] = useState<string | null>(null);

  const loadCouriers = useCallback(async (showRefreshState = false) => {
    if (!selectedTenantId) {
      setCouriers([]);
      setError(
        "Please select a tenant before continuing.",
      );
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (showRefreshState) setIsRefreshing(true);
    else setIsLoading(true);

    setError(null);

    try {
      const response = await tenantFetch(
        "/api/couriers?limit=100",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as CouriersResponse | null;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to load couriers."));
      }

      const records = payload?.data?.couriers ?? [];
      setCouriers(records.map(normalizeCourier).filter((courier) => courier.id));
    } catch (loadError) {
      setCouriers([]);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong while loading couriers.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTenantId]);

  useEffect(() => {
    setCouriers([]);
    setSearchTerm("");
    setStatusFilter("all");
    setMessage(null);
    setError(null);

    void loadCouriers();
  }, [
    loadCouriers,
    selectedTenantId,
  ]);

  useEffect(() => {
    const handleCouriersUpdated =
      () => {
        void loadCouriers(true);
      };

    window.addEventListener(
      "couriers-updated",
      handleCouriersUpdated,
    );

    return () => {
      window.removeEventListener(
        "couriers-updated",
        handleCouriersUpdated,
      );
    };
  }, [loadCouriers]);

  const filteredCouriers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return couriers.filter((courier) => {
      const matchesSearch =
        !search ||
        courier.name.toLowerCase().includes(search) ||
        courier.code.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "all" || courier.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [couriers, searchTerm, statusFilter]);

  const statistics = useMemo(
    () =>
      couriers.reduce(
        (summary, courier) => {
          summary.totalCouriers += 1;
          if (courier.status === "active") summary.activeCouriers += 1;
          summary.totalShipments += courier.totalShipments;
          summary.totalCharge += courier.totalCharge;
          return summary;
        },
        {
          totalCouriers: 0,
          activeCouriers: 0,
          totalShipments: 0,
          totalCharge: 0,
        },
      ),
    [couriers],
  );

  const updateCourierInState = (record: CourierApiRecord) => {
    const updatedCourier = normalizeCourier(record);

    setCouriers((current) =>
      current.map((courier) =>
        courier.id === updatedCourier.id ? updatedCourier : courier,
      ),
    );
  };

  const handleStatusToggle = async (courier: Courier) => {
    setBusyCourierId(courier.id);
    setError(null);
    setMessage(null);

    try {
      const response = await tenantFetch(
        `/api/couriers/${courier.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: courier.status !== "active" }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as MutationResponse | null;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to update courier status."),
        );
      }

      if (payload?.data?.courier) updateCourierInState(payload.data.courier);
      else await loadCouriers(true);

      window.dispatchEvent(
        new Event(
          "couriers-updated",
        ),
      );

      setMessage(payload?.message || "Courier status updated successfully.");
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to update courier status.",
      );
    } finally {
      setBusyCourierId(null);
    }
  };

  const handleSetDefault = async (courier: Courier) => {
    setBusyCourierId(courier.id);
    setError(null);
    setMessage(null);

    try {
      const response = await tenantFetch(
        `/api/couriers/${courier.id}/default`,
        {
          method: "PATCH",
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as MutationResponse | null;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(payload, "Unable to set the default courier."),
        );
      }

      await loadCouriers(true);

      window.dispatchEvent(
        new Event(
          "couriers-updated",
        ),
      );

      setMessage(payload?.message || "Default courier updated successfully.");
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to set the default courier.",
      );
    } finally {
      setBusyCourierId(null);
    }
  };

  const handleDelete = async (courier: Courier) => {
    const confirmed = window.confirm(
      `Delete ${courier.name}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setBusyCourierId(courier.id);
    setError(null);
    setMessage(null);

    try {
      const response = await tenantFetch(
        `/api/couriers/${courier.id}`,
        {
          method: "DELETE",
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as MutationResponse | null;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Unable to delete courier."));
      }

      setCouriers((current) =>
        current.filter((item) => item.id !== courier.id),
      );

      window.dispatchEvent(
        new Event(
          "couriers-updated",
        ),
      );

      setMessage(payload?.message || "Courier deleted successfully.");
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to delete courier.",
      );
    } finally {
      setBusyCourierId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF6900] text-white shadow-lg shadow-orange-500/20">
              <Truck size={24} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                Courier Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage courier providers, status and delivery performance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadCouriers(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={17} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <Link
              href="/admin/couriers/new"
              aria-disabled={!selectedTenantId}
              onClick={(event) => {
                if (!selectedTenantId) {
                  event.preventDefault();
                  setError(
                    "Please select a tenant before adding a courier.",
                  );
                }
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white transition ${
                selectedTenantId
                  ? "bg-[#FF6900] hover:bg-orange-600"
                  : "cursor-not-allowed bg-gray-400"
              }`}
            >
              <Plus size={18} />
              Add Courier
            </Link>

            <Link
              href="/admin/courier-shipments"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900]"
            >
              <PackageCheck size={18} />
              Courier Shipments
            </Link>

            <Link
              href="/admin/couriers/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-[#17181d] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-gray-800"
            >
              <Settings2 size={18} />
              Courier Settings
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total Couriers" value={String(statistics.totalCouriers)} icon={<Truck size={22} />} />
          <StatCard title="Active Couriers" value={String(statistics.activeCouriers)} icon={<CheckCircle2 size={22} />} />
          <StatCard title="Total Shipments" value={statistics.totalShipments.toLocaleString("en-BD")} icon={<PackageCheck size={22} />} />
          <StatCard title="Courier Charges" value={formatCurrency(statistics.totalCharge)} icon={<CircleDollarSign size={22} />} />
        </section>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search courier name or code..."
                className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "active", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold capitalize transition ${
                    statusFilter === status
                      ? "bg-[#17181d] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-[#FF6900]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-lg font-black text-gray-900">Courier Providers</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredCouriers.length} courier{filteredCouriers.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {isLoading ? (
            <LoadingRows />
          ) : filteredCouriers.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredCouriers.map((courier) => (
                <CourierRow
                  key={courier.id}
                  courier={courier}
                  isBusy={busyCourierId === courier.id}
                  onStatusToggle={() => void handleStatusToggle(courier)}
                  onSetDefault={() => void handleSetDefault(courier)}
                  onDelete={() => void handleDelete(courier)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Truck size={28} />
              </div>
              <h3 className="mt-4 text-lg font-black text-gray-900">No couriers found</h3>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                Add a courier or change your current search and filter.
              </p>
              <Link
                href="/admin/couriers/new"
                aria-disabled={!selectedTenantId}
                onClick={(event) => {
                  if (!selectedTenantId) {
                    event.preventDefault();
                    setError(
                      "Please select a tenant before adding a courier.",
                    );
                  }
                }}
                className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold text-white transition ${
                  selectedTenantId
                    ? "bg-[#FF6900] hover:bg-orange-600"
                    : "cursor-not-allowed bg-gray-400"
                }`}
              >
                <Plus size={18} />
                Add Courier
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-gray-900">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">{icon}</div>
      </div>
    </article>
  );
}

function CourierRow({
  courier,
  isBusy,
  onStatusToggle,
  onSetDefault,
  onDelete,
}: {
  courier: Courier;
  isBusy: boolean;
  onStatusToggle: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        !menuContainerRef.current?.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <article className="relative p-5 transition hover:bg-gray-50/70">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#17181d] text-white">
            <Truck size={24} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-gray-900">{courier.name}</h3>
              <StatusBadge status={courier.status} />
              {courier.isDefault && (
                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-extrabold text-[#FF6900]">Default</span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-400">
              Code: <span className="text-gray-600">{courier.code}</span>
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{courier.description}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[520px]">
          <Metric label="Total" value={courier.totalShipments.toLocaleString("en-BD")} icon={<PackageCheck size={17} />} />
          <Metric label="Delivered" value={courier.deliveredShipments.toLocaleString("en-BD")} icon={<CheckCircle2 size={17} />} />
          <Metric label="Pending" value={courier.pendingShipments.toLocaleString("en-BD")} icon={<Clock3 size={17} />} />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {!courier.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              disabled={isBusy || courier.status !== "active"}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-gray-700 transition hover:border-[#FF6900] hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set Default
            </button>
          )}

          <button
            type="button"
            onClick={onStatusToggle}
            disabled={isBusy}
            className={`rounded-xl px-4 py-2.5 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              courier.status === "active"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isBusy ? "Please wait..." : courier.status === "active" ? "Deactivate" : "Activate"}
          </button>

          <div ref={menuContainerRef} className="relative">
            <button
              type="button"
              aria-label={`More options for ${courier.name}`}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition ${
                isMenuOpen
                  ? "border-[#FF6900] bg-orange-50 text-[#FF6900]"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <MoreVertical size={18} />
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                aria-label={`Actions for ${courier.name}`}
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
              >
                <Link
                  href={`/admin/couriers/${courier.id}`}
                  role="menuitem"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-bold text-gray-700 transition hover:bg-orange-50 hover:text-[#FF6900]"
                >
                  Edit Courier
                </Link>

                {!courier.isDefault && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={isBusy || courier.status !== "active"}
                    onClick={() => {
                      onSetDefault();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-bold text-gray-700 transition hover:bg-orange-50 hover:text-[#FF6900] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Set as Default
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  disabled={isBusy}
                  onClick={() => {
                    onStatusToggle();
                    setIsMenuOpen(false);
                  }}
                  className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    courier.status === "active"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {courier.status === "active" ? "Deactivate Courier" : "Activate Courier"}
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  type="button"
                  role="menuitem"
                  disabled={isBusy}
                  onClick={() => {
                    onDelete();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Delete Courier
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: CourierStatus }) {
  const active = status === "active";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
      {active ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2 text-gray-400">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-base font-black text-gray-900">{value}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3].map((item) => (
        <div key={item} className="animate-pulse p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gray-200" />
              <div>
                <div className="h-5 w-44 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-64 rounded bg-gray-100" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[520px]">
              {[1, 2, 3].map((metric) => (
                <div key={metric} className="h-16 rounded-xl bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}