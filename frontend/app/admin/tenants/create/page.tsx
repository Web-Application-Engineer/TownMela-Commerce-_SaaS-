"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

const token = () =>
  typeof window === "undefined"
    ? ""
    : localStorage.getItem("townmelaAdminToken") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      "";

export default function CreateTenantPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    storeName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    temporaryPassword: "",
  });

  const change = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((currentForm) => ({
      ...currentForm,
      [event.target.name]:
        event.target.value,
    }));
  };

  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const adminToken = token();

      if (!adminToken) {
        throw new Error(
          "Authentication token not found. Please log in again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/api/tenants`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",

            Authorization:
              `Bearer ${adminToken}`,
          },

          credentials: "include",

          body: JSON.stringify({
            businessName:
              form.businessName.trim(),

            storeName:
              form.storeName.trim(),

            ownerName:
              form.ownerName.trim(),

            ownerEmail:
              form.ownerEmail.trim(),

            ownerPhone:
              form.ownerPhone.trim(),

            temporaryPassword:
              form.temporaryPassword,
          }),
        },
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Failed to create tenant",
        );
      }

      router.push("/admin/tenants");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create tenant",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-2 text-3xl font-bold">
        Create Tenant
      </h1>

      <p className="mb-6 text-slate-500">
        Every tenant receives the Standard plan with a 7-day trial.
      </p>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border bg-white p-6"
      >
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {[
          [
            "businessName",
            "Business Name",
            "text",
          ],
          [
            "storeName",
            "Store Name",
            "text",
          ],
          [
            "ownerName",
            "Owner Name",
            "text",
          ],
          [
            "ownerEmail",
            "Owner Email",
            "email",
          ],
          [
            "ownerPhone",
            "Owner Phone",
            "text",
          ],
          [
            "temporaryPassword",
            "Temporary Password",
            "password",
          ],
        ].map(([name, label, type]) => (
          <div key={name}>
            <label className="mb-2 block text-sm font-semibold">
              {label}
            </label>

            <input
              required
              name={name}
              type={type}
              value={
                form[
                  name as keyof typeof form
                ]
              }
              onChange={change}
              minLength={
                name ===
                "temporaryPassword"
                  ? 6
                  : undefined
              }
              autoComplete={
                name ===
                "temporaryPassword"
                  ? "new-password"
                  : undefined
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        ))}

        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <b>Subscription Preview</b>

          <ul className="ml-5 mt-2 list-disc">
            <li>Plan: Standard</li>
            <li>Free Trial: 7 Days</li>
            <li>Status: trial</li>
            <li>Tenant Status: active</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {loading
            ? "Creating..."
            : "Create Tenant"}
        </button>
      </form>
    </main>
  );
}