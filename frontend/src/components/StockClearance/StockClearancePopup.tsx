"use client";

import Image from "next/image";
import Link from "next/link";

import {
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import StockClearanceCountdown from "./StockClearanceCountdown";

import type {
  StockClearanceApiResponse,
  StockClearanceCampaign,
} from "../../utils/stockClearance";

const API_BASE_URL =
  (
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:5000"
  ).replace(/\/$/, "");

const TENANT_ID =
  (
    process.env.NEXT_PUBLIC_TENANT_ID ??
    ""
  ).trim();

export default function StockClearancePopup() {
  const [
    campaign,
    setCampaign,
  ] =
    useState<
      StockClearanceCampaign |
      null
    >(null);

  const [
    visible,
    setVisible,
  ] =
    useState(false);

  useEffect(() => {
    const controller =
      new AbortController();

    const load =
      async () => {
        try {
          const headers:
            HeadersInit = {
            Accept:
              "application/json",
          };

          if (TENANT_ID) {
            headers[
              "X-Tenant-Id"
            ] =
              TENANT_ID;
          }

          const response =
            await fetch(
              `${API_BASE_URL}/api/stock-clearance`,
              {
                method:
                  "GET",

                cache:
                  "no-store",

                credentials:
                  "include",

                signal:
                  controller.signal,

                headers,
              },
            );

          const data =
            (await response
              .json()
              .catch(
                () => null,
              )) as
              | StockClearanceApiResponse
              | null;

          const activeCampaign =
            data?.success
              ? data.campaign
              : null;

          if (
            !activeCampaign ||
            activeCampaign.status !==
              "live" ||
            !activeCampaign.popupEnabled
          ) {
            return;
          }

          const storageKey =
            `townmela-stock-clearance-popup:${activeCampaign._id || activeCampaign.endsAt || activeCampaign.name}`;

          if (
            window.sessionStorage.getItem(
              storageKey,
            ) === "shown"
          ) {
            return;
          }

          setCampaign(
            activeCampaign,
          );

          const timer =
            window.setTimeout(
              () => {
                window.sessionStorage.setItem(
                  storageKey,
                  "shown",
                );

                setVisible(
                  true,
                );
              },
              1800,
            );

          return () => {
            window.clearTimeout(
              timer,
            );
          };
        } catch (error) {
          if (
            !(
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            )
          ) {
            console.error(
              "Stock clearance popup loading error:",
              error,
            );
          }
        }
      };

    let cleanup:
      | (() => void)
      | undefined;

    void load().then(
      (
        result,
      ) => {
        cleanup =
          result;
      },
    );

    return () => {
      cleanup?.();
      controller.abort();
    };
  }, []);

  if (
    !visible ||
    !campaign ||
    campaign.status !==
      "live"
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[10px] bg-white shadow-2xl">
        <button
          type="button"
          onClick={() =>
            setVisible(
              false,
            )
          }
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-black"
          aria-label="Close Stock Clearance popup"
        >
          <X size={18} />
        </button>

        <Link
          href="/stock-clearance"
          className="block"
          aria-label="Open Stock Clearance Discount"
        >
          {campaign.popupBanner ? (
            <div className="relative aspect-[16/8] w-full bg-gray-100">
              <Image
                src={
                  campaign.popupBanner
                }
                alt={
                  campaign.popupAltText ||
                  campaign.name
                }
                fill
                sizes="(max-width: 640px) 100vw, 576px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="bg-[#0B1F3A] px-5 py-10 text-center text-white">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FF6900]">
                Limited Time Offer
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {
                  campaign.name
                }
              </h2>
            </div>
          )}

          {campaign.timerEnabled &&
          campaign.endsAt ? (
            <div className="border-t border-orange-100 bg-white px-4 py-4">
              <StockClearanceCountdown
                target={
                  campaign.endsAt
                }
                label="Offer Ends In"
              />
            </div>
          ) : null}
        </Link>
      </div>
    </div>
  );
}
