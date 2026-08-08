"use client";


import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  tenantFetch,
} from "@/src/lib/tenantApi";

/* =========================================================
   TYPES
========================================================= */

type InspectionStatus =
  | "Not Required"
  | "Pending"
  | "In Progress"
  | "Passed"
  | "Partially Passed"
  | "Failed"
  | string;

type InventoryPostingStatus =
  | "Not Posted"
  | "Partially Posted"
  | "Posted"
  | "Reversed"
  | string;

type QualityGrade =
  | "Not Graded"
  | "A"
  | "B"
  | "C"
  | "Rejected";

type GoodsReceivedInspection = {
  status?: InspectionStatus;
  required?: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
  inspectedBy?: string | null;
  remarks?: string | null;
};

type GoodsReceivedPosting = {
  status?: InventoryPostingStatus;
  postedAt?: string | null;
  postedQuantity?: number;
  postedValue?: number;
};

type FinancialSummary = {
  subtotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
};

type ReceivingSummary = {
  itemCount?: number;
  totalOrderedQuantity?: number;
  totalReceivedQuantity?: number;
  totalAcceptedQuantity?: number;
  totalRejectedQuantity?: number;
  totalDamagedQuantity?: number;
};

type GoodsReceived = {
  _id: string;
  goodsReceivedNumber?: string;
  purchaseOrder?: string;
  purchaseOrderNumber?: string;
  status?: string;
  receivedDate?: string;
  receivedAt?: string;
  currency?: string;

  supplierSnapshot?: {
    supplierCode?: string | null;
    businessName?: string | null;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
  };

  warehouseSnapshot?: {
    warehouseName?: string | null;
    warehouseCode?: string | null;
    address?: string | null;
  };

  financialSummary?: FinancialSummary;
  receivingSummary?: ReceivingSummary;
  inspection?: GoodsReceivedInspection;
  inventoryPosting?: GoodsReceivedPosting;
};

type ProductSnapshot = {
  productName?: string | null;
  sku?: string | null;
  barcode?: string | null;
  variantName?: string | null;
  unitName?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
};

type ItemInspection = {
  required?: boolean;
  status?: InspectionStatus;
  qualityGrade?: QualityGrade;
  inspectedQuantity?: number;
  passedQuantity?: number;
  failedQuantity?: number;
  inspectedAt?: string | null;
  inspectedBy?: string | null;
  remarks?: string | null;
};

type GoodsReceivedItem = {
  _id: string;
  lineNumber?: number;
  product?: string;
  variant?: string | null;
  productSnapshot?: ProductSnapshot;

  orderedQuantity?: number;
  previouslyReceivedQuantity?: number;
  receivedQuantity?: number;
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  damagedQuantity?: number;
  pendingQuantity?: number;

  unitCost?: number;
  lineTotal?: number;

  status?: string;
  rejectionReason?: string | null;
  damageDescription?: string | null;

  inspection?: ItemInspection;

  inventoryPosting?: {
    status?: InventoryPostingStatus;
  };
};

type InspectionSummary = {
  goodsReceivedId?: string;
  goodsReceivedNumber?: string;
  receiptStatus?: string;
  inspectionRequired?: boolean;
  inspectionStatus?: InspectionStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  inspectedBy?: string | null;
  totalItems?: number;
  totalReceivedQuantity?: number;
  totalAcceptedQuantity?: number;
  totalRejectedQuantity?: number;
};

type InspectionApiData = {
  goodsReceived: GoodsReceived;
  items: GoodsReceivedItem[];
  inspectionSummary?: InspectionSummary;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
  errors?: Array<{
    field?: string;
    message?: string;
  }>;
};

