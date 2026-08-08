"use client";

import Link from "next/link";

import {
  AlertCircle,
  ArrowLeft,
  Box,
  CheckCircle2,
  LoaderCircle,
  PackagePlus,
  Save,
  Truck,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useTenant,
} from "@/src/context/TenantContext";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

/* =========================================================
   TYPES
========================================================= */

type ShipmentType =
  | "forward"
  | "return"
  | "exchange";

type PackageType =
  | "parcel"
  | "document"
  | "fragile"
  | "other";

type PaymentMethod =
  | "cod"
  | "prepaid"
  | "partial";

type WeightUnit =
  | "kg"
  | "gram";

type DimensionUnit =
  | "cm"
  | "inch";

type CourierApiRecord = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  providerType?: string;
  isActive?: boolean;
  isDefault?: boolean;
};

type OrderApiRecord = {
  _id?: string;
  id?: string;

  orderNumber?: string;
  invoiceNumber?: string;

  status?: string;
  paymentStatus?: string;

  totalAmount?: number;
  grandTotal?: number;
  total?: number;

  paymentMethod?: string;

  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;

  phone?: string;

  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  user?: {
    name?: string;
    phone?: string;
    email?: string;
  };

  shippingAddress?: {
    name?: string;
    fullName?: string;
    phone?: string;
    alternatePhone?: string;
    email?: string;

    addressLine?: string;
    address?: string;
    street?: string;

    area?: string;
    thana?: string;
    upazila?: string;

    city?: string;
    district?: string;
    division?: string;

    postalCode?: string;
    zipCode?: string;

    country?: string;
  };

  deliveryAddress?: OrderApiRecord["shippingAddress"];
  address?: OrderApiRecord["shippingAddress"];
};

type CourierOption = {
  id: string;
  name: string;
  code: string;
  providerType: string;
  isDefault: boolean;
};

type OrderOption = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;

  totalAmount: number;
  paymentMethod: PaymentMethod;

  recipient: {
    name: string;
    phone: string;
    alternatePhone: string;
    email: string;

    addressLine: string;
    area: string;
    city: string;
    district: string;
    division: string;
    postalCode: string;
    country: string;
  };
};

type OrdersResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  orders?: OrderApiRecord[];

  data?: {
    orders?: OrderApiRecord[];
  };
};

type CouriersResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  data?: {
    couriers?: CourierApiRecord[];
  };
};

type CreateShipmentResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  data?: {
    shipment?: {
      _id?: string;
      id?: string;
      shipmentNumber?: string;
    };
  };
};

type ShipmentFormData = {
  orderId: string;
  courierId: string;

  shipmentType:
    ShipmentType;

  packageType:
    PackageType;

  paymentMethod:
    PaymentMethod;

  merchantInvoiceNumber: string;
  externalReference: string;

  recipientName: string;
  recipientPhone: string;
  recipientAlternatePhone: string;
  recipientEmail: string;

  addressLine: string;
  area: string;
  city: string;
  district: string;
  division: string;
  postalCode: string;
  country: string;

  deliveryInstructions: string;
  itemDescription: string;
  specialInstructions: string;

  weight: string;
  weightUnit:
    WeightUnit;

  dimensionLength: string;
  dimensionWidth: string;
  dimensionHeight: string;
  dimensionUnit:
    DimensionUnit;

  orderAmount: string;
  codAmount: string;
  shippingCharge: string;
  courierCharge: string;
  collectionAmount: string;

  expectedDeliveryAt: string;
};

/* =========================================================
   INITIAL DATA
========================================================= */

const INITIAL_FORM_DATA:
  ShipmentFormData = {
  orderId: "",
  courierId: "",

  shipmentType:
    "forward",

  packageType:
    "parcel",

  paymentMethod:
    "cod",

  merchantInvoiceNumber:
    "",

  externalReference:
    "",

  recipientName:
    "",

  recipientPhone:
    "",

  recipientAlternatePhone:
    "",

  recipientEmail:
    "",

  addressLine:
    "",

  area:
    "",

  city:
    "",

  district:
    "",

  division:
    "",

  postalCode:
    "",

  country:
    "Bangladesh",

  deliveryInstructions:
    "",

  itemDescription:
    "",

  specialInstructions:
    "",

  weight:
    "0.1",

  weightUnit:
    "kg",

  dimensionLength:
    "0",

  dimensionWidth:
    "0",

  dimensionHeight:
    "0",

  dimensionUnit:
    "cm",

  orderAmount:
    "0",

  codAmount:
    "0",

  shippingCharge:
    "0",

  courierCharge:
    "0",

  collectionAmount:
    "0",

  expectedDeliveryAt:
    "",
};

