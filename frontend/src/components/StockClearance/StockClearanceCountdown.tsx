"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type StockClearanceCountdownProps = {
  target: string;
  label: string;
  compact?: boolean;
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
      (totalSeconds %
        86400) /
        3600,
    );

  const minutes =
    Math.floor(
      (totalSeconds %
        3600) /
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

export default function StockClearanceCountdown({
  target,
  label,
  compact = false,
  onComplete,
}: StockClearanceCountdownProps) {
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
          label: "Days",
          value:
            pad(
              remaining.days,
            ),
        },
        {
          label: "Hrs",
          value:
            pad(
              remaining.hours,
            ),
        },
        {
          label: "Min",
          value:
            pad(
              remaining.minutes,
            ),
        },
        {
          label: "Sec",
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
    <div
      className={
        compact
          ? "flex flex-col items-center gap-1.5"
          : "flex flex-col items-center gap-3"
      }
    >
      <p
        className={
          compact
            ? "text-[12px] font-extrabold uppercase tracking-[0.12em] text-white"
            : "text-sm font-extrabold uppercase tracking-[0.16em] text-[#FF6900]"
        }
      >
        {label}
      </p>

      <div
        className={
          compact
            ? "flex items-center justify-center gap-1.5"
            : "flex flex-wrap items-center justify-center gap-2"
        }
      >
        {items.map(
          (
            item,
            index,
          ) => (
            <div
              key={
                item.label
              }
              className="flex items-center gap-1"
            >
              <div
                className={
                  compact
                    ? "min-w-[44px] rounded-lg bg-white px-2 py-1.5 text-center shadow-sm"
                    : "min-w-[66px] rounded-xl border border-orange-100 bg-white px-3 py-2 text-center shadow-sm"
                }
              >
                <div
                  className={
                    compact
                      ? "text-[18px] font-black leading-none tabular-nums text-[#FF6900]"
                      : "text-xl font-black tabular-nums text-[#0B1F3A]"
                  }
                >
                  {
                    item.value
                  }
                </div>

                {!compact && (
                  <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    {
                      item.label
                    }
                  </div>
                )}
              </div>

              {index <
                items.length -
                  1 && (
                <span
                  className={
                    compact
                      ? "text-lg font-black leading-none text-white"
                      : "font-black text-[#FF6900]"
                  }
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
