"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  Store,
} from "lucide-react";

type SettingsForm = {
  storeName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  website: string;

  /*
   * Kept in the settings payload for backward compatibility.
   * These are no longer edited from this page because their
   * UI now belongs to Header / Footer Management.
   */
  facebook: string;
  instagram: string;
  logoUrl: string;
  footerText: string;
};

const initialSettings: SettingsForm = {
  storeName: "",
  tagline: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  website: "",

  facebook: "",
  instagram: "",
  logoUrl: "",
  footerText: "",
};

export default function SettingsPage() {
  const [form, setForm] =
    useState<SettingsForm>(
      initialSettings,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  useEffect(() => {
    const loadSettings =
      async () => {
        try {
          setIsLoading(true);
          setErrorMessage("");

          const token =
            localStorage.getItem(
              "townmelaAdminToken",
            );

          const tenantId =
            localStorage.getItem(
              "tenantId",
            ) ||
            localStorage.getItem(
              "tenant_id",
            ) ||
            localStorage.getItem(
              "activeTenantId",
            );

          /*
           * Settings API থাকলে এই endpoint ব্যবহার হবে।
           * API না থাকলেও page error ছাড়াই খুলবে।
           */
          if (!token) {
            setIsLoading(false);
            return;
          }

          const apiUrl =
            process.env
              .NEXT_PUBLIC_API_URL ||
            "http://localhost:5000";

          const response =
            await fetch(
              `${apiUrl}/api/settings`,
              {
                method: "GET",
                credentials:
                  "include",
                cache: "no-store",

                headers: {
                  Authorization:
                    `Bearer ${token}`,

                  ...(tenantId
                    ? {
                        "X-Tenant-Id":
                          tenantId,
                      }
                    : {}),
                },
              },
            );

          if (!response.ok) {
            setIsLoading(false);
            return;
          }

          const data =
            await response.json();

          const settings =
            data?.settings ||
            data?.data ||
            data?.result ||
            data;

          if (
            settings &&
            typeof settings ===
              "object"
          ) {
            setForm(
              (previous) => ({
                ...previous,

                storeName:
                  settings.storeName ||
                  "",

                tagline:
                  settings.tagline ||
                  "",

                email:
                  settings.email ||
                  "",

                phone:
                  settings.phone ||
                  "",

                whatsapp:
                  settings.whatsapp ||
                  "",

                address:
                  settings.address ||
                  "",

                website:
                  settings.website ||
                  "",

                /*
                 * Preserve existing values even though
                 * these fields are no longer displayed
                 * on this page.
                 */
                facebook:
                  settings.facebook ||
                  "",

                instagram:
                  settings.instagram ||
                  "",

                logoUrl:
                  settings.logoUrl ||
                  settings.logo ||
                  "",

                footerText:
                  settings.footerText ||
                  "",
              }),
            );
          }
        } catch (error) {
          console.error(
            "Settings load error:",
            error,
          );
        } finally {
          setIsLoading(false);
        }
      };

    void loadSettings();
  }, []);

  const handleChange = (
    event:
      React.ChangeEvent<
        | HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      }),
    );

    setSuccessMessage("");
  };

  const handleSave = async (
    event:
      React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setSuccessMessage("");
      setErrorMessage("");

      const token =
        localStorage.getItem(
          "townmelaAdminToken",
        );

      const tenantId =
        localStorage.getItem(
          "tenantId",
        ) ||
        localStorage.getItem(
          "tenant_id",
        ) ||
        localStorage.getItem(
          "activeTenantId",
        );

      if (!token) {
        setErrorMessage(
          "Admin token পাওয়া যায়নি। আবার login করুন।",
        );

        return;
      }

      const apiUrl =
        process.env
          .NEXT_PUBLIC_API_URL ||
        "http://localhost:5000";

      const response =
        await fetch(
          `${apiUrl}/api/settings`,
          {
            method: "PATCH",
            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,

              ...(tenantId
                ? {
                    "X-Tenant-Id":
                      tenantId,
                  }
                : {}),
            },

            /*
             * Keep the existing settings payload shape.
             * Hidden legacy fields are preserved so this
             * UI cleanup does not break an existing API.
             */
            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const data =
        await response
          .json()
          .catch(
            () => null,
          );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Settings save করা সম্ভব হয়নি।",
        );
      }

      setSuccessMessage(
        "Settings successfully saved.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Settings save করা সম্ভব হয়নি।",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />

          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Store Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your store&apos;s
            general business
            information.
          </p>
        </div>

        {/* =================================================
            MANAGEMENT NOTICE
        ================================================= */}

        <section className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                Header and footer
                settings are managed
                separately.
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Store logo,
                announcement/contact
                bar and footer branding,
                social links, footer
                menus and copyright are
                managed from their own
                management pages.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/header-management"
                className="inline-flex items-center justify-center rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-[#FF6900]"
              >
                Header Management
              </Link>

              <Link
                href="/admin/footer-management"
                className="inline-flex items-center justify-center rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102B50]"
              >
                Footer Management
              </Link>
            </div>
          </div>
        </section>

        {successMessage && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />

            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={
            handleSave
          }
          className="space-y-6"
        >
          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Store className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Basic
                    Information
                  </h2>

                  <p className="text-sm text-slate-500">
                    Main business
                    information for this
                    store.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <InputField
                label="Store Name"
                name="storeName"
                value={
                  form.storeName
                }
                onChange={
                  handleChange
                }
                placeholder="Enter store name"
                icon={
                  <Store className="h-4 w-4" />
                }
              />

              <InputField
                label="Store Tagline"
                name="tagline"
                value={
                  form.tagline
                }
                onChange={
                  handleChange
                }
                placeholder="Enter store tagline"
                icon={
                  <Globe className="h-4 w-4" />
                }
              />

              <InputField
                label="Email Address"
                name="email"
                type="email"
                value={
                  form.email
                }
                onChange={
                  handleChange
                }
                placeholder="store@example.com"
                icon={
                  <Mail className="h-4 w-4" />
                }
              />

              <InputField
                label="Phone Number"
                name="phone"
                value={
                  form.phone
                }
                onChange={
                  handleChange
                }
                placeholder="Enter phone number"
                icon={
                  <Phone className="h-4 w-4" />
                }
              />

              <InputField
                label="WhatsApp Number"
                name="whatsapp"
                value={
                  form.whatsapp
                }
                onChange={
                  handleChange
                }
                placeholder="Enter WhatsApp number"
                icon={
                  <Phone className="h-4 w-4" />
                }
              />

              <InputField
                label="Website URL"
                name="website"
                value={
                  form.website
                }
                onChange={
                  handleChange
                }
                placeholder="https://yourstore.com"
                icon={
                  <Globe className="h-4 w-4" />
                }
              />

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Store Address
                </label>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

                  <textarea
                    name="address"
                    value={
                      form.address
                    }
                    onChange={
                      handleChange
                    }
                    rows={4}
                    placeholder="Enter complete store address"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              SAVE
          ================================================= */}

          <div className="sticky bottom-4 flex justify-end">
            <button
              type="submit"
              disabled={
                isSaving
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type InputFieldProps = {
  label: string;
  name: keyof SettingsForm;
  value: string;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;

  onChange: (
    event:
      React.ChangeEvent<
        | HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => void;
};

function InputField({
  label,
  name,
  value,
  placeholder,
  type = "text",
  icon,
  onChange,
}: InputFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={
            placeholder
          }
          className={`w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${
            icon
              ? "pl-10"
              : "pl-4"
          }`}
        />
      </div>
    </div>
  );
}