"use client";

import { useEffect, useState } from "react";
import {
  Save,
  Store,
  Phone,
  Mail,
  MapPin,
  Globe,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from "lucide-react";

type SettingsForm = {
  storeName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  website: string;
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
  const [form, setForm] = useState<SettingsForm>(initialSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const token = localStorage.getItem("townmelaAdminToken");

        const tenantId =
          localStorage.getItem("tenantId") ||
          localStorage.getItem("tenant_id") ||
          localStorage.getItem("activeTenantId");

        /*
          Settings API তৈরি থাকলে নিচের endpoint ব্যবহার হবে।
          API এখনো না থাকলেও page error ছাড়াই খুলবে।
        */

        if (!token) {
          setIsLoading(false);
          return;
        }

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

        const response = await fetch(`${apiUrl}/api/settings`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
          },
        });

        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        const settings =
          data?.settings ||
          data?.data ||
          data?.result ||
          data;

        if (settings && typeof settings === "object") {
          setForm((previous) => ({
            ...previous,
            storeName: settings.storeName || "",
            tagline: settings.tagline || "",
            email: settings.email || "",
            phone: settings.phone || "",
            whatsapp: settings.whatsapp || "",
            address: settings.address || "",
            website: settings.website || "",
            facebook: settings.facebook || "",
            instagram: settings.instagram || "",
            logoUrl: settings.logoUrl || settings.logo || "",
            footerText: settings.footerText || "",
          }));
        }
      } catch (error) {
        console.error("Settings load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      setSuccessMessage("");
      setErrorMessage("");

      const token = localStorage.getItem("townmelaAdminToken");

      const tenantId =
        localStorage.getItem("tenantId") ||
        localStorage.getItem("tenant_id") ||
        localStorage.getItem("activeTenantId");

      if (!token) {
        setErrorMessage("Admin token পাওয়া যায়নি। আবার login করুন।");
        return;
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const response = await fetch(`${apiUrl}/api/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Settings save করা সম্ভব হয়নি।"
        );
      }

      setSuccessMessage("Settings successfully saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Settings save করা সম্ভব হয়নি।"
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
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Store Settings
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Update your store information, branding and footer details.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Store className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Basic Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Main information displayed across your store.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <InputField
                label="Store Name"
                name="storeName"
                value={form.storeName}
                onChange={handleChange}
                placeholder="Enter store name"
                icon={<Store className="h-4 w-4" />}
              />

              <InputField
                label="Store Tagline"
                name="tagline"
                value={form.tagline}
                onChange={handleChange}
                placeholder="Enter store tagline"
                icon={<Globe className="h-4 w-4" />}
              />

              <InputField
                label="Email Address"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="store@example.com"
                icon={<Mail className="h-4 w-4" />}
              />

              <InputField
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                icon={<Phone className="h-4 w-4" />}
              />

              <InputField
                label="WhatsApp Number"
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="Enter WhatsApp number"
                icon={<Phone className="h-4 w-4" />}
              />

              <InputField
                label="Website URL"
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="https://yourstore.com"
                icon={<Globe className="h-4 w-4" />}
              />

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Store Address
                </label>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter complete store address"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <ImageIcon className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Branding
                  </h2>
                  <p className="text-sm text-slate-500">
                    Configure your store logo and branding information.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div>
                <InputField
                  label="Logo URL"
                  name="logoUrl"
                  value={form.logoUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                  icon={<ImageIcon className="h-4 w-4" />}
                />
              </div>

              <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="Store logo preview"
                    className="max-h-20 max-w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                    <p className="text-xs text-slate-500">
                      Logo preview will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="font-semibold text-slate-900">
                Social Media
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add your business social profile links.
              </p>
            </div>

          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h2 className="font-semibold text-slate-900">
                Footer Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                This information will appear in your website footer.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Footer Text
              </label>

              <textarea
                name="footerText"
                value={form.footerText}
                onChange={handleChange}
                rows={4}
                placeholder="Example: © 2026 Your Store. All rights reserved."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </section>

          <div className="sticky bottom-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
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
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
          placeholder={placeholder}
          className={`w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${
            icon ? "pl-10" : "pl-4"
          }`}
        />
      </div>
    </div>
  );
}