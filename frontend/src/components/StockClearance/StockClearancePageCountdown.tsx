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
    <div className="flex w-full min-w-0 flex-col items-center">
      <div className="inline-flex max-w-full items-center justify-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#FF6900] min-[390px]:px-4 min-[390px]:text-[10px] min-[390px]:tracking-[0.2em] sm:text-xs sm:tracking-[0.22em]">
        {label}
      </div>

      <div className="mt-3 grid w-full max-w-[430px] grid-cols-4 gap-1.5 min-[390px]:gap-2 sm:mt-4 sm:gap-3">
        {items.map(
          (
            item,
            index,
          ) => (
            <div
              key={
                item.label
              }
              className="relative min-w-0"
            >
              <div className="w-full min-w-0 rounded-xl border border-orange-100 bg-[#FFF8F2] px-1 py-2.5 text-center shadow-sm min-[390px]:rounded-2xl min-[390px]:px-2 min-[390px]:py-3 sm:px-3 sm:py-3.5">
                <div className="text-[20px] font-black leading-none tabular-nums text-[#0B1F3A] min-[390px]:text-[24px] sm:text-[34px]">
                  {
                    item.value
                  }
                </div>

                <div className="mt-1.5 truncate text-[7px] font-black uppercase tracking-[0.08em] text-slate-500 min-[390px]:text-[8px] min-[390px]:tracking-[0.12em] sm:text-[10px] sm:tracking-[0.16em]">
                  {
                    item.label
                  }
                </div>
              </div>

              {index <
                items.length -
                  1 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-[6px] top-1/2 z-10 -translate-y-1/2 text-[16px] font-black leading-none text-[#FF6900] min-[390px]:-right-[7px] min-[390px]:text-[18px] sm:-right-[9px] sm:text-[28px]"
                >
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
