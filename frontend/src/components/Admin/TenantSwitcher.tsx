"use client";

import {
  Building2,
  Check,
  ChevronDown,
  RefreshCcw,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useTenant,
} from "@/src/context/TenantContext";

/* =========================================================
   TENANT SWITCHER
========================================================= */

export default function TenantSwitcher() {
  const {
    tenants,
    selectedTenant,
    selectedTenantId,
    loadingTenants,
    tenantError,
    selectTenant,
    refreshTenants,
  } = useTenant();

  const [
    open,
    setOpen,
  ] = useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /* =======================================================
     CLOSE DROPDOWN ON OUTSIDE CLICK
  ======================================================= */

  useEffect(() => {
    const closeOnOutsideClick = (
      event: MouseEvent,
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      closeOnOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeOnOutsideClick,
      );
    };
  }, []);

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[330px]"
    >
      {/* ACTIVE TENANT BUTTON */}

      <button
        type="button"
        disabled={loadingTenants}
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        className="
          flex
          min-h-11
          w-full
          items-center
          justify-between
          gap-3
          rounded-xl
          border
          border-gray-200
          bg-white
          px-3.5
          text-left
          shadow-sm
          transition
          hover:border-[#FF6900]
          disabled:cursor-wait
          disabled:opacity-60
        "
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-orange-50
              text-[#FF6900]
            "
          >
            <Building2 size={17} />
          </span>

          <span className="min-w-0">
            <span
              className="
                block
                truncate
                text-[11px]
                font-extrabold
                uppercase
                tracking-[0.08em]
                text-gray-400
              "
            >
              Active Tenant
            </span>

            <span
              className="
                mt-0.5
                block
                truncate
                text-sm
                font-black
                text-[#0B1F3A]
              "
            >
              {loadingTenants
                ? "Loading tenants..."
                : selectedTenant
                  ? selectedTenant.storeName ||
                    selectedTenant.businessName ||
                    "Selected Tenant"
                  : "Select a tenant"}
            </span>
          </span>
        </span>

        <ChevronDown
          size={17}
          className={`
            shrink-0
            text-gray-400
            transition

            ${
              open
                ? "rotate-180"
                : ""
            }
          `}
        />
      </button>

      {/* TENANT DROPDOWN */}

      {open && (
        <div
          className="
            absolute
            right-0
            z-[70]
            mt-2
            w-full
            min-w-[300px]
            overflow-hidden
            rounded-xl
            border
            border-gray-200
            bg-white
            shadow-xl
          "
        >
          {/* DROPDOWN HEADER */}

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-gray-100
              px-3
              py-2.5
            "
          >
            <div>
              <p className="text-xs font-black text-[#0B1F3A]">
                Select Tenant
              </p>

              <p className="mt-0.5 text-[11px] text-gray-400">
                Changes the active admin context
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void refreshTenants()
              }
              disabled={loadingTenants}
              aria-label="Refresh tenants"
              className="
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-lg
                text-gray-400
                transition
                hover:bg-orange-50
                hover:text-[#FF6900]
                disabled:opacity-50
              "
            >
              <RefreshCcw
                size={15}
                className={
                  loadingTenants
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>

          {/* ERROR */}

          {tenantError ? (
            <div
              className="
                m-3
                rounded-lg
                border
                border-red-200
                bg-red-50
                p-3
                text-xs
                leading-5
                text-red-700
              "
            >
              {tenantError}
            </div>
          ) : null}

          {/* TENANT LIST */}

          <div className="max-h-72 overflow-y-auto p-2">
            {tenants.length > 0 ? (
              tenants.map(
                (tenant) => {
                  const tenantId =
                    tenant._id ||
                    tenant.tenantId ||
                    "";

                  const active =
                    tenantId ===
                    selectedTenantId;

                  return (
                    <button
                      key={tenantId}
                      type="button"
                      onClick={() => {
                        selectTenant(
                          tenantId,
                        );

                        setOpen(false);
                      }}
                      className={`
                        flex
                        w-full
                        items-center
                        justify-between
                        gap-3
                        rounded-lg
                        px-3
                        py-3
                        text-left
                        transition

                        ${
                          active
                            ? "bg-orange-50"
                            : "hover:bg-gray-50"
                        }
                      `}
                    >
                      <span className="min-w-0">
                        <span
                          className="
                            block
                            truncate
                            text-sm
                            font-black
                            text-[#0B1F3A]
                          "
                        >
                          {tenant.storeName ||
                            tenant.businessName ||
                            "Unnamed Tenant"}
                        </span>

                        <span
                          className="
                            mt-1
                            block
                            truncate
                            text-xs
                            text-gray-400
                          "
                        >
                          {tenant.tenantCode ||
                            tenant.ownerEmail ||
                            tenantId}
                        </span>
                      </span>

                      {active && (
                        <Check
                          size={17}
                          className="shrink-0 text-[#FF6900]"
                        />
                      )}
                    </button>
                  );
                },
              )
            ) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-bold text-gray-600">
                  No active tenants found
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}