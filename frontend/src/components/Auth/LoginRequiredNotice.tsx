"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LogIn,
  ShieldCheck,
  ShoppingCart,
  X,
} from "lucide-react";

export default function LoginRequiredNotice() {
  const [isOpen, setIsOpen] =
    useState(false);

  useEffect(() => {
    const openNotice = () => {
      setIsOpen(true);
    };

    window.addEventListener(
      "login-required",
      openNotice,
    );

    return () => {
      window.removeEventListener(
        "login-required",
        openNotice,
      );
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          setIsOpen(false);
        }
      }}
    >
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[15px] border border-white/20 bg-white">
        {/* Decorative Background */}

        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#FF6900]/15 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[#172033]/10 blur-3xl" />

        {/* Close Button */}

        <button
          type="button"
          onClick={() =>
            setIsOpen(false)
          }
          aria-label="Close notice"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:rotate-90 hover:bg-red-50 hover:text-red-500"
        >
          <X size={19} />
        </button>

        <div className="relative z-10 px-6 pb-7 pt-9 text-center sm:px-9 sm:pb-9 sm:pt-11">
          {/* Icon */}

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-[#FF6900] to-[#e95600] text-white">
            <ShoppingCart size={34} />
          </div>

          {/* Text */}

          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
            <ShieldCheck size={15} />

            Secure Shopping
          </span>

          <h2
            id="login-required-title"
            className="mt-5 text-2xl font-black leading-tight text-[#172033] sm:text-3xl"
          >
            Login প্রয়োজন!
          </h2>

          <p className="mx-auto mt-3 max-w-[350px] text-sm font-medium leading-7 text-gray-500 sm:text-base">
            Cart এ Product যোগ করার জন্য অনুগ্রহ করে TownMela অ্যাকাউন্টে Login করুন।
          </p>

          {/* Buttons */}

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setIsOpen(false)
              }
              className="order-2 flex h-13 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 py-3.5 text-sm font-bold text-gray-600 transition hover:border-[#FF6900] hover:bg-orange-50 hover:text-[#FF6900] sm:order-1"
            >
              Login Later
            </button>

            <Link
              href="/login"
              onClick={() =>
                setIsOpen(false)
              }
              className="order-1 flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#FF6900] px-5 py-3.5 text-sm font-bold text-white  transition hover:-translate-y-0.5 hover:bg-[#e85f00] sm:order-2"
            >
              <LogIn size={18} />

              Login করুন
            </Link>
          </div>

          <p className="mt-5 text-xs font-medium leading-5 text-gray-400">
            আপনার তথ্য নিরাপদ এবং
            সুরক্ষিত থাকবে।
          </p>
        </div>
      </div>
    </div>
  );
}