/* =========================================================
   HELPERS
========================================================= */

function getErrorMessage(
  payload:
    | {
        message?: string;
        error?: string;
      }
    | null,
  fallback: string,
) {
  return (
    payload?.message ||
    payload?.error ||
    fallback
  );
}

function toNumber(
  value: unknown,
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function normalizePaymentMethod(
  value?: string,
): PaymentMethod {
  const normalized =
    String(
      value || "",
    )
      .trim()
      .toLowerCase();

  if (
    [
      "cod",
      "cash_on_delivery",
      "cash on delivery",
    ].includes(
      normalized,
    )
  ) {
    return "cod";
  }

  if (
    [
      "partial",
      "partially_paid",
    ].includes(
      normalized,
    )
  ) {
    return "partial";
  }

  return "prepaid";
}

function normalizeCourier(
  record:
    CourierApiRecord,
): CourierOption | null {
  const id =
    record._id ||
    record.id ||
    "";

  if (!id) {
    return null;
  }

  return {
    id,

    name:
      record.name?.trim() ||
      "Unnamed Courier",

    code:
      record.code?.trim() ||
      "-",

    providerType:
      record.providerType?.trim() ||
      "manual",

    isDefault:
      Boolean(
        record.isDefault,
      ),
  };
}

function normalizeOrder(
  record:
    OrderApiRecord,
): OrderOption | null {
  const id =
    record._id ||
    record.id ||
    "";

  if (!id) {
    return null;
  }

  const address =
    record.shippingAddress ||
    record.deliveryAddress ||
    record.address ||
    {};

  const customer =
    record.customer ||
    record.user ||
    {};

  const totalAmount =
    Math.max(
      toNumber(
        record.totalAmount ??
          record.grandTotal ??
          record.total,
      ),
      0,
    );

  return {
    id,

    orderNumber:
      record.orderNumber ||
      record.invoiceNumber ||
      id,

    status:
      record.status ||
      "-",

    paymentStatus:
      record.paymentStatus ||
      "-",

    totalAmount,

    paymentMethod:
      normalizePaymentMethod(
        record.paymentMethod,
      ),

    recipient: {
      name:
        address.name ||
        address.fullName ||
        record.customerName ||
        customer.name ||
        "",

      phone:
        address.phone ||
        record.customerPhone ||
        record.phone ||
        customer.phone ||
        "",

      alternatePhone:
        address.alternatePhone ||
        "",

      email:
        address.email ||
        record.customerEmail ||
        customer.email ||
        "",

      addressLine:
        address.addressLine ||
        address.address ||
        address.street ||
        "",

      area:
        address.area ||
        address.thana ||
        address.upazila ||
        "",

      city:
        address.city ||
        address.district ||
        "",

      district:
        address.district ||
        "",

      division:
        address.division ||
        "",

      postalCode:
        address.postalCode ||
        address.zipCode ||
        "",

      country:
        address.country ||
        "Bangladesh",
    },
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function NewCourierShipmentPage() {
  const router =
    useRouter();

  const {
    selectedTenantId,
  } = useTenant();

  const [
    formData,
    setFormData,
  ] =
    useState<ShipmentFormData>(
      INITIAL_FORM_DATA,
    );

  const [
    orders,
    setOrders,
  ] =
    useState<OrderOption[]>([]);

  const [
    couriers,
    setCouriers,
  ] =
    useState<
      CourierOption[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null,
    );

  /* =======================================================
     LOAD ORDERS + COURIERS
  ======================================================= */

  const loadPageData =
    useCallback(
      async () => {
        if (
          !selectedTenantId
        ) {
          setOrders([]);
          setCouriers([]);

          setError(
            "Please select a tenant before continuing.",
          );

          setIsLoading(
            false,
          );

          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const [
            ordersResponse,
            couriersResponse,
          ] =
            await Promise.all([
              tenantFetch(
                "/api/orders?limit=100",
                {
                  method:
                    "GET",

                  cache:
                    "no-store",
                },
              ),

              tenantFetch(
                "/api/couriers?limit=100&isActive=true",
                {
                  method:
                    "GET",

                  cache:
                    "no-store",
                },
              ),
            ]);

          const ordersPayload =
            (await ordersResponse
              .json()
              .catch(
                () => null,
              )) as
              | OrdersResponse
              | null;

          const couriersPayload =
            (await couriersResponse
              .json()
              .catch(
                () => null,
              )) as
              | CouriersResponse
              | null;

          if (
            !ordersResponse.ok
          ) {
            throw new Error(
              getErrorMessage(
                ordersPayload,
                "Unable to load orders.",
              ),
            );
          }

          if (
            !couriersResponse.ok
          ) {
            throw new Error(
              getErrorMessage(
                couriersPayload,
                "Unable to load couriers.",
              ),
            );
          }

          const normalizedOrders =
            (
              ordersPayload
                ?.data
                ?.orders ||
              ordersPayload
                ?.orders ||
              []
            )
              .map(
                normalizeOrder,
              )
              .filter(
                (
                  order,
                ): order is OrderOption =>
                  Boolean(
                    order,
                  ),
              );

          const normalizedCouriers =
            (
              couriersPayload
                ?.data
                ?.couriers ||
              []
            )
              .map(
                normalizeCourier,
              )
              .filter(
                (
                  courier,
                ): courier is CourierOption =>
                  Boolean(
                    courier,
                  ),
              );

          setOrders(
            normalizedOrders,
          );

          setCouriers(
            normalizedCouriers,
          );

          const defaultCourier =
            normalizedCouriers.find(
              (courier) =>
                courier.isDefault,
            );

          setFormData(
            (
              current,
            ) => ({
              ...INITIAL_FORM_DATA,

              courierId:
                defaultCourier
                  ?.id ||
                "",

              country:
                "Bangladesh",
            }),
          );
        } catch (
          loadError
        ) {
          setOrders([]);
          setCouriers([]);

          setError(
            loadError instanceof
            Error
              ? loadError.message
              : "Something went wrong while loading shipment data.",
          );
        } finally {
          setIsLoading(
            false,
          );
        }
      },
      [
        selectedTenantId,
      ],
    );

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  /* =======================================================
     SELECTED ORDER
  ======================================================= */

  const selectedOrder =
    useMemo(
      () =>
        orders.find(
          (order) =>
            order.id ===
            formData.orderId,
        ) || null,
      [
        orders,
        formData.orderId,
      ],
    );

  /* =======================================================
     INPUT CHANGE
  ======================================================= */

  const updateField = <
    K extends
      keyof ShipmentFormData,
  >(
    field: K,
    value:
      ShipmentFormData[K],
  ) => {
    setFormData(
      (
        current,
      ) => ({
        ...current,
        [field]:
          value,
      }),
    );

    setError(null);
    setSuccessMessage(
      null,
    );
  };

  /* =======================================================
     ORDER CHANGE
  ======================================================= */

  const handleOrderChange = (
    orderId: string,
  ) => {
    const order =
      orders.find(
        (item) =>
          item.id ===
          orderId,
      );

    if (!order) {
      updateField(
        "orderId",
        orderId,
      );

      return;
    }

    const codAmount =
      order.paymentMethod ===
      "cod"
        ? order.totalAmount
        : 0;

    setFormData(
      (
        current,
      ) => ({
        ...current,

        orderId:
          order.id,

        merchantInvoiceNumber:
          order.orderNumber,

        paymentMethod:
          order.paymentMethod,

        recipientName:
          order.recipient
            .name,

        recipientPhone:
          order.recipient
            .phone,

        recipientAlternatePhone:
          order.recipient
            .alternatePhone,

        recipientEmail:
          order.recipient
            .email,

        addressLine:
          order.recipient
            .addressLine,

        area:
          order.recipient
            .area,

        city:
          order.recipient
            .city,

        district:
          order.recipient
            .district,

        division:
          order.recipient
            .division,

        postalCode:
          order.recipient
            .postalCode,

        country:
          order.recipient
            .country,

        orderAmount:
          String(
            order.totalAmount,
          ),

        codAmount:
          String(
            codAmount,
          ),

        collectionAmount:
          String(
            codAmount,
          ),
      }),
    );

    setError(null);
    setSuccessMessage(
      null,
    );
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm =
    () => {
      if (
        !selectedTenantId
      ) {
        return "Please select a tenant before continuing.";
      }

      if (
        !formData.orderId
      ) {
        return "Please select an order.";
      }

      if (
        !formData.courierId
      ) {
        return "Please select a courier.";
      }

      if (
        !formData.recipientName.trim()
      ) {
        return "Recipient name is required.";
      }

      if (
        !formData.recipientPhone.trim()
      ) {
        return "Recipient phone is required.";
      }

      if (
        !formData.addressLine.trim()
      ) {
        return "Recipient address is required.";
      }

      if (
        !formData.city.trim()
      ) {
        return "Recipient city is required.";
      }

      if (
        Number(
          formData.weight,
        ) < 0.1
      ) {
        return "Shipment weight must be at least 0.1.";
      }

      return "";
    };

  /* =======================================================
     CREATE SHIPMENT
  ======================================================= */

  const handleSubmit =
    async (
      event:
        FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      const validationError =
        validateForm();

      if (
        validationError
      ) {
        setError(
          validationError,
        );

        setSuccessMessage(
          null,
        );

        return;
      }

      setIsSubmitting(
        true,
      );

      setError(null);
      setSuccessMessage(
        null,
      );

      try {
        const response =
          await tenantFetch(
            "/api/courier-shipments",
            {
              method:
                "POST",

              body:
                JSON.stringify(
                  {
                    orderId:
                      formData.orderId,

                    courierId:
                      formData.courierId,

                    shipmentType:
                      formData.shipmentType,

                    packageType:
                      formData.packageType,

                    paymentMethod:
                      formData.paymentMethod,

                    merchantInvoiceNumber:
                      formData
                        .merchantInvoiceNumber
                        .trim() ||
                      null,

                    externalReference:
                      formData
                        .externalReference
                        .trim() ||
                      null,

                    recipient: {
                      name:
                        formData.recipientName.trim(),

                      phone:
                        formData.recipientPhone.trim(),

                      alternatePhone:
                        formData
                          .recipientAlternatePhone
                          .trim() ||
                        null,

                      email:
                        formData
                          .recipientEmail
                          .trim() ||
                        null,

                      addressLine:
                        formData.addressLine.trim(),

                      area:
                        formData.area.trim() ||
                        null,

                      city:
                        formData.city.trim(),

                      district:
                        formData.district.trim() ||
                        null,

                      division:
                        formData.division.trim() ||
                        null,

                      postalCode:
                        formData.postalCode.trim() ||
                        null,

                      country:
                        formData.country.trim() ||
                        "Bangladesh",

                      deliveryInstructions:
                        formData
                          .deliveryInstructions
                          .trim() ||
                        null,
                    },

                    itemDescription:
                      formData
                        .itemDescription
                        .trim() ||
                      null,

                    specialInstructions:
                      formData
                        .specialInstructions
                        .trim() ||
                      null,

                    weight:
                      Math.max(
                        Number(
                          formData.weight,
                        ) || 0.1,
                        0.1,
                      ),

                    weightUnit:
                      formData.weightUnit,

                    dimensions: {
                      length:
                        Math.max(
                          Number(
                            formData.dimensionLength,
                          ) || 0,
                          0,
                        ),

                      width:
                        Math.max(
                          Number(
                            formData.dimensionWidth,
                          ) || 0,
                          0,
                        ),

                      height:
                        Math.max(
                          Number(
                            formData.dimensionHeight,
                          ) || 0,
                          0,
                        ),

                      unit:
                        formData.dimensionUnit,
                    },

                    pricing: {
                      orderAmount:
                        Math.max(
                          Number(
                            formData.orderAmount,
                          ) || 0,
                          0,
                        ),

                      codAmount:
                        Math.max(
                          Number(
                            formData.codAmount,
                          ) || 0,
                          0,
                        ),

                      shippingCharge:
                        Math.max(
                          Number(
                            formData.shippingCharge,
                          ) || 0,
                          0,
                        ),

                      courierCharge:
                        Math.max(
                          Number(
                            formData.courierCharge,
                          ) || 0,
                          0,
                        ),

                      collectionAmount:
                        Math.max(
                          Number(
                            formData.collectionAmount,
                          ) || 0,
                          0,
                        ),

                      currency:
                        "BDT",
                    },

                    expectedDeliveryAt:
                      formData.expectedDeliveryAt
                        ? new Date(
                            formData.expectedDeliveryAt,
                          ).toISOString()
                        : null,
                  },
                ),
            },
          );

        const payload =
          (await response
            .json()
            .catch(
              () => null,
            )) as
            | CreateShipmentResponse
            | null;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              payload,
              "Unable to create courier shipment.",
            ),
          );
        }

        setSuccessMessage(
          payload?.message ||
            "Courier shipment created successfully.",
        );

        window.dispatchEvent(
          new Event(
            "courier-shipments-updated",
          ),
        );

        const shipmentId =
          payload?.data
            ?.shipment
            ?._id ||
          payload?.data
            ?.shipment
            ?.id;

        setTimeout(() => {
          if (
            shipmentId
          ) {
            router.push(
              `/admin/courier-shipments/${shipmentId}`,
            );
          } else {
            router.push(
              "/admin/courier-shipments",
            );
          }

          router.refresh();
        }, 600);
      } catch (
        submitError
      ) {
        setError(
          submitError instanceof
          Error
            ? submitError.message
            : "Something went wrong while creating the shipment.",
        );
      } finally {
        setIsSubmitting(
          false,
        );
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[520px] max-w-[1500px] items-center justify-center">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <LoaderCircle
              size={42}
              className="mx-auto animate-spin text-[#FF6900]"
            />

            <h1 className="mt-5 text-xl font-black text-gray-900">
              Loading Shipment Form
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Loading orders and active courier providers.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* HEADER */}

        <header className="mb-6">
          <Link
            href="/admin/courier-shipments"
            className="inline-flex items-center gap-2 text-sm font-extrabold text-gray-500 transition hover:text-[#FF6900]"
          >
            <ArrowLeft
              size={17}
            />

            Back to Shipments
          </Link>

          <div className="mt-4 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FF6900] text-white shadow-lg shadow-orange-500/20">
              <PackagePlus
                size={24}
              />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
                Create Courier Shipment
              </h1>

              <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                Select an order and courier, verify delivery information and create a tenant-isolated shipment.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            {successMessage}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          {/* ORDER + COURIER */}

          <FormSection
            title="Shipment Source"
            description="Choose the order and courier provider."
            icon={
              <Truck size={20} />
            }
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <SelectField
                label="Order"
                required
                value={
                  formData.orderId
                }
                onChange={
                  handleOrderChange
                }
                options={[
                  {
                    value: "",
                    label:
                      "Select an order",
                  },

                  ...orders.map(
                    (order) => ({
                      value:
                        order.id,

                      label:
                        `${order.orderNumber} · ৳${order.totalAmount.toLocaleString(
                          "en-BD",
                        )}`,
                    }),
                  ),
                ]}
              />

              <SelectField
                label="Courier"
                required
                value={
                  formData.courierId
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "courierId",
                    value,
                  )
                }
                options={[
                  {
                    value: "",
                    label:
                      "Select a courier",
                  },

                  ...couriers.map(
                    (
                      courier,
                    ) => ({
                      value:
                        courier.id,

                      label:
                        `${courier.name} (${courier.code})${
                          courier.isDefault
                            ? " · Default"
                            : ""
                        }`,
                    }),
                  ),
                ]}
              />

              <SelectField
                label="Shipment Type"
                value={
                  formData.shipmentType
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "shipmentType",
                    value as ShipmentType,
                  )
                }
                options={[
                  {
                    value:
                      "forward",
                    label:
                      "Forward",
                  },
                  {
                    value:
                      "return",
                    label:
                      "Return",
                  },
                  {
                    value:
                      "exchange",
                    label:
                      "Exchange",
                  },
                ]}
              />

              <SelectField
                label="Package Type"
                value={
                  formData.packageType
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "packageType",
                    value as PackageType,
                  )
                }
                options={[
                  {
                    value:
                      "parcel",
                    label:
                      "Parcel",
                  },
                  {
                    value:
                      "document",
                    label:
                      "Document",
                  },
                  {
                    value:
                      "fragile",
                    label:
                      "Fragile",
                  },
                  {
                    value:
                      "other",
                    label:
                      "Other",
                  },
                ]}
              />
            </div>

            {selectedOrder && (
              <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm">
                <p className="font-black text-gray-900">
                  Selected Order:{" "}
                  {
                    selectedOrder.orderNumber
                  }
                </p>

                <p className="mt-1 text-gray-600">
                  Status:{" "}
                  {
                    selectedOrder.status
                  }{" "}
                  · Payment:{" "}
                  {
                    selectedOrder.paymentStatus
                  }{" "}
                  · Total: ৳
                  {selectedOrder.totalAmount.toLocaleString(
                    "en-BD",
                  )}
                </p>
              </div>
            )}
          </FormSection>

          {/* RECIPIENT */}

          <FormSection
            title="Recipient Information"
            description="Confirm the customer's delivery details."
            icon={
              <Box size={20} />
            }
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Recipient Name"
                required
                value={
                  formData.recipientName
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "recipientName",
                    value,
                  )
                }
              />

              <TextField
                label="Phone"
                required
                value={
                  formData.recipientPhone
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "recipientPhone",
                    value,
                  )
                }
              />

              <TextField
                label="Alternate Phone"
                value={
                  formData.recipientAlternatePhone
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "recipientAlternatePhone",
                    value,
                  )
                }
              />

              <TextField
                label="Email"
                type="email"
                value={
                  formData.recipientEmail
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "recipientEmail",
                    value,
                  )
                }
              />

              <div className="md:col-span-2">
                <TextField
                  label="Address"
                  required
                  value={
                    formData.addressLine
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "addressLine",
                      value,
                    )
                  }
                />
              </div>

              <TextField
                label="Area"
                value={
                  formData.area
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "area",
                    value,
                  )
                }
              />

              <TextField
                label="City"
                required
                value={
                  formData.city
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "city",
                    value,
                  )
                }
              />

              <TextField
                label="District"
                value={
                  formData.district
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "district",
                    value,
                  )
                }
              />

              <TextField
                label="Division"
                value={
                  formData.division
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "division",
                    value,
                  )
                }
              />

              <TextField
                label="Postal Code"
                value={
                  formData.postalCode
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "postalCode",
                    value,
                  )
                }
              />

              <TextField
                label="Country"
                value={
                  formData.country
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "country",
                    value,
                  )
                }
              />
            </div>
          </FormSection>

          {/* PACKAGE */}

          <FormSection
            title="Package Information"
            description="Provide shipment weight, dimensions and notes."
            icon={
              <PackagePlus
                size={20}
              />
            }
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <NumberTextField
                label="Weight"
                value={
                  formData.weight
                }
                min="0.1"
                step="0.1"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "weight",
                    value,
                  )
                }
              />

              <SelectField
                label="Weight Unit"
                value={
                  formData.weightUnit
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "weightUnit",
                    value as WeightUnit,
                  )
                }
                options={[
                  {
                    value:
                      "kg",
                    label:
                      "Kilogram",
                  },
                  {
                    value:
                      "gram",
                    label:
                      "Gram",
                  },
                ]}
              />

              <NumberTextField
                label="Length"
                value={
                  formData.dimensionLength
                }
                min="0"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "dimensionLength",
                    value,
                  )
                }
              />

              <NumberTextField
                label="Width"
                value={
                  formData.dimensionWidth
                }
                min="0"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "dimensionWidth",
                    value,
                  )
                }
              />

              <NumberTextField
                label="Height"
                value={
                  formData.dimensionHeight
                }
                min="0"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "dimensionHeight",
                    value,
                  )
                }
              />

              <SelectField
                label="Dimension Unit"
                value={
                  formData.dimensionUnit
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "dimensionUnit",
                    value as DimensionUnit,
                  )
                }
                options={[
                  {
                    value:
                      "cm",
                    label:
                      "Centimeter",
                  },
                  {
                    value:
                      "inch",
                    label:
                      "Inch",
                  },
                ]}
              />
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <TextAreaField
                label="Item Description"
                value={
                  formData.itemDescription
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "itemDescription",
                    value,
                  )
                }
              />

              <TextAreaField
                label="Special Instructions"
                value={
                  formData.specialInstructions
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "specialInstructions",
                    value,
                  )
                }
              />

              <TextAreaField
                label="Delivery Instructions"
                value={
                  formData.deliveryInstructions
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "deliveryInstructions",
                    value,
                  )
                }
              />
            </div>
          </FormSection>

          {/* PAYMENT */}

          <FormSection
            title="Payment & Pricing"
            description="Configure collection and shipment charges."
            icon={
              <Save size={20} />
            }
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <SelectField
                label="Payment Method"
                value={
                  formData.paymentMethod
                }
                onChange={(
                  value,
                ) => {
                  const method =
                    value as PaymentMethod;

                  updateField(
                    "paymentMethod",
                    method,
                  );

                  if (
                    method ===
                    "prepaid"
                  ) {
                    updateField(
                      "codAmount",
                      "0",
                    );

                    updateField(
                      "collectionAmount",
                      "0",
                    );
                  }
                }}
                options={[
                  {
                    value:
                      "cod",
                    label:
                      "Cash on Delivery",
                  },
                  {
                    value:
                      "prepaid",
                    label:
                      "Prepaid",
                  },
                  {
                    value:
                      "partial",
                    label:
                      "Partial",
                  },
                ]}
              />

              <NumberTextField
                label="Order Amount"
                value={
                  formData.orderAmount
                }
                min="0"
                step="0.01"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "orderAmount",
                    value,
                  )
                }
              />

              <NumberTextField
                label="COD Amount"
                value={
                  formData.codAmount
                }
                min="0"
                step="0.01"
                disabled={
                  formData.paymentMethod ===
                  "prepaid"
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "codAmount",
                    value,
                  )
                }
              />

              <NumberTextField
                label="Shipping Charge"
                value={
                  formData.shippingCharge
                }
                min="0"
                step="0.01"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "shippingCharge",
                    value,
                  )
                }
              />

              <NumberTextField
                label="Courier Charge"
                value={
                  formData.courierCharge
                }
                min="0"
                step="0.01"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "courierCharge",
                    value,
                  )
                }
              />

              <NumberTextField
                label="Collection Amount"
                value={
                  formData.collectionAmount
                }
                min="0"
                step="0.01"
                onChange={(
                  value,
                ) =>
                  updateField(
                    "collectionAmount",
                    value,
                  )
                }
              />

              <TextField
                label="Merchant Invoice"
                value={
                  formData.merchantInvoiceNumber
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "merchantInvoiceNumber",
                    value,
                  )
                }
              />

              <TextField
                label="External Reference"
                value={
                  formData.externalReference
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "externalReference",
                    value,
                  )
                }
              />

              <label className="block">
                <span className="text-sm font-extrabold text-gray-800">
                  Expected Delivery
                </span>

                <input
                  type="datetime-local"
                  value={
                    formData.expectedDeliveryAt
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "expectedDeliveryAt",
                      event.target.value,
                    )
                  }
                  className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>
            </div>
          </FormSection>

          {/* ACTIONS */}

          <section className="flex flex-col-reverse gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:justify-end">
            <Link
              href="/admin/courier-shipments"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-extrabold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !selectedTenantId
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FF6900] px-6 text-sm font-extrabold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle
                    size={18}
                    className="animate-spin"
                  />

                  Creating Shipment...
                </>
              ) : (
                <>
                  <Save
                    size={18}
                  />

                  Create Shipment
                </>
              )}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}

/* =========================================================
   PRESENTATION COMPONENTS
========================================================= */

function FormSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6900]">
          {icon}
        </div>

        <div>
          <h2 className="text-lg font-black text-gray-900">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            {description}
          </p>
        </div>
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        required={
          required
        }
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

function NumberTextField({
  label,
  value,
  onChange,
  min,
  step = "1",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  min?: string;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <input
        type="number"
        value={value}
        min={min}
        step={step}
        disabled={
          disabled
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
  }>;
  onChange: (
    value: string,
  ) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <select
        required={
          required
        }
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
      >
        {options.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-gray-800">
        {label}
      </span>

      <textarea
        rows={4}
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-[#FF6900] focus:bg-white focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}