type InspectionFormItem = {
  goodsReceivedItemId: string;
  productName: string;
  sku: string;
  unitName: string;

  receivedQuantity: number;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  damagedQuantity: number;

  qualityGrade: QualityGrade;
  rejectionReason: string;
  damageDescription: string;
  remarks: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const QUALITY_GRADES: QualityGrade[] = [
  "Not Graded",
  "A",
  "B",
  "C",
  "Rejected",
];

/* =========================================================
   FORMAT HELPERS
========================================================= */

function toNumber(
  value: unknown
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function roundQuantity(
  value: unknown
): number {
  return (
    Math.round(
      (toNumber(value) +
        Number.EPSILON) *
        10000
    ) / 10000
  );
}

function formatQuantity(
  value: unknown
): string {
  return new Intl.NumberFormat(
    "en-BD",
    {
      maximumFractionDigits: 4,
    }
  ).format(toNumber(value));
}

function formatCurrency(
  value: unknown,
  currency = "BDT"
): string {
  return new Intl.NumberFormat(
    "en-BD",
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(toNumber(value));
}

function formatDateTime(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function displayText(
  value?: string | null
): string {
  return value?.trim() || "—";
}

/* =========================================================
   STATUS HELPERS
========================================================= */

function normalizeStatus(
  value?: string | null
): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getStatusClass(
  status?: string | null
): string {
  const value =
    normalizeStatus(status);

  if (
    value.includes("passed") ||
    value.includes("accepted") ||
    value === "posted"
  ) {
    return "status status-success";
  }

  if (
    value.includes("failed") ||
    value.includes("rejected") ||
    value.includes("cancelled")
  ) {
    return "status status-danger";
  }

  if (
    value.includes("progress") ||
    value.includes("pending") ||
    value.includes("partial")
  ) {
    return "status status-warning";
  }

  if (
    value.includes("not posted") ||
    value.includes("not required")
  ) {
    return "status status-neutral";
  }

  return "status status-info";
}

/* =========================================================
   API HELPERS
========================================================= */

async function readApiResponse<T>(
  response: Response
): Promise<ApiResponse<T>> {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
  }

  const result =
    (await response.json()) as
      ApiResponse<T>;

  if (
    !response.ok ||
    result.success === false
  ) {
    const validationMessage =
      result.errors
        ?.map(
          (error) =>
            error.message
        )
        .filter(Boolean)
        .join(", ");

    throw new Error(
      validationMessage ||
        result.message ||
        `Request failed with status ${response.status}.`
    );
  }

  return result;
}

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function GoodsReceivedInspectionPage() {
  const router = useRouter();
  const params = useParams<{
    goodsReceivedId: string;
  }>();

  const goodsReceivedId =
    typeof params?.goodsReceivedId ===
    "string"
      ? params.goodsReceivedId
      : "";

  const [inspectionData, setInspectionData] =
    useState<InspectionApiData | null>(
      null
    );

  const [formItems, setFormItems] =
    useState<InspectionFormItem[]>(
      []
    );

  const [
    inspectionRemarks,
    setInspectionRemarks,
  ] = useState("");

  const [
    inspectionNote,
    setInspectionNote,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const goodsReceived =
    inspectionData?.goodsReceived;

  const inspectionStatus =
    goodsReceived?.inspection
      ?.status ||
    inspectionData
      ?.inspectionSummary
      ?.inspectionStatus ||
    "Pending";

  const postingStatus =
    goodsReceived
      ?.inventoryPosting?.status ||
    "Not Posted";

  const isInspectionStarted =
    normalizeStatus(
      inspectionStatus
    ) === "in progress";

  const isInspectionCompleted = [
    "passed",
    "partially passed",
    "failed",
  ].includes(
    normalizeStatus(
      inspectionStatus
    )
  );

  const isInventoryPosted = [
    "posted",
    "partially posted",
  ].includes(
    normalizeStatus(
      postingStatus
    )
  );

  const canStartInspection =
    !isInspectionStarted &&
    !isInspectionCompleted &&
    !isInventoryPosted;

  const canCompleteInspection =
    isInspectionStarted &&
    !isInventoryPosted;

  const canResetInspection =
    !isInventoryPosted &&
    (isInspectionStarted ||
      isInspectionCompleted);

  const canContinueToPosting =
    isInspectionCompleted &&
    normalizeStatus(
      goodsReceived?.status
    ) !== "rejected" &&
    !isInventoryPosted;

  const formTotals = useMemo(() => {
    return formItems.reduce(
      (totals, item) => {
        totals.received +=
          toNumber(
            item.receivedQuantity
          );

        totals.inspected +=
          toNumber(
            item.inspectedQuantity
          );

        totals.passed +=
          toNumber(
            item.passedQuantity
          );

        totals.failed +=
          toNumber(
            item.failedQuantity
          );

        totals.damaged +=
          toNumber(
            item.damagedQuantity
          );

        return totals;
      },
      {
        received: 0,
        inspected: 0,
        passed: 0,
        failed: 0,
        damaged: 0,
      }
    );
  }, [formItems]);

  /* =======================================================
     INITIALIZE FORM
  ======================================================= */

  const initializeFormItems =
    useCallback(
      (
        items: GoodsReceivedItem[]
      ) => {
        const nextItems =
          items.map(
            (
              item
            ): InspectionFormItem => {
              const receivedQuantity =
                roundQuantity(
                  item.receivedQuantity
                );

              const existingInspection =
                item.inspection;

              const existingInspected =
                roundQuantity(
                  existingInspection
                    ?.inspectedQuantity
                );

              const existingPassed =
                roundQuantity(
                  existingInspection
                    ?.passedQuantity
                );

              const existingFailed =
                roundQuantity(
                  existingInspection
                    ?.failedQuantity
                );

              const hasExistingResult =
                existingInspected > 0 ||
                existingPassed > 0 ||
                existingFailed > 0;

              return {
                goodsReceivedItemId:
                  item._id,

                productName:
                  item.productSnapshot
                    ?.productName ||
                  "Unnamed product",

                sku:
                  item.productSnapshot
                    ?.sku ||
                  item.productSnapshot
                    ?.barcode ||
                  "—",

                unitName:
                  item.productSnapshot
                    ?.unitName ||
                  "Unit",

                receivedQuantity,

                inspectedQuantity:
                  hasExistingResult
                    ? existingInspected
                    : receivedQuantity,

                passedQuantity:
                  hasExistingResult
                    ? existingPassed
                    : receivedQuantity,

                failedQuantity:
                  hasExistingResult
                    ? existingFailed
                    : 0,

                damagedQuantity:
                  roundQuantity(
                    item.damagedQuantity
                  ),

                qualityGrade:
                  existingInspection
                    ?.qualityGrade ||
                  "A",

                rejectionReason:
                  item.rejectionReason ||
                  "",

                damageDescription:
                  item.damageDescription ||
                  "",

                remarks:
                  existingInspection
                    ?.remarks ||
                  "",
              };
            }
          );

        setFormItems(nextItems);
      },
      []
    );

  /* =======================================================
     FETCH INSPECTION
  ======================================================= */

  const fetchInspection =
    useCallback(
      async (
        showLoading = true
      ) => {
        if (!goodsReceivedId) {
          setError(
            "Goods received ID is missing."
          );

          setLoading(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          setError("");

          const response =
            await tenantFetch(
              `/api/goods-received/${goodsReceivedId}/inspection`,
              {
                method: "GET",
                cache: "no-store",
              }
            );

          const result =
            await readApiResponse<InspectionApiData>(
              response
            );

          if (!result.data) {
            throw new Error(
              "Inspection data was not returned by the server."
            );
          }

          setInspectionData(
            result.data
          );

          initializeFormItems(
            result.data.items || []
          );

          setInspectionRemarks(
            result.data
              .goodsReceived
              ?.inspection?.remarks ||
              ""
          );
        } catch (requestError) {
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Unable to load inspection."
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        goodsReceivedId,
        initializeFormItems,
      ]
    );

  useEffect(() => {
    void fetchInspection();
  }, [fetchInspection]);

  useEffect(() => {
    const handleTenantChanged =
      () => {
        setInspectionData(null);
        setSuccessMessage("");
        void fetchInspection();
      };

    window.addEventListener(
      "tenant-changed",
      handleTenantChanged
    );

    return () => {
      window.removeEventListener(
        "tenant-changed",
        handleTenantChanged
      );
    };
  }, [fetchInspection]);

  /* =======================================================
     UPDATE ITEM FORM
  ======================================================= */

  const updateFormItem = (
    index: number,
    field:
      | keyof InspectionFormItem,
    value: string | number
  ) => {
    setFormItems(
      (currentItems) =>
        currentItems.map(
          (item, itemIndex) => {
            if (
              itemIndex !== index
            ) {
              return item;
            }

            return {
              ...item,
              [field]: value,
            };
          }
        )
    );
  };

  const handlePassedQuantityChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const passedQuantity =
      Math.max(
        0,
        roundQuantity(
          event.target.value
        )
      );

    setFormItems(
      (currentItems) =>
        currentItems.map(
          (item, itemIndex) => {
            if (
              itemIndex !== index
            ) {
              return item;
            }

            const inspectedQuantity =
              roundQuantity(
                item.inspectedQuantity
              );

            const safePassedQuantity =
              Math.min(
                passedQuantity,
                inspectedQuantity
              );

            const failedQuantity =
              roundQuantity(
                inspectedQuantity -
                  safePassedQuantity
              );

            return {
              ...item,
              passedQuantity:
                safePassedQuantity,
              failedQuantity,
              damagedQuantity:
                Math.min(
                  item.damagedQuantity,
                  failedQuantity
                ),
              qualityGrade:
                failedQuantity === 0
                  ? item.qualityGrade ===
                    "Rejected"
                    ? "A"
                    : item.qualityGrade
                  : item.qualityGrade ===
                    "A"
                  ? "B"
                  : item.qualityGrade,
              rejectionReason:
                failedQuantity === 0
                  ? ""
                  : item.rejectionReason,
              damageDescription:
                failedQuantity === 0
                  ? ""
                  : item.damageDescription,
            };
          }
        )
    );
  };

  const handleFailedQuantityChange = (
    index: number,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const failedQuantity =
      Math.max(
        0,
        roundQuantity(
          event.target.value
        )
      );

    setFormItems(
      (currentItems) =>
        currentItems.map(
          (item, itemIndex) => {
            if (
              itemIndex !== index
            ) {
              return item;
            }

            const inspectedQuantity =
              roundQuantity(
                item.inspectedQuantity
              );

            const safeFailedQuantity =
              Math.min(
                failedQuantity,
                inspectedQuantity
              );

            const passedQuantity =
              roundQuantity(
                inspectedQuantity -
                  safeFailedQuantity
              );

            return {
              ...item,
              failedQuantity:
                safeFailedQuantity,
              passedQuantity,
              damagedQuantity:
                Math.min(
                  item.damagedQuantity,
                  safeFailedQuantity
                ),
              qualityGrade:
                safeFailedQuantity ===
                inspectedQuantity
                  ? "Rejected"
                  : safeFailedQuantity >
                    0
                  ? item.qualityGrade ===
                    "A"
                    ? "B"
                    : item.qualityGrade
                  : item.qualityGrade ===
                    "Rejected"
                  ? "A"
                  : item.qualityGrade,
              rejectionReason:
                safeFailedQuantity === 0
                  ? ""
                  : item.rejectionReason,
              damageDescription:
                safeFailedQuantity === 0
                  ? ""
                  : item.damageDescription,
            };
          }
        )
    );
  };

  const markAllPassed = () => {
    setFormItems(
      (currentItems) =>
        currentItems.map(
          (item) => ({
            ...item,
            inspectedQuantity:
              item.receivedQuantity,
            passedQuantity:
              item.receivedQuantity,
            failedQuantity: 0,
            damagedQuantity: 0,
            qualityGrade: "A",
            rejectionReason: "",
            damageDescription: "",
          })
        )
    );
  };

  /* =======================================================
     VALIDATE COMPLETE FORM
  ======================================================= */

  const validateCompleteForm =
    (): string | null => {
      if (!formItems.length) {
        return "No inspection items are available.";
      }

      for (
        let index = 0;
        index < formItems.length;
        index += 1
      ) {
        const item =
          formItems[index];

        const lineLabel =
          item.productName ||
          `Line ${index + 1}`;

        const received =
          roundQuantity(
            item.receivedQuantity
          );

        const inspected =
          roundQuantity(
            item.inspectedQuantity
          );

        const passed =
          roundQuantity(
            item.passedQuantity
          );

        const failed =
          roundQuantity(
            item.failedQuantity
          );

        const damaged =
          roundQuantity(
            item.damagedQuantity
          );

        if (
          inspected !== received
        ) {
          return `${lineLabel}: inspected quantity must equal received quantity (${received}).`;
        }

        if (
          roundQuantity(
            passed + failed
          ) !== inspected
        ) {
          return `${lineLabel}: passed and failed quantities must equal inspected quantity.`;
        }

        if (
          damaged > failed
        ) {
          return `${lineLabel}: damaged quantity cannot exceed failed quantity.`;
        }

        if (
          failed > 0 &&
          !item.rejectionReason.trim()
        ) {
          return `${lineLabel}: rejection reason is required because failed quantity is greater than zero.`;
        }

        if (
          damaged > 0 &&
          !item.damageDescription.trim()
        ) {
          return `${lineLabel}: damage description is required because damaged quantity is greater than zero.`;
        }
      }

      return null;
    };

  /* =======================================================
     START INSPECTION
  ======================================================= */

  const handleStartInspection =
    async () => {
      if (!goodsReceivedId) {
        return;
      }

      try {
        setActionLoading(true);
        setError("");
        setSuccessMessage("");

        const response =
          await tenantFetch(
            `/api/goods-received/${goodsReceivedId}/inspection/start`,
            {
              method: "PATCH",
              body: JSON.stringify({
                remarks:
                  inspectionRemarks.trim() ||
                  "Inspection started",
                note:
                  inspectionNote.trim() ||
                  null,
              }),
            }
          );

        const result =
          await readApiResponse<InspectionApiData>(
            response
          );

        if (result.data) {
          setInspectionData(
            result.data
          );

          initializeFormItems(
            result.data.items || []
          );
        }

        setSuccessMessage(
          result.message ||
            "Inspection started successfully."
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to start inspection."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     COMPLETE INSPECTION
  ======================================================= */

  const handleCompleteInspection =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (!goodsReceivedId) {
        return;
      }

      const validationError =
        validateCompleteForm();

      if (validationError) {
        setError(validationError);
        setSuccessMessage("");
        return;
      }

      try {
        setActionLoading(true);
        setError("");
        setSuccessMessage("");

        const payload = {
          items: formItems.map(
            (item) => ({
              goodsReceivedItemId:
                item.goodsReceivedItemId,

              inspectedQuantity:
                roundQuantity(
                  item.inspectedQuantity
                ),

              passedQuantity:
                roundQuantity(
                  item.passedQuantity
                ),

              failedQuantity:
                roundQuantity(
                  item.failedQuantity
                ),

              damagedQuantity:
                roundQuantity(
                  item.damagedQuantity
                ),

              qualityGrade:
                item.qualityGrade,

              rejectionReason:
                item.rejectionReason.trim() ||
                null,

              damageDescription:
                item.damageDescription.trim() ||
                null,

              remarks:
                item.remarks.trim() ||
                null,
            })
          ),

          remarks:
            inspectionRemarks.trim() ||
            "Inspection completed",

          note:
            inspectionNote.trim() ||
            null,
        };

        const response =
          await tenantFetch(
            `/api/goods-received/${goodsReceivedId}/inspection/complete`,
            {
              method: "PATCH",
              body: JSON.stringify(
                payload
              ),
            }
          );

        const result =
          await readApiResponse<InspectionApiData>(
            response
          );

        if (result.data) {
          setInspectionData(
            result.data
          );

          initializeFormItems(
            result.data.items || []
          );
        }

        setSuccessMessage(
          result.message ||
            "Inspection completed successfully."
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to complete inspection."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     RESET INSPECTION
  ======================================================= */

  const handleResetInspection =
    async () => {
      if (!goodsReceivedId) {
        return;
      }

      const confirmed =
        window.confirm(
          "Reset this inspection? Existing inspection results will be cleared."
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionLoading(true);
        setError("");
        setSuccessMessage("");

        const response =
          await tenantFetch(
            `/api/goods-received/${goodsReceivedId}/inspection/reset`,
            {
              method: "PATCH",
              body: JSON.stringify({
                reason:
                  "Inspection reset from admin panel",
                note:
                  inspectionNote.trim() ||
                  null,
                remarks:
                  inspectionRemarks.trim() ||
                  null,
              }),
            }
          );

        const result =
          await readApiResponse<InspectionApiData>(
            response
          );

        if (result.data) {
          setInspectionData(
            result.data
          );

          initializeFormItems(
            result.data.items || []
          );
        }

        setSuccessMessage(
          result.message ||
            "Inspection reset successfully."
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to reset inspection."
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goBackToReceipt = () => {
    router.push(
      `/admin/supplier-and-purchase/goods-received/${goodsReceivedId}`
    );
  };

  /* =======================================================
     LOADING SCREEN
  ======================================================= */

  if (loading) {
    return (
      <main className="inspection-page">
        <div className="loading-card">
          <div className="spinner" />

          <p>
            Loading goods received
            inspection...
          </p>
        </div>

        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  /* =======================================================
     ERROR WITHOUT DATA
  ======================================================= */

  if (
    !inspectionData ||
    !goodsReceived
  ) {
    return (
      <main className="inspection-page">
        <div className="empty-card">
          <h2>
            Inspection could not be
            loaded
          </h2>

          <p>
            {error ||
              "No inspection data was returned."}
          </p>

          <div className="button-row">
            <button
              type="button"
              className="button button-primary"
              onClick={() =>
                void fetchInspection()
              }
            >
              Try Again
            </button>

            <button
              type="button"
              className="button button-secondary"
              onClick={goBackToReceipt}
            >
              Back to Goods Received
            </button>
          </div>
        </div>

        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <main className="inspection-page">
      <div className="page-container">
        {/* Breadcrumb */}

        <nav className="breadcrumb">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin"
              )
            }
          >
            Admin
          </button>

          <span>/</span>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/supplier-and-purchase"
              )
            }
          >
            Supplier &amp; Purchase
          </button>

          <span>/</span>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/supplier-and-purchase/goods-received"
              )
            }
          >
            Goods Received
          </button>

          <span>/</span>

          <span>
            {displayText(
              goodsReceived.goodsReceivedNumber
            )}
          </span>

          <span>/</span>

          <strong>
            Inspection
          </strong>
        </nav>

        {/* Header */}

        <section className="page-header">
          <div>
            <p className="eyebrow">
              GOODS RECEIVED
              INSPECTION
            </p>

            <h1>
              {displayText(
                goodsReceived.goodsReceivedNumber
              )}
            </h1>

            <p className="subtitle">
              Inspect received items,
              record passed and failed
              quantities, and approve the
              receipt before inventory
              posting.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={actionLoading}
              onClick={() =>
                void fetchInspection(
                  false
                )
              }
            >
              Refresh
            </button>

            {canResetInspection && (
              <button
                type="button"
                className="button button-danger-outline"
                disabled={actionLoading}
                onClick={() =>
                  void handleResetInspection()
                }
              >
                Reset Inspection
              </button>
            )}

            <button
              type="button"
              className="button button-secondary"
              onClick={goBackToReceipt}
            >
              Back to GRN
            </button>
          </div>
        </section>

        {/* Messages */}

        {error && (
          <div
            className="alert alert-error"
            role="alert"
          >
            <strong>
              Action failed
            </strong>

            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            className="alert alert-success"
            role="status"
          >
            <strong>Success</strong>

            <span>
              {successMessage}
            </span>
          </div>
        )}

        {/* Status Cards */}

        <section className="summary-grid">
          <article className="summary-card">
            <p>Receipt Status</p>

            <span
              className={getStatusClass(
                goodsReceived.status
              )}
            >
              {displayText(
                goodsReceived.status
              )}
            </span>

            <small>
              Current goods receipt
              status.
            </small>
          </article>

          <article className="summary-card">
            <p>
              Inspection Status
            </p>

            <span
              className={getStatusClass(
                inspectionStatus
              )}
            >
              {displayText(
                inspectionStatus
              )}
            </span>

            <small>
              Current quality inspection
              status.
            </small>
          </article>

          <article className="summary-card">
            <p>
              Inventory Posting
            </p>

            <span
              className={getStatusClass(
                postingStatus
              )}
            >
              {displayText(
                postingStatus
              )}
            </span>

            <small>
              Stock posting status for
              this receipt.
            </small>
          </article>

          <article className="summary-card">
            <p>
              Accepted Value
            </p>

            <strong className="summary-value">
              {formatCurrency(
                goodsReceived
                  .financialSummary
                  ?.grandTotal,
                goodsReceived.currency ||
                  "BDT"
              )}
            </strong>

            <small>
              Current accepted inventory
              value.
            </small>
          </article>
        </section>

        {/* Receipt Details */}

        <section className="two-column-grid">
          <article className="content-card">
            <div className="card-heading">
              <div>
                <h2>
                  Receipt Information
                </h2>

                <p>
                  Main GRN and supplier
                  information.
                </p>
              </div>
            </div>

            <dl className="detail-list">
              <div>
                <dt>GRN Number</dt>

                <dd>
                  {displayText(
                    goodsReceived.goodsReceivedNumber
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Purchase Order
                </dt>

                <dd>
                  {displayText(
                    goodsReceived.purchaseOrderNumber
                  )}
                </dd>
              </div>

              <div>
                <dt>Supplier</dt>

                <dd>
                  {displayText(
                    goodsReceived
                      .supplierSnapshot
                      ?.businessName
                  )}
                </dd>
              </div>

              <div>
                <dt>Warehouse</dt>

                <dd>
                  {displayText(
                    goodsReceived
                      .warehouseSnapshot
                      ?.warehouseName
                  )}
                </dd>
              </div>

              <div>
                <dt>Received At</dt>

                <dd>
                  {formatDateTime(
                    goodsReceived.receivedAt ||
                      goodsReceived.receivedDate
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="content-card">
            <div className="card-heading">
              <div>
                <h2>
                  Quantity Summary
                </h2>

                <p>
                  Receipt quantities
                  before inventory
                  posting.
                </p>
              </div>
            </div>

            <div className="quantity-grid">
              <div>
                <span>
                  Received
                </span>

                <strong>
                  {formatQuantity(
                    goodsReceived
                      .receivingSummary
                      ?.totalReceivedQuantity
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Accepted
                </span>

                <strong>
                  {formatQuantity(
                    goodsReceived
                      .receivingSummary
                      ?.totalAcceptedQuantity
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Rejected
                </span>

                <strong>
                  {formatQuantity(
                    goodsReceived
                      .receivingSummary
                      ?.totalRejectedQuantity
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Damaged
                </span>

                <strong>
                  {formatQuantity(
                    goodsReceived
                      .receivingSummary
                      ?.totalDamagedQuantity
                  )}
                </strong>
              </div>
            </div>
          </article>
        </section>

        {/* Start Inspection */}

        {canStartInspection && (
          <section className="content-card start-card">
            <div>
              <h2>
                Start Goods Inspection
              </h2>

              <p>
                Starting inspection will
                move all receipt items
                into In Progress status.
              </p>
            </div>

            <button
              type="button"
              className="button button-primary"
              disabled={actionLoading}
              onClick={() =>
                void handleStartInspection()
              }
            >
              {actionLoading
                ? "Starting..."
                : "Start Inspection"}
            </button>
          </section>
        )}

        {/* Inspection Meta */}

        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>
                Inspection Information
              </h2>

              <p>
                Inspection timing and
                general remarks.
              </p>
            </div>
          </div>

          <div className="inspection-meta">
            <div>
              <span>Started At</span>

              <strong>
                {formatDateTime(
                  goodsReceived
                    .inspection
                    ?.startedAt
                )}
              </strong>
            </div>

            <div>
              <span>
                Completed At
              </span>

              <strong>
                {formatDateTime(
                  goodsReceived
                    .inspection
                    ?.completedAt
                )}
              </strong>
            </div>

            <div>
              <span>
                Inspected By
              </span>

              <strong>
                {displayText(
                  goodsReceived
                    .inspection
                    ?.inspectedBy
                )}
              </strong>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>
                Inspection Remarks
              </span>

              <textarea
                rows={3}
                value={
                  inspectionRemarks
                }
                disabled={
                  actionLoading ||
                  isInventoryPosted
                }
                placeholder="General inspection remarks"
                onChange={(event) =>
                  setInspectionRemarks(
                    event.target.value
                  )
                }
              />
            </label>

            <label className="form-field">
              <span>
                Internal Note
              </span>

              <textarea
                rows={3}
                value={inspectionNote}
                disabled={
                  actionLoading ||
                  isInventoryPosted
                }
                placeholder="Optional internal note"
                onChange={(event) =>
                  setInspectionNote(
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        </section>

        {/* Inspection Items */}

        <form
          onSubmit={
            handleCompleteInspection
          }
        >
          <section className="content-card">
            <div className="card-heading item-heading">
              <div>
                <h2>
                  Item Inspection
                </h2>

                <p>
                  Enter item-wise passed,
                  failed and damaged
                  quantities.
                </p>
              </div>

              {canCompleteInspection && (
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    markAllPassed
                  }
                >
                  Mark All Passed
                </button>
              )}
            </div>

            {formItems.length === 0 ? (
              <div className="empty-items">
                No receipt items were
                found.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="inspection-table">
                  <thead>
                    <tr>
                      <th>Product</th>

                      <th>
                        Received
                      </th>

                      <th>
                        Inspected
                      </th>

                      <th>Passed</th>

                      <th>Failed</th>

                      <th>Damaged</th>

                      <th>Grade</th>

                      <th>
                        Item Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {formItems.map(
                      (
                        item,
                        index
                      ) => {
                        const sourceItem =
                          inspectionData.items.find(
                            (
                              inspectionItem
                            ) =>
                              inspectionItem._id ===
                              item.goodsReceivedItemId
                          );

                        const editable =
                          canCompleteInspection &&
                          !actionLoading;

                        return (
                          <tr
                            key={
                              item.goodsReceivedItemId
                            }
                          >
                            <td>
                              <div className="product-cell">
                                <strong>
                                  {
                                    item.productName
                                  }
                                </strong>

                                <span>
                                  SKU:{" "}
                                  {
                                    item.sku
                                  }
                                </span>

                                <span>
                                  Unit:{" "}
                                  {
                                    item.unitName
                                  }
                                </span>
                              </div>
                            </td>

                            <td>
                              <strong>
                                {formatQuantity(
                                  item.receivedQuantity
                                )}
                              </strong>
                            </td>

                            <td>
                              <input
                                className="quantity-input"
                                type="number"
                                min="0"
                                step="0.0001"
                                value={
                                  item.inspectedQuantity
                                }
                                disabled
                                aria-label={`${item.productName} inspected quantity`}
                              />
                            </td>

                            <td>
                              <input
                                className="quantity-input"
                                type="number"
                                min="0"
                                max={
                                  item.inspectedQuantity
                                }
                                step="0.0001"
                                value={
                                  item.passedQuantity
                                }
                                disabled={
                                  !editable
                                }
                                onChange={(
                                  event
                                ) =>
                                  handlePassedQuantityChange(
                                    index,
                                    event
                                  )
                                }
                                aria-label={`${item.productName} passed quantity`}
                              />
                            </td>

                            <td>
                              <input
                                className="quantity-input"
                                type="number"
                                min="0"
                                max={
                                  item.inspectedQuantity
                                }
                                step="0.0001"
                                value={
                                  item.failedQuantity
                                }
                                disabled={
                                  !editable
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleFailedQuantityChange(
                                    index,
                                    event
                                  )
                                }
                                aria-label={`${item.productName} failed quantity`}
                              />
                            </td>

                            <td>
                              <input
                                className="quantity-input"
                                type="number"
                                min="0"
                                max={
                                  item.failedQuantity
                                }
                                step="0.0001"
                                value={
                                  item.damagedQuantity
                                }
                                disabled={
                                  !editable
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateFormItem(
                                    index,
                                    "damagedQuantity",
                                    Math.min(
                                      Math.max(
                                        0,
                                        roundQuantity(
                                          event
                                            .target
                                            .value
                                        )
                                      ),
                                      item.failedQuantity
                                    )
                                  )
                                }
                                aria-label={`${item.productName} damaged quantity`}
                              />
                            </td>

                            <td>
                              <select
                                value={
                                  item.qualityGrade
                                }
                                disabled={
                                  !editable
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateFormItem(
                                    index,
                                    "qualityGrade",
                                    event
                                      .target
                                      .value as QualityGrade
                                  )
                                }
                                aria-label={`${item.productName} quality grade`}
                              >
                                {QUALITY_GRADES.map(
                                  (
                                    grade
                                  ) => (
                                    <option
                                      key={
                                        grade
                                      }
                                      value={
                                        grade
                                      }
                                    >
                                      {
                                        grade
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </td>

                            <td>
                              <span
                                className={getStatusClass(
                                  sourceItem
                                    ?.inspection
                                    ?.status
                                )}
                              >
                                {displayText(
                                  sourceItem
                                    ?.inspection
                                    ?.status
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="item-details-list">
              {formItems.map(
                (item, index) => {
                  const editable =
                    canCompleteInspection &&
                    !actionLoading;

                  const hasFailure =
                    toNumber(
                      item.failedQuantity
                    ) > 0;

                  const hasDamage =
                    toNumber(
                      item.damagedQuantity
                    ) > 0;

                  return (
                    <article
                      className="item-detail-card"
                      key={`${item.goodsReceivedItemId}-details`}
                    >
                      <div className="item-detail-title">
                        <div>
                          <h3>
                            {
                              item.productName
                            }
                          </h3>

                          <p>
                            Item remarks and
                            failure details
                          </p>
                        </div>

                        <span>
                          Line{" "}
                          {index + 1}
                        </span>
                      </div>

                      <div className="form-grid">
                        <label className="form-field">
                          <span>
                            Rejection Reason
                            {hasFailure &&
                              " *"}
                          </span>

                          <input
                            type="text"
                            value={
                              item.rejectionReason
                            }
                            disabled={
                              !editable ||
                              !hasFailure
                            }
                            placeholder={
                              hasFailure
                                ? "Explain why units failed"
                                : "No failed units"
                            }
                            onChange={(
                              event
                            ) =>
                              updateFormItem(
                                index,
                                "rejectionReason",
                                event
                                  .target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label className="form-field">
                          <span>
                            Damage Description
                            {hasDamage &&
                              " *"}
                          </span>

                          <input
                            type="text"
                            value={
                              item.damageDescription
                            }
                            disabled={
                              !editable ||
                              !hasDamage
                            }
                            placeholder={
                              hasDamage
                                ? "Describe the damaged units"
                                : "No damaged units"
                            }
                            onChange={(
                              event
                            ) =>
                              updateFormItem(
                                index,
                                "damageDescription",
                                event
                                  .target
                                  .value
                              )
                            }
                          />
                        </label>

                        <label className="form-field form-field-full">
                          <span>
                            Item Remarks
                          </span>

                          <textarea
                            rows={2}
                            value={
                              item.remarks
                            }
                            disabled={
                              !editable
                            }
                            placeholder="Optional inspection remarks for this item"
                            onChange={(
                              event
                            ) =>
                              updateFormItem(
                                index,
                                "remarks",
                                event
                                  .target
                                  .value
                              )
                            }
                          />
                        </label>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            <div className="totals-row">
              <div>
                <span>
                  Received
                </span>

                <strong>
                  {formatQuantity(
                    formTotals.received
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Inspected
                </span>

                <strong>
                  {formatQuantity(
                    formTotals.inspected
                  )}
                </strong>
              </div>

              <div>
                <span>Passed</span>

                <strong>
                  {formatQuantity(
                    formTotals.passed
                  )}
                </strong>
              </div>

              <div>
                <span>Failed</span>

                <strong>
                  {formatQuantity(
                    formTotals.failed
                  )}
                </strong>
              </div>

              <div>
                <span>Damaged</span>

                <strong>
                  {formatQuantity(
                    formTotals.damaged
                  )}
                </strong>
              </div>
            </div>

            <div className="form-actions">
              {canCompleteInspection && (
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={
                    actionLoading ||
                    formItems.length ===
                      0
                  }
                >
                  {actionLoading
                    ? "Completing..."
                    : "Complete Inspection"}
                </button>
              )}

              {isInspectionCompleted && (
                <div className="completed-note">
                  <span
                    className={getStatusClass(
                      inspectionStatus
                    )}
                  >
                    {inspectionStatus}
                  </span>

                  <p>
                    Inspection was
                    completed on{" "}
                    {formatDateTime(
                      goodsReceived
                        .inspection
                        ?.completedAt
                    )}
                    .
                  </p>
                </div>
              )}

              {canContinueToPosting && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={
                    goBackToReceipt
                  }
                >
                  Continue to Inventory
                  Posting
                </button>
              )}

              {isInventoryPosted && (
                <div className="completed-note">
                  <span className="status status-success">
                    Inventory Posted
                  </span>

                  <p>
                    This inspection is
                    locked because
                    inventory has already
                    been posted.
                  </p>
                </div>
              )}
            </div>
          </section>
        </form>
      </div>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

/* =========================================================
   STYLES
========================================================= */

const pageStyles = `
  .inspection-page {
    min-height: 100vh;
    background: #f6f8fb;
    color: #111827;
    padding: 28px;
  }

  .page-container {
    width: 100%;
    max-width: 1500px;
    margin: 0 auto;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
    color: #64748b;
    font-size: 13px;
  }

  .breadcrumb button {
    border: 0;
    background: transparent;
    padding: 0;
    color: #557098;
    cursor: pointer;
    font: inherit;
  }

  .breadcrumb button:hover {
    color: #f4510b;
  }

  .breadcrumb strong {
    color: #1e293b;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 24px;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #f4510b;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.18em;
  }

  .page-header h1 {
    margin: 0;
    color: #101828;
    font-size: clamp(28px, 4vw, 40px);
    line-height: 1.15;
    letter-spacing: -0.03em;
  }

  .subtitle {
    max-width: 760px;
    margin: 10px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.65;
  }

  .header-actions,
  .button-row,
  .form-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 12px;
  }

  .button {
    min-height: 42px;
    border-radius: 10px;
    padding: 10px 18px;
    border: 1px solid transparent;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease,
      opacity 0.15s ease;
  }

  .button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .button-primary {
    background: #f4510b;
    color: #ffffff;
    box-shadow:
      0 8px 20px rgba(244, 81, 11, 0.18);
  }

  .button-secondary {
    background: #ffffff;
    border-color: #d7dee9;
    color: #26364d;
    box-shadow:
      0 2px 4px rgba(15, 23, 42, 0.05);
  }

  .button-danger-outline {
    background: #ffffff;
    border-color: #fecaca;
    color: #b42318;
  }

  .alert {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
    border: 1px solid;
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 13px;
  }

  .alert strong {
    white-space: nowrap;
  }

  .alert-error {
    border-color: #fecaca;
    background: #fff1f2;
    color: #991b1b;
  }

  .alert-success {
    border-color: #a7f3d0;
    background: #ecfdf5;
    color: #065f46;
  }

  .summary-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 22px;
  }

  .summary-card,
  .content-card,
  .loading-card,
  .empty-card {
    background: #ffffff;
    border: 1px solid #dde4ee;
    border-radius: 15px;
    box-shadow:
      0 3px 10px rgba(15, 23, 42, 0.04);
  }

  .summary-card {
    padding: 20px;
  }

  .summary-card p {
    margin: 0 0 10px;
    color: #60708a;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .summary-card small {
    display: block;
    margin-top: 10px;
    color: #77869d;
    font-size: 12px;
  }

  .summary-value {
    display: block;
    color: #111827;
    font-size: 22px;
  }

  .status {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
  }

  .status-success {
    background: #ecfdf3;
    border-color: #abefc6;
    color: #067647;
  }

  .status-danger {
    background: #fef3f2;
    border-color: #fecdca;
    color: #b42318;
  }

  .status-warning {
    background: #fffaeb;
    border-color: #fedf89;
    color: #b54708;
  }

  .status-neutral {
    background: #f8fafc;
    border-color: #d8e0ea;
    color: #475467;
  }

  .status-info {
    background: #eff8ff;
    border-color: #b2ddff;
    color: #175cd3;
  }

  .two-column-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 18px;
  }

  .content-card {
    padding: 22px;
    margin-bottom: 18px;
  }

  .card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 20px;
  }

  .card-heading h2,
  .start-card h2 {
    margin: 0;
    color: #172033;
    font-size: 17px;
  }

  .card-heading p,
  .start-card p {
    margin: 6px 0 0;
    color: #718096;
    font-size: 13px;
  }

  .detail-list {
    margin: 0;
  }

  .detail-list > div {
    display: grid;
    grid-template-columns:
      minmax(120px, 0.8fr)
      minmax(0, 1.4fr);
    gap: 16px;
    border-bottom: 1px solid #edf1f6;
    padding: 12px 0;
  }

  .detail-list > div:last-child {
    border-bottom: 0;
  }

  .detail-list dt {
    color: #60708a;
    font-size: 13px;
    font-weight: 700;
  }

  .detail-list dd {
    margin: 0;
    color: #1f2937;
    font-size: 13px;
    font-weight: 700;
  }

  .quantity-grid,
  .inspection-meta,
  .totals-row {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .quantity-grid > div,
  .inspection-meta > div,
  .totals-row > div {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    padding: 15px;
  }

  .quantity-grid span,
  .inspection-meta span,
  .totals-row span {
    display: block;
    margin-bottom: 7px;
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
  }

  .quantity-grid strong,
  .inspection-meta strong,
  .totals-row strong {
    color: #172033;
    font-size: 16px;
  }

  .start-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    border-color: #fed7aa;
    background:
      linear-gradient(
        135deg,
        #fffaf5,
        #ffffff
      );
  }

  .form-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 20px;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-field-full {
    grid-column: 1 / -1;
  }

  .form-field > span {
    color: #44546a;
    font-size: 12px;
    font-weight: 800;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #d6dee9;
    border-radius: 9px;
    background: #ffffff;
    color: #172033;
    padding: 10px 12px;
    font: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  textarea {
    resize: vertical;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: #f4510b;
    box-shadow:
      0 0 0 3px
      rgba(244, 81, 11, 0.1);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    background: #f4f6f8;
    color: #667085;
    cursor: not-allowed;
  }

  .table-wrapper {
    width: 100%;
    overflow-x: auto;
    border: 1px solid #e1e7ef;
    border-radius: 12px;
  }

  .inspection-table {
    width: 100%;
    min-width: 1120px;
    border-collapse: collapse;
  }

  .inspection-table th {
    background: #f8fafc;
    border-bottom: 1px solid #e1e7ef;
    padding: 13px 12px;
    color: #57677f;
    font-size: 11px;
    font-weight: 800;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .inspection-table td {
    border-bottom: 1px solid #edf1f5;
    padding: 14px 12px;
    color: #253044;
    font-size: 13px;
    vertical-align: middle;
  }

  .inspection-table tr:last-child td {
    border-bottom: 0;
  }

  .product-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 180px;
  }

  .product-cell strong {
    color: #172033;
  }

  .product-cell span {
    color: #7a879a;
    font-size: 11px;
  }

  .quantity-input {
    min-width: 95px;
  }

  .item-details-list {
    display: grid;
    gap: 14px;
    margin-top: 18px;
  }

  .item-detail-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fbfcfe;
    padding: 18px;
  }

  .item-detail-title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .item-detail-title h3 {
    margin: 0;
    color: #172033;
    font-size: 15px;
  }

  .item-detail-title p {
    margin: 5px 0 0;
    color: #7a879a;
    font-size: 12px;
  }

  .item-detail-title > span {
    border-radius: 999px;
    background: #eef2f7;
    padding: 5px 9px;
    color: #536176;
    font-size: 11px;
    font-weight: 800;
  }

  .totals-row {
    grid-template-columns:
      repeat(5, minmax(0, 1fr));
    margin-top: 20px;
  }

  .form-actions {
    margin-top: 22px;
    border-top: 1px solid #edf1f5;
    padding-top: 20px;
  }

  .completed-note {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-right: auto;
  }

  .completed-note p {
    margin: 0;
    color: #667085;
    font-size: 12px;
  }

  .loading-card,
  .empty-card {
    max-width: 620px;
    margin: 80px auto;
    padding: 40px;
    text-align: center;
  }

  .loading-card p,
  .empty-card p {
    color: #667085;
  }

  .spinner {
    width: 34px;
    height: 34px;
    margin: 0 auto 18px;
    border: 4px solid #e6eaf0;
    border-top-color: #f4510b;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .empty-items {
    border: 1px dashed #ccd5e1;
    border-radius: 12px;
    padding: 32px;
    color: #64748b;
    text-align: center;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1100px) {
    .summary-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .two-column-grid {
      grid-template-columns: 1fr;
    }

    .quantity-grid,
    .inspection-meta {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .totals-row {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .inspection-page {
      padding: 18px 12px;
    }

    .page-header,
    .start-card {
      flex-direction: column;
      align-items: stretch;
    }

    .header-actions,
    .button-row,
    .form-actions {
      justify-content: stretch;
    }

    .header-actions .button,
    .button-row .button,
    .form-actions .button,
    .start-card .button {
      width: 100%;
    }

    .summary-grid,
    .quantity-grid,
    .inspection-meta,
    .totals-row,
    .form-grid {
      grid-template-columns: 1fr;
    }

    .form-field-full {
      grid-column: auto;
    }

    .detail-list > div {
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .completed-note {
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;