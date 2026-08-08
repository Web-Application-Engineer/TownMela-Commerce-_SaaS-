"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Home,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Printer,
  ShoppingBag,
  Truck,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import RelatedProductsCarousel, {
  type RelatedProduct,
} from "@/src/components/Products/RelatedProductsCarousel";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:5000";

/* =========================================================
   TYPES
========================================================= */

type SuccessfulOrderItem = {
  productId?: string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;

  selectedSize?: string;
  selectedColor?: string;

  /*
    পুরোনো data compatibility।
  */
  size?: string;
  color?: string;
};

type SuccessfulOrderCustomer = {
  fullName?: string;
  phone?: string;
  email?: string;

  division?: string;
  district?: string;
  policeStation?: string;
  address?: string;
};

type SuccessfulShippingAddress = {
  division?: string;
  district?: string;
  area?: string;
  address?: string;
};

type SuccessfulOrderResponse = {
  _id?: string;
  orderNumber?: string;

  subtotalAmount?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  totalAmount?: number;

  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
};

type StoredSuccessfulOrder = {
  order?: SuccessfulOrderResponse | null;

  customer?: SuccessfulOrderCustomer;
  shippingAddress?: SuccessfulShippingAddress;

  items?: SuccessfulOrderItem[];

  subtotal?: number;
  deliveryCharge?: number;
  totalAmount?: number;

  paymentMethod?: string;

  guestId?: string;
  orderId?: string;
  orderNumber?: string;
};

type ProductsApiResponse =
  | RelatedProduct[]
  | {
      success?: boolean;
      products?: RelatedProduct[];
      message?: string;
    };

/* =========================================================
   HELPERS
========================================================= */

const LAST_SUCCESSFUL_ORDER_KEY =
  "lastSuccessfulOrder";

function formatPrice(value?: number) {
  const safeValue =
    Number.isFinite(value)
      ? Number(value)
      : 0;

  return `৳${safeValue.toLocaleString(
    "en-BD",
  )}`;
}

function escapeHtml(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readStoredOrder() {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        LAST_SUCCESSFUL_ORDER_KEY,
      );

    if (!storedValue) {
      return null;
    }

    return JSON.parse(
      storedValue,
    ) as StoredSuccessfulOrder;
  } catch {
    return null;
  }
}

function getDisplayAddress(
  customer?: SuccessfulOrderCustomer,
  shippingAddress?: SuccessfulShippingAddress,
) {
  const addressParts = [
    shippingAddress?.address ??
      customer?.address,
    shippingAddress?.area ??
      customer?.policeStation,
    shippingAddress?.district ??
      customer?.district,
    shippingAddress?.division ??
      customer?.division,
  ].filter(
    (
      value,
    ): value is string =>
      Boolean(value?.trim()),
  );

  return addressParts.join(", ");
}

function getCategoryId(
  category:
    | RelatedProduct["category"]
    | undefined,
) {
  if (!category) {
    return null;
  }

  if (typeof category === "string") {
    return category;
  }

  return category._id;
}

/* =========================================================
   ORDER SUCCESS CLIENT
========================================================= */

