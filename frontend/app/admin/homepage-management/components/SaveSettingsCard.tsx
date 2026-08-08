"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type SaveStatus =
  | "idle"
  | "saving"
  | "success"
  | "error";

/* =========================================================
   PROPS
========================================================= */

type SaveSettingsCardProps = {
  onSave?: () => void | Promise<void>;
  disabled?: boolean;
};

/* =========================================================
   SAVE SETTINGS CARD
========================================================= */

export default function SaveSettingsCard({
  onSave,
  disabled = false,
}: SaveSettingsCardProps) {
  /* =======================================================
     STATES
  ======================================================= */

  const [
    saveStatus,
    setSaveStatus,
  ] = useState<SaveStatus>("idle");

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  /* =======================================================
     STATUS RESET
  ======================================================= */

  useEffect(() => {
    if (
      saveStatus !== "success" &&
      saveStatus !== "error"
    ) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        setSaveStatus("idle");
        setStatusMessage("");
      },
      4000
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveStatus]);

  /* =======================================================
     SAVE SETTINGS
  ======================================================= */

  const handleSaveSettings =
    async () => {
      if (
        disabled ||
        saveStatus === "saving"
      ) {
        return;
      }

      try {
        setSaveStatus("saving");
        setStatusMessage(
          "Saving homepage settings..."
        );

        if (onSave) {
          await onSave();
        } else {
          await new Promise<void>(
            (resolve) => {
              window.setTimeout(
                resolve,
                700
              );
            }
          );
        }

        setSaveStatus("success");
        setStatusMessage(
          "Homepage settings saved successfully."
        );
      } catch (error) {
        console.error(
          "Failed to save homepage settings:",
          error
        );

        setSaveStatus("error");
        setStatusMessage(
          "Unable to save homepage settings. Please try again."
        );
      }
    };

  /* =======================================================
     STATUS VALUES
  ======================================================= */

  const isSaving =
    saveStatus === "saving";

  const isSuccess =
    saveStatus === "success";

  const isError =
    saveStatus === "error";

  const isButtonDisabled =
    disabled || isSaving;

  /* =======================================================
     COMPONENT UI
  ======================================================= */

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-green-50/70 via-white to-white">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          {/* =================================================
              INFORMATION
          ================================================= */}

          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isError
                  ? "bg-red-50 text-red-600"
                  : isSuccess
                    ? "bg-green-100 text-green-700"
                    : "bg-green-50 text-green-700"
              }`}
            >
              {isError ? (
                <AlertCircle size={22} />
              ) : (
                <CheckCircle2 size={22} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-[#0B1F3A]">
                  Save Homepage Settings
                </h2>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    isSuccess
                      ? "bg-green-100 text-green-700"
                      : isError
                        ? "bg-red-100 text-red-600"
                        : isSaving
                          ? "bg-orange-100 text-[#FF6900]"
                          : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isSuccess
                    ? "Saved"
                    : isError
                      ? "Failed"
                      : isSaving
                        ? "Saving"
                        : "Ready"}
                </span>
              </div>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                Save all homepage banner,
                popular category and category
                showcase configuration changes.
              </p>

              {statusMessage && (
                <div
                  role={
                    isError
                      ? "alert"
                      : "status"
                  }
                  aria-live="polite"
                  className={`mt-3 flex items-center gap-2 text-xs font-bold ${
                    isError
                      ? "text-red-600"
                      : isSuccess
                        ? "text-green-700"
                        : "text-[#FF6900]"
                  }`}
                >
                  {isSaving && (
                    <LoaderCircle
                      size={14}
                      className="animate-spin"
                    />
                  )}

                  {isSuccess && (
                    <CheckCircle2
                      size={14}
                    />
                  )}

                  {isError && (
                    <AlertCircle
                      size={14}
                    />
                  )}

                  <span>
                    {statusMessage}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* =================================================
              SAVE BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={
              handleSaveSettings
            }
            disabled={
              isButtonDisabled
            }
            aria-busy={isSaving}
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-[#e85f00] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-orange-300 disabled:shadow-none sm:w-fit"
          >
            {isSaving ? (
              <>
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />

                Saving Settings...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2
                  size={18}
                />

                Settings Saved
              </>
            ) : (
              <>
                <Save size={18} />

                Save Homepage Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===================================================
          FOOTER INFORMATION
      =================================================== */}

      <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Review all sections before saving
          your homepage configuration.
        </p>

        <span className="w-fit rounded-full border border-gray-200 bg-white px-3 py-1 font-bold text-[#0B1F3A]">
          Homepage Configuration
        </span>
      </div>
    </section>
  );
}