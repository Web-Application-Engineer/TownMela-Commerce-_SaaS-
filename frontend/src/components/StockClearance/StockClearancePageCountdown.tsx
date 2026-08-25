"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type StockClearancePageCountdownProps = {
  target: string;

  label?: string;

  onComplete?: () => void;
};

const getRemainingTime = (
  target: string,
) => {
  const targetTime =
    new Date(
      target,
    ).getTime();

  const difference =
    Math.max(
      0,
      targetTime -
        Date.now(),
    );

  const totalSeconds =
    Math.floor(
      difference /
        1000,
    );

  const days =
    Math.floor(
      totalSeconds /
        86400,
    );

  const hours =
    Math.floor(
      (
        totalSeconds %
        86400
      ) /
        3600,
    );

  const minutes =
    Math.floor(
      (
        totalSeconds %
        3600
      ) /
        60,
    );

  const seconds =
    totalSeconds %
    60;

  return {
    difference,
    days,
    hours,
    minutes,
    seconds,
  };
};

const pad = (
  value: number,
) =>
  String(
    value,
  ).padStart(
    2,
    "0",
  );

export default function StockClearancePageCountdown({
  target,
  label = "ENDS IN",
  onComplete,
}: StockClearancePageCountdownProps) {
  const [
    remaining,
    setRemaining,
  ] =
    useState(() =>
      getRemainingTime(
        target,
      ),
    );

  useEffect(() => {
    setRemaining(
      getRemainingTime(
        target,
      ),
    );

    const timer =
      window.setInterval(
        () => {
          const next =
            getRemainingTime(
              target,
            );

          setRemaining(
            next,
          );

          if (
            next.difference <=
            0
          ) {
            window.clearInterval(
              timer,
            );

            onComplete?.();
          }
        },
        1000,
      );

    return () => {
      window.clearInterval(
        timer,
      );
    };
  }, [
    target,
    onComplete,
  ]);

  const items =
    useMemo(
      () => [
        {
          label:
            "DAYS",

          value:
            pad(
              remaining.days,
            ),
        },
        {
          label:
            "HRS",

          value:
            pad(
              remaining.hours,
            ),
        },
        {
          label:
            "MIN",

          value:
            pad(
              remaining.minutes,
            ),
        },
        {
          label:
            "SEC",

          value:
            pad(
              remaining.seconds,
            ),
        },
      ],
      [
        remaining,
      ],
    );

  return (
    <div className="flex flex-col items-center">
      <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#FF6900] sm:text-xs">
        {label}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {items.map(
          (
            item,
            index,
          ) => (
            <div
              key={
                item.label
              }
              className="flex items-center gap-2 sm:gap-3"
            >
              <div className="min-w-[64px] rounded-2xl border border-orange-100 bg-[#FFF8F2] px-3 py-3 text-center shadow-sm sm:min-w-[76px] sm:px-4 sm:py-3.5">
                <div className="text-[26px] font-black leading-none tabular-nums text-[#0B1F3A] sm:text-[34px]">
                  {
                    item.value
                  }
                </div>

                <div className="mt-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-[10px]">
                  {
                    item.label
                  }
                </div>
              </div>

              {index <
                items.length -
                  1 && (
                <span className="text-[24px] font-black leading-none text-[#FF6900] sm:text-[30px]">
                  :
                </span>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