export default function OrderSuccessClient() {
  const searchParams =
    useSearchParams();

  const [
    storedOrder,
    setStoredOrder,
  ] = useState<StoredSuccessfulOrder | null>(
    null,
  );

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    relatedProducts,
    setRelatedProducts,
  ] = useState<RelatedProduct[]>(
    [],
  );

  useEffect(() => {
    setStoredOrder(
      readStoredOrder(),
    );
  }, []);

  const queryOrderNumber =
    searchParams.get("orderNumber") ??
    "";

  const queryOrderId =
    searchParams.get("orderId") ??
    "";

  const order =
    storedOrder?.order ?? null;

  const orderNumber =
    queryOrderNumber ||
    order?.orderNumber ||
    storedOrder?.orderNumber ||
    "";

  const orderId =
    queryOrderId ||
    order?._id ||
    storedOrder?.orderId ||
    "";

  const items =
    useMemo(
      () =>
        storedOrder?.items ?? [],
      [storedOrder],
    );

  /* =======================================================
     LOAD SAME-CATEGORY RELATED PRODUCTS

     Ordered products are excluded.
     Loading is delayed so the confirmation UI
     remains fast and friendly.
  ======================================================= */

  useEffect(() => {
    let isComponentActive = true;

    const loadRelatedProducts =
      async () => {
        const orderedProductIds =
          new Set(
            items
              .map(
                (item) =>
                  item.productId,
              )
              .filter(
                (
                  productId,
                ): productId is string =>
                  Boolean(productId),
              ),
          );

        if (
          orderedProductIds.size === 0
        ) {
          setRelatedProducts([]);
          return;
        }

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/products`,
            {
              method: "GET",
              cache: "no-store",

              headers: {
                Accept:
                  "application/json",
              },
            },
          );

          const data:
            ProductsApiResponse =
            await response.json();

          if (!response.ok) {
            const apiMessage =
              Array.isArray(data)
                ? undefined
                : data.message;

            throw new Error(
              apiMessage ||
                "Related products could not be loaded.",
            );
          }

          const allProducts =
            Array.isArray(data)
              ? data
              : Array.isArray(
                    data.products,
                  )
                ? data.products
                : [];

          const orderedCategoryIds =
            new Set(
              allProducts
                .filter((product) =>
                  orderedProductIds.has(
                    product._id,
                  ),
                )
                .map((product) =>
                  getCategoryId(
                    product.category,
                  ),
                )
                .filter(
                  (
                    categoryId,
                  ): categoryId is string =>
                    Boolean(categoryId),
                ),
            );

          if (
            orderedCategoryIds.size === 0
          ) {
            if (isComponentActive) {
              setRelatedProducts([]);
            }

            return;
          }

          const sameCategoryProducts =
            allProducts.filter(
              (product) => {
                if (
                  orderedProductIds.has(
                    product._id,
                  )
                ) {
                  return false;
                }

                const categoryId =
                  getCategoryId(
                    product.category,
                  );

                return (
                  Boolean(categoryId) &&
                  orderedCategoryIds.has(
                    categoryId as string,
                  )
                );
              },
            );

          if (isComponentActive) {
            setRelatedProducts(
              sameCategoryProducts,
            );
          }
        } catch (error) {
          console.error(
            "Order success related products loading error:",
            error,
          );

          if (isComponentActive) {
            setRelatedProducts([]);
          }
        }
      };

    const timeoutId =
      window.setTimeout(() => {
        void loadRelatedProducts();
      }, 500);

    return () => {
      isComponentActive = false;

      window.clearTimeout(
        timeoutId,
      );
    };
  }, [items]);

  const customer =
    storedOrder?.customer;

  const shippingAddress =
    storedOrder?.shippingAddress;

  const subtotal =
    order?.subtotalAmount ??
    storedOrder?.subtotal ??
    items.reduce(
      (totalAmount, item) =>
        totalAmount +
        Number(item.price ?? 0) *
          Number(item.quantity ?? 0),
      0,
    );

  const deliveryCharge =
    order?.deliveryCharge ??
    storedOrder?.deliveryCharge ??
    0;

  const discountAmount =
    order?.discountAmount ?? 0;

  const totalAmount =
    order?.totalAmount ??
    storedOrder?.totalAmount ??
    subtotal +
      deliveryCharge -
      discountAmount;

  const paymentMethod =
    order?.paymentMethod ??
    storedOrder?.paymentMethod ??
    "COD";

  const paymentStatus =
    order?.paymentStatus ??
    "Pending";

  const orderStatus =
    order?.orderStatus ??
    "Pending";

  const deliveryAddress =
    useMemo(
      () =>
        getDisplayAddress(
          customer,
          shippingAddress,
        ),
      [
        customer,
        shippingAddress,
      ],
    );

  const handleCopyOrderNumber =
    async () => {
      if (!orderNumber) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          orderNumber,
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1600);
      } catch {
        setCopied(false);
      }
    };

  const handlePrint = () => {
    
    /*
      Important:
      Current website document print করা হচ্ছে না।

      একটি completely isolated iframe document-এর
      ভিতরে শুধু receipt তৈরি করে iframe-এর
      contentWindow.print() call করা হচ্ছে।
    */

    const oldFrame =
      document.getElementById(
        "townmela-order-print-frame",
      );

    oldFrame?.remove();

    const iframe =
      document.createElement("iframe");

    iframe.id =
      "townmela-order-print-frame";

    iframe.title =
      "TownMela order receipt";

    iframe.setAttribute(
      "aria-hidden",
      "true",
    );

    iframe.style.position =
      "fixed";

    iframe.style.right =
      "0";

    iframe.style.bottom =
      "0";

    iframe.style.width =
      "1px";

    iframe.style.height =
      "1px";

    iframe.style.border =
      "0";

    iframe.style.opacity =
      "0";

    iframe.style.pointerEvents =
      "none";

    const printableOrderNumber =
      orderNumber ||
      orderId ||
      "N/A";

    const printablePaymentMethod =
      paymentMethod === "COD"
        ? "Cash on Delivery"
        : paymentMethod;

    const orderItemRows =
      items.length > 0
        ? items
            .map(
              (item, index) => {
                const selectedSize =
                  item.selectedSize ||
                  item.size ||
                  "";

                const selectedColor =
                  item.selectedColor ||
                  item.color ||
                  "";

                const quantity =
                  Number(
                    item.quantity ?? 1,
                  );

                const price =
                  Number(
                    item.price ?? 0,
                  );

                const lineTotal =
                  price * quantity;

                const variantText = [
                  selectedSize
                    ? `Size: ${selectedSize}`
                    : "",
                  selectedColor
                    ? `Color: ${selectedColor}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" • ");

                return `
                  <tr>
                    <td class="number">
                      ${index + 1}
                    </td>

                    <td>
                      <div class="product-name">
                        ${escapeHtml(
                          item.name ||
                            "Product",
                        )}
                      </div>

                      ${
                        variantText
                          ? `<div class="variant">
                              ${escapeHtml(
                                variantText,
                              )}
                            </div>`
                          : ""
                      }
                    </td>

                    <td class="center">
                      ${quantity}
                    </td>

                    <td class="right">
                      ${escapeHtml(
                        formatPrice(
                          price,
                        ),
                      )}
                    </td>

                    <td class="right strong">
                      ${escapeHtml(
                        formatPrice(
                          lineTotal,
                        ),
                      )}
                    </td>
                  </tr>
                `;
              },
            )
            .join("")
        : `
            <tr>
              <td
                colspan="5"
                class="empty"
              >
                Product information is unavailable.
              </td>
            </tr>
          `;

    const discountRow =
      discountAmount > 0
        ? `
            <div class="summary-row discount">
              <span>Discount</span>

              <strong>
                -${escapeHtml(
                  formatPrice(
                    discountAmount,
                  ),
                )}
              </strong>
            </div>
          `
        : "";

    const receiptHtml = `
      <!doctype html>

      <html lang="en">
        <head>
          <meta charset="utf-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

          <title>
            TownMela Receipt -
            ${escapeHtml(
              printableOrderNumber,
            )}
          </title>

          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #172033;
              font-family:
                Arial,
                "Noto Sans Bengali",
                sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              width: 100%;
            }

            .receipt {
              width: 100%;
              max-width: 194mm;
              margin: 0 auto;
              background: #ffffff;
            }

            .header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #0b1f3a;
            }

            .brand {
              color: #0b1f3a;
              font-size: 24px;
              font-weight: 900;
              line-height: 1;
            }

            .brand span {
              color: #ff6900;
            }

            .receipt-type {
              margin-top: 4px;
              color: #6b7280;
              font-size: 8px;
              font-weight: 700;
              letter-spacing: 1.5px;
              text-transform: uppercase;
            }

            .order-meta {
              max-width: 95mm;
              color: #374151;
              font-size: 9px;
              line-height: 1.55;
              text-align: right;
              overflow-wrap: anywhere;
            }

            .confirmed {
              color: #059669;
              font-weight: 900;
              letter-spacing: 0.8px;
              text-transform: uppercase;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 10px;
            }

            .info-card {
              padding: 9px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-size: 9px;
              line-height: 1.5;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .info-title {
              margin-bottom: 5px;
              padding-bottom: 4px;
              border-bottom: 1px solid #e5e7eb;
              color: #0b1f3a;
              font-size: 8.5px;
              font-weight: 900;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }

            .customer-name {
              font-weight: 800;
            }

            table {
              width: 100%;
              margin-top: 10px;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 8.5px;
              line-height: 1.4;
            }

            thead {
              display: table-header-group;
            }

            th {
              padding: 6px;
              background: #0b1f3a;
              color: #ffffff;
              font-weight: 800;
              text-align: left;
            }

            td {
              padding: 6px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
              overflow-wrap: anywhere;
            }

            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .number {
              width: 6%;
            }

            .product-column {
              width: 48%;
            }

            .qty-column {
              width: 12%;
            }

            .price-column,
            .total-column {
              width: 17%;
            }

            .product-name {
              font-weight: 800;
              color: #0b1f3a;
            }

            .variant {
              margin-top: 2px;
              color: #6b7280;
              font-size: 7.5px;
            }

            .center {
              text-align: center;
            }

            .right {
              text-align: right;
            }

            .strong {
              font-weight: 800;
            }

            .empty {
              padding: 15px;
              color: #6b7280;
              text-align: center;
            }

            .summary {
              width: 48%;
              margin-top: 10px;
              margin-left: auto;
              font-size: 9px;
              line-height: 1.5;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .summary-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              padding: 4px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .discount {
              color: #047857;
            }

            .grand-total {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              margin-top: 5px;
              padding: 8px;
              border-radius: 5px;
              background: #fff1e8;
              color: #0b1f3a;
              font-size: 11px;
              font-weight: 900;
            }

            .grand-total strong {
              color: #ff6900;
            }

            .status-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 10px;
            }

            .footer {
              margin-top: 10px;
              padding-top: 6px;
              border-top: 1px solid #d1d5db;
              color: #6b7280;
              font-size: 7.5px;
              line-height: 1.4;
              text-align: center;
            }

            @media print {
              html,
              body {
                width: auto;
                height: auto;
                overflow: visible;
              }

              .receipt {
                page-break-after: avoid;
                break-after: avoid-page;
              }
            }
          </style>
        </head>

        <body>
          <main class="receipt">
            <header class="header">
              <div>
                <div class="brand">
                  Town<span>Mela</span>
                </div>

                <div class="receipt-type">
                  Order Receipt
                </div>
              </div>

              <div class="order-meta">
                <div class="confirmed">
                  Order Confirmed
                </div>

                <div>
                  <strong>Order:</strong>
                  ${escapeHtml(
                    printableOrderNumber,
                  )}
                </div>

                <div>
                  <strong>Status:</strong>
                  ${escapeHtml(
                    orderStatus,
                  )}
                </div>
              </div>
            </header>

            <section class="info-grid">
              <div class="info-card">
                <div class="info-title">
                  Customer
                </div>

                <div class="customer-name">
                  ${escapeHtml(
                    customer?.fullName ||
                      "Customer",
                  )}
                </div>

                ${
                  customer?.phone
                    ? `<div>
                        Phone:
                        ${escapeHtml(
                          customer.phone,
                        )}
                      </div>`
                    : ""
                }

                ${
                  customer?.email
                    ? `<div>
                        Email:
                        ${escapeHtml(
                          customer.email,
                        )}
                      </div>`
                    : ""
                }
              </div>

              <div class="info-card">
                <div class="info-title">
                  Delivery Address
                </div>

                <div>
                  ${escapeHtml(
                    deliveryAddress ||
                      "Delivery address is unavailable.",
                  )}
                </div>
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th class="number">
                    #
                  </th>

                  <th class="product-column">
                    Product
                  </th>

                  <th class="qty-column center">
                    Qty
                  </th>

                  <th class="price-column right">
                    Price
                  </th>

                  <th class="total-column right">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                ${orderItemRows}
              </tbody>
            </table>

            <section class="summary">
              <div class="summary-row">
                <span>Subtotal</span>

                <strong>
                  ${escapeHtml(
                    formatPrice(
                      subtotal,
                    ),
                  )}
                </strong>
              </div>

              <div class="summary-row">
                <span>
                  Delivery Charge
                </span>

                <strong>
                  ${escapeHtml(
                    formatPrice(
                      deliveryCharge,
                    ),
                  )}
                </strong>
              </div>

              ${discountRow}

              <div class="grand-total">
                <span>Total</span>

                <strong>
                  ${escapeHtml(
                    formatPrice(
                      totalAmount,
                    ),
                  )}
                </strong>
              </div>
            </section>

            <section class="status-grid">
              <div class="info-card">
                <div class="info-title">
                  Payment
                </div>

                <div>
                  ${escapeHtml(
                    printablePaymentMethod,
                  )}
                </div>

                <div>
                  Status:
                  ${escapeHtml(
                    paymentStatus,
                  )}
                </div>
              </div>

              <div class="info-card">
                <div class="info-title">
                  Delivery Status
                </div>

                <div>
                  ${escapeHtml(
                    orderStatus,
                  )}
                </div>

                <div>
                  Thank you for shopping with TownMela.
                </div>
              </div>
            </section>

            <footer class="footer">
              This is a computer-generated receipt. No signature is required.
            </footer>
          </main>
        </body>
      </html>
    `;

    iframe.srcdoc =
      receiptHtml;

    iframe.onload = () => {
      const frameWindow =
        iframe.contentWindow;

      if (!frameWindow) {
        iframe.remove();

        alert(
          "Print receipt could not be prepared. Please try again.",
        );

        return;
      }

      const runPrint =
        async () => {
          try {
            if (
              frameWindow.document
                .fonts?.ready
            ) {
              await frameWindow.document
                .fonts.ready;
            }
          } catch {
            // Font readiness failure does not block printing.
          }

          frameWindow.focus();

          frameWindow.print();
        };

      frameWindow.addEventListener(
        "afterprint",
        () => {
          window.setTimeout(() => {
            iframe.remove();
          }, 300);
        },
        {
          once: true,
        },
      );

      window.setTimeout(
        () => {
          void runPrint();
        },
        200,
      );
    };

    document.body.appendChild(
      iframe,
    );
  };

  return (
    <main className="min-h-screen w-full bg-[linear-gradient(180deg,#F7F8FA_0%,#FFFFFF_52%,#F7F8FA_100%)] py-4 sm:py-7 lg:py-10">
      <section className="mx-auto w-full max-w-[1450px] px-3 sm:px-4 lg:px-5">
        {/* =================================================
            SUCCESS HERO
        ================================================= */}

        <div className="relative overflow-hidden rounded-[22px] border border-emerald-100 bg-white px-4 py-7 sm:rounded-[28px] sm:px-8 sm:py-10 text-center shadow-[0_20px_70px_rgba(15,23,42,0.07)] sm:px-8 sm:py-10 lg:px-12">
          <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-16 h-64 w-64 rounded-full bg-orange-100/60 blur-3xl" />

          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20 lg:h-24 lg:w-24 bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 sm:h-24 sm:w-24">
              <CheckCircle2
                size={46}
                strokeWidth={2.2}
              />
            </div>

            <p className="mt-5 text-[11px] font-extrabold uppercase sm:mt-6 sm:text-xs tracking-[0.18em] text-emerald-600">
              Order Confirmed
            </p>

            <h1 className="mt-2 text-[24px] font-black leading-tight tracking-tight sm:text-3xl lg:text-[40px] text-[#0B1F3A] sm:text-3xl lg:text-[40px]">
              Thank You for Your Order!
            </h1>

            <p className="mx-auto mt-3 max-w-2xl px-1 text-[13px] leading-6 sm:px-0 sm:text-base text-gray-500 sm:text-base">
              আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। খুব শিগগিরই আমরা ফোনে যোগাযোগ করব।
            </p>

            {orderNumber && (
              <div className="mx-auto mt-6 flex w-full max-w-xl flex-col items-stretch justify-between sm:mt-7 sm:flex-row sm:items-center gap-3 rounded-2xl border border-gray-200 bg-[#F8F9FB] p-4 sm:flex-row sm:px-5">
                <div className="min-w-0 text-center sm:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    Order Number
                  </p>

                  <p className="mt-1 break-all text-base font-black text-[#0B1F3A] sm:text-lg">
                    {orderNumber}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleCopyOrderNumber
                  }
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:w-auto"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            ORDER DETAILS
        ================================================= */}

        <div className="mt-5 grid grid-cols-1 items-start gap-4 sm:mt-6 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
          {/* ORDER ITEMS */}

          <div className="overflow-hidden rounded-[22px] border border-gray-200 bg-white sm:rounded-[28px] shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#FBFCFD] px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#FF6900]">
                  Order Items
                </p>

                <h2 className="mt-1 text-xl font-extrabold text-[#0B1F3A]">
                  Your Products
                </h2>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
                <PackageCheck
                  size={21}
                />
              </div>
            </div>

            {items.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {items.map(
                  (item, index) => {
                    const selectedSize =
                      item.selectedSize ||
                      item.size ||
                      "";

                    const selectedColor =
                      item.selectedColor ||
                      item.color ||
                      "";

                    const itemSubtotal =
                      Number(
                        item.price ?? 0,
                      ) *
                      Number(
                        item.quantity ?? 0,
                      );

                    return (
                      <article
                        key={`${
                          item.productId ??
                          item.name ??
                          "product"
                        }-${index}`}
                        className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_100px] sm:gap-3 sm:px-6"
                      >
                        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                          <div className="relative h-16 w-16 shrink-0 sm:h-24 sm:w-24 overflow-hidden rounded-2xl border border-gray-200 bg-[#F8F9FB] sm:h-24 sm:w-24">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={
                                  item.name ??
                                  "Ordered product"
                                }
                                fill
                                sizes="96px"
                                className="object-contain p-2"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-extrabold leading-6 text-[#0B1F3A] sm:text-base">
                              {item.name ??
                                "Product"}
                            </h3>

                            {(selectedSize ||
                              selectedColor) && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {selectedSize && (
                                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                    Size:{" "}
                                    {
                                      selectedSize
                                    }
                                  </span>
                                )}

                                {selectedColor && (
                                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                    Color:{" "}
                                    {
                                      selectedColor
                                    }
                                  </span>
                                )}
                              </div>
                            )}

                            <p className="mt-2 text-xs font-semibold text-gray-500">
                              {formatPrice(
                                item.price,
                              )}{" "}
                              ×{" "}
                              {item.quantity ?? 1}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-left sm:block sm:border-0 sm:pt-1 sm:text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            Subtotal
                          </p>

                          <p className="mt-1 text-sm font-extrabold text-[#FF6900] sm:text-base">
                            {formatPrice(
                              itemSubtotal,
                            )}
                          </p>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <ShoppingBag
                  size={34}
                  className="mx-auto text-gray-300"
                />

                <p className="mt-3 text-sm font-semibold text-gray-500">
                  Order item details are unavailable.
                </p>
              </div>
            )}
          </div>

          {/* ORDER SUMMARY */}

          <aside className="overflow-hidden rounded-[22px] border border-gray-200 bg-white sm:rounded-[28px] shadow-[0_18px_60px_rgba(15,23,42,0.07)] xl:sticky xl:top-5">
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-orange-400" />

            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-600">
                    Summary
                  </p>

                  <h2 className="mt-1 text-xl font-extrabold text-[#0B1F3A]">
                    Order Details
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <ShoppingBag
                    size={21}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-[#FAFBFC] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-extrabold text-[#0B1F3A]">
                    {formatPrice(
                      subtotal,
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Delivery Charge
                  </span>

                  <span className="font-extrabold text-[#0B1F3A]">
                    {formatPrice(
                      deliveryCharge,
                    )}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Discount
                    </span>

                    <span className="font-extrabold text-emerald-600">
                      -
                      {formatPrice(
                        discountAmount,
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="my-6 border-t border-dashed border-gray-300" />

              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-500">
                    Total Amount
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Cash on Delivery
                  </p>
                </div>

                <span className="text-2xl font-black text-[#FF6900] sm:text-[28px]">
                  {formatPrice(
                    totalAmount,
                  )}
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#FF6900] shadow-sm">
                    <CircleDollarSign
                      size={19}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-[#0B1F3A]">
                      {paymentMethod ===
                      "COD"
                        ? "Cash on Delivery"
                        : paymentMethod}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      Payment:{" "}
                      {paymentStatus}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                    <Truck
                      size={19}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-[#0B1F3A]">
                      Order Status
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {orderStatus}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* =================================================
            CUSTOMER AND DELIVERY INFORMATION
        ================================================= */}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-2">
          <div className="rounded-[22px] border border-gray-200 bg-white sm:rounded-[28px] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#0B1F3A]">
                <Phone size={20} />
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-gray-400">
                  Customer
                </p>

                <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                  Contact Information
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <p className="font-extrabold text-[#0B1F3A]">
                {customer?.fullName ??
                  "Customer"}
              </p>

              {customer?.phone && (
                <p className="flex items-center gap-2 text-gray-600">
                  <Phone
                    size={15}
                    className="text-[#FF6900]"
                  />

                  {customer.phone}
                </p>
              )}

              {customer?.email && (
                <p className="flex items-center gap-2 break-all text-gray-600">
                  <Mail
                    size={15}
                    className="text-[#FF6900]"
                  />

                  {customer.email}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-gray-200 bg-white sm:rounded-[28px] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6900]">
                <MapPin size={20} />
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-gray-400">
                  Delivery
                </p>

                <h2 className="text-lg font-extrabold text-[#0B1F3A]">
                  Shipping Address
                </h2>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-gray-600">
              {deliveryAddress ||
                "Delivery address is unavailable."}
            </p>
          </div>
        </div>

        {/* =================================================
            ACTION BUTTONS
        ================================================= */}

        <div className="mt-5 grid grid-cols-1 gap-3 print:hidden sm:mt-6 sm:grid-cols-3">
          <Link
            href="/"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-7 text-sm font-extrabold text-white shadow-lg shadow-orange-500/15 transition-all hover:-translate-y-0.5 hover:bg-[#E85F00] hover:shadow-xl"
          >
            <Home size={18} />
            Back to Home
          </Link>

          <Link
            href="/shop"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-7 text-sm font-extrabold text-gray-700 transition-all hover:border-[#FF6900] hover:bg-orange-50 hover:text-[#FF6900]"
          >
            <ShoppingBag size={18} />
            Continue Shopping
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-7 text-sm font-extrabold text-gray-700 transition-all hover:border-[#0B1F3A] hover:bg-slate-50 hover:text-[#0B1F3A]"
          >
            <Printer size={18} />
            Print Receipt
          </button>
        </div>

        {!storedOrder &&
          !orderNumber &&
          !orderId && (
            <p className="mt-5 text-center text-xs font-semibold text-gray-400">
              No saved order information was found in this browser.
            </p>
          )}

        {/* =================================================
            RELATED PRODUCTS
        ================================================= */}

        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-10">
            <RelatedProductsCarousel
              products={
                relatedProducts
              }
              title="Related Products"
              showAllText="Show All"
              showAllLink="/shop"
              autoSlide
              autoSlideInterval={
                4000
              }
            />
          </div>
        )}
      </section>
    </main>
  );
}