"use client";

import Link from "next/link";

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

export default function StockClearanceHeroTimer() {
  const [
    campaign,
    setCampaign,
  ] =
    useState<
      StockClearanceCampaign |
      null
    >(null);

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

          const currentHostname =
            typeof window !== "undefined"
              ? window.location.hostname
              : "";

          const isLocalRequest =
            [
              "localhost",
              "127.0.0.1",
              "::1",
            ].includes(
              currentHostname,
            );

          if (
            isLocalRequest &&
            TENANT_ID
          ) {
            headers[
              "X-Tenant-Id"
            ] =
              TENANT_ID;
          }

          const stockClearanceApiBaseUrl =
            typeof window !== "undefined" &&
            !isLocalRequest
              ? window.location.origin
              : API_BASE_URL;

          const response =
            await fetch(
              `${stockClearanceApiBaseUrl}/api/stock-clearance`,
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

          if (
            response.ok &&
            data?.success
          ) {
            setCampaign(
              data.campaign,
            );
          }
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
              "Stock clearance timer loading error:",
              error,
            );
          }
        }
      };

    void load();

    return () => {
      controller.abort();
    };
  }, []);

  if (
    !campaign ||
    campaign.status !==
      "live" ||
    !campaign.timerEnabled ||
    !campaign.endsAt
  ) {
    return null;
  }

  return (
    <Link
      href="/stock-clearance"
      className="absolute inset-0 z-40 block"
      aria-label={`Open ${campaign.name}`}
    >
      <div className="absolute bottom-1 left-1 right-1 rounded-xl border-2 border-amber-300 bg-[#0B1F3A]/94 px-2 py-1.5 text-center shadow-xl backdrop-blur-sm">
        <p className="stock-clearance-heading-shimmer mb-1.5 truncate text-[20px] font-black uppercase tracking-[0.12em]">
          {
            campaign.name
          }
        </p>

        <StockClearanceCountdown
          target={
            campaign.endsAt
          }
          label=""
          compact
          onComplete={() => {
            window.location.reload();
          }}
        />
      </div>

      <style>
        {`
          @keyframes stockClearanceHeadingShimmer {
            0% {
              background-position: 180% center;
            }

            100% {
              background-position: -80% center;
            }
          }

          .stock-clearance-heading-shimmer {
            color: #ff8a00;

            background-image:
              linear-gradient(
                105deg,
                #ff3b30 0%,
                #ff6a00 18%,
                #ffd400 36%,
                #ffffff 49%,
                #22d3ee 58%,
                #00e5ff 66%,
                #ffd400 78%,
                #ff6a00 90%,
                #ff3b30 100%
              );

            background-size:
              240% 100%;

            background-position:
              180% center;

            -webkit-background-clip:
              text;

            background-clip:
              text;

            -webkit-text-fill-color:
              transparent;

            animation:
              stockClearanceHeadingShimmer
              2.15s
              linear
              infinite;

            will-change:
              background-position;
          }

          @media (prefers-reduced-motion: reduce) {
            .stock-clearance-heading-shimmer {
              animation: none !important;

              background-image:
                none !important;

              -webkit-text-fill-color:
                #ff6a00;
            }
          }
        `}
      </style>
    </Link>
  );
}