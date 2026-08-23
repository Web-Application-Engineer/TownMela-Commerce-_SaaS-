"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

const API = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

const token = () =>
  typeof window === "undefined"
    ? ""
    : localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      "";

type TenantForm = {
  businessName: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: string;
};

type TenantData = {
  _id?: string;
  id?: string;
  tenantCode?: string;
  businessName?: string;
  storeName?: string;
  slug?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  status?: string;
  isDefaultTenant?: boolean;
};

const normalizeTenantIdentity = (
  value?: string
) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isTownMelaFallback = (
  tenant: TenantData
) =>
  [
    tenant.storeName,
    tenant.businessName,
    tenant.slug,
  ].some(
    (value) =>
      normalizeTenantIdentity(
        value
      ) === "townmela"
  );

const extractTenant = (
  payload: any
): TenantData => {
  return (
    payload?.data?.tenant ||
    payload?.tenant ||
    payload?.data ||
    payload ||
    {}
  );
};

export default function EditTenantPage() {
  const params =
    useParams<{
      tenantId: string;
    }>();

  const tenantId =
    params?.tenantId;

  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    isDefaultTenant,
    setIsDefaultTenant,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<TenantForm>({
    businessName: "",
    storeName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    status: "active",
  });

  useEffect(() => {
    let cancelled = false;

    const loadTenant =
      async () => {
        try {
          setLoading(true);
          setError("");

          const authToken =
            token();

          if (!authToken) {
            throw new Error(
              "Authentication token not found. Please log in again."
            );
          }

          const response =
            await fetch(
              `${API}/api/tenants/${tenantId}`,
              {
                headers: {
                  Accept:
                    "application/json",

                  Authorization:
                    `Bearer ${authToken}`,
                },

                credentials:
                  "include",

                cache:
                  "no-store",
              }
            );

          const payload =
            await response
              .json()
              .catch(
                () => null
              );

          if (!response.ok) {
            throw new Error(
              payload?.message ||
                "Failed to load tenant."
            );
          }

          const tenant =
            extractTenant(
              payload
            );

          const defaultTenant =
            tenant.isDefaultTenant ===
              true ||
            isTownMelaFallback(
              tenant
            );

          if (cancelled) {
            return;
          }

          setIsDefaultTenant(
            defaultTenant
          );

          setForm({
            businessName:
              tenant.businessName ||
              "",

            storeName:
              tenant.storeName ||
              "",

            ownerName:
              tenant.ownerName ||
              "",

            ownerEmail:
              tenant.ownerEmail ||
              "",

            ownerPhone:
              tenant.ownerPhone ||
              "",

            /*
             * Default TownMela is always Active.
             * Other tenants keep their existing status value.
             */
            status:
              defaultTenant
                ? "active"
                : tenant.status ||
                  "active",
          });
        } catch (
          requestError
        ) {
          if (cancelled) {
            return;
          }

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Failed to load tenant."
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    if (tenantId) {
      void loadTenant();
    } else {
      setLoading(false);
      setError(
        "Tenant ID is missing."
      );
    }

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const change = (
    event: ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    /*
     * Even if a browser/client attempts to change the field,
     * the default TownMela tenant remains active.
     */
    if (
      isDefaultTenant &&
      name === "status"
    ) {
      return;
    }

    setForm(
      (current) => ({
        ...current,
        [name]:
          value,
      })
    );
  };

  const submit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      const authToken =
        token();

      if (!authToken) {
        throw new Error(
          "Authentication token not found. Please log in again."
        );
      }

      const payload = {
        ...form,

        /*
         * TownMela status is fixed.
         * The backend also independently enforces this rule.
         */
        status:
          isDefaultTenant
            ? "active"
            : form.status,
      };

      const response =
        await fetch(
          `${API}/api/tenants/${tenantId}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Bearer ${authToken}`,
            },

            credentials:
              "include",

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Update failed"
        );
      }

      router.push(
        `/admin/tenants/${tenantId}`
      );

      router.refresh();
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Update failed"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        Loading...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Edit Tenant
      </h1>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6"
      >
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        ) : null}

        {[
          [
            "businessName",
            "Business Name",
          ],
          [
            "storeName",
            "Store Name",
          ],
          [
            "ownerName",
            "Owner Name",
          ],
          [
            "ownerEmail",
            "Owner Email",
          ],
          [
            "ownerPhone",
            "Owner Phone",
          ],
        ].map(
          ([
            name,
            label,
          ]) => (
            <div key={name}>
              <label className="mb-2 block text-sm font-semibold">
                {label}
              </label>

              <input
                name={name}
                required
                type={
                  name ===
                  "ownerEmail"
                    ? "email"
                    : "text"
                }
                value={
                  form[
                    name as keyof TenantForm
                  ]
                }
                onChange={
                  change
                }
                className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Status
          </label>

          {isDefaultTenant ? (
            <>
              <div className="flex min-h-[50px] w-full items-center rounded-xl border bg-slate-50 px-4 py-3 font-medium text-emerald-700">
                Active
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Default TownMela tenant status is always Active.
              </p>
            </>
          ) : (
            <select
              name="status"
              value={
                form.status
              }
              onChange={
                change
              }
              className="w-full rounded-xl border px-4 py-3"
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

              <option value="suspended">
                Suspended
              </option>
            </select>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="rounded-xl border px-6 py-3 font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
