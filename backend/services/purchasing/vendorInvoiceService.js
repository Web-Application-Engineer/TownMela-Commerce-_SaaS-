"use strict";

const mongoose = require("mongoose");

const VendorInvoice = require(
  "../../models/VendorInvoice"
);

const VendorInvoiceItem = require(
  "../../models/VendorInvoiceItem"
);

const Supplier = require(
  "../../models/Supplier"
);

const PurchaseOrder = require(
  "../../models/PurchaseOrder"
);

const PurchaseOrderItem = require(
  "../../models/PurchaseOrderItem"
);

const GoodsReceived = require(
  "../../models/GoodsReceived"
);

const GoodsReceivedItem = require(
  "../../models/GoodsReceivedItem"
);

/* =========================================================
   CONSTANTS
========================================================= */

const EDITABLE_STATUSES = [
  "Draft",
];

const DELETABLE_STATUSES = [
  "Draft",
  "Cancelled",
];

const STATUS_TRANSITIONS = {
  Draft: [
    "Pending Approval",
    "Approved",
    "Cancelled",
    "Disputed",
  ],

  "Pending Approval": [
    "Approved",
    "Draft",
    "Cancelled",
    "Disputed",
  ],

  Approved: [
    "Partially Paid",
    "Paid",
    "Overdue",
    "Cancelled",
    "Disputed",
  ],

  "Partially Paid": [
    "Paid",
    "Overdue",
    "Disputed",
  ],

  Paid: [],

  Overdue: [
    "Partially Paid",
    "Paid",
    "Disputed",
  ],

  Cancelled: [],

  Disputed: [
    "Draft",
    "Pending Approval",
    "Approved",
    "Cancelled",
  ],
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/* =========================================================
   ERROR HELPERS
========================================================= */

const createError = (
  message,
  statusCode = 400,
  code = "VENDOR_INVOICE_ERROR"
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
};

const notFoundError = (
  message = "Vendor invoice not found"
) =>
  createError(
    message,
    404,
    "VENDOR_INVOICE_NOT_FOUND"
  );

const conflictError = (
  message
) =>
  createError(
    message,
    409,
    "VENDOR_INVOICE_CONFLICT"
  );

/* =========================================================
   GENERAL HELPERS
========================================================= */

const isValidObjectId = (
  value
) =>
  mongoose.Types.ObjectId.isValid(
    value
  );

const ensureObjectId = (
  value,
  fieldName
) => {
  if (!isValidObjectId(value)) {
    throw createError(
      `Invalid ${fieldName}`,
      400,
      "INVALID_OBJECT_ID"
    );
  }

  return value;
};

const roundAmount = (
  value,
  precision = 2
) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return 0;
  }

  const multiplier =
    10 ** precision;

  return (
    Math.round(
      (numberValue +
        Number.EPSILON) *
        multiplier
    ) / multiplier
  );
};

const normalizeText = (
  value
) => {
  if (
    typeof value !==
    "string"
  ) {
    return value;
  }

  const normalized =
    value.trim();

  return normalized || null;
};

const normalizePage = (
  value
) => {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  return Number.isInteger(
    parsed
  ) && parsed > 0
    ? parsed
    : DEFAULT_PAGE;
};

const normalizeLimit = (
  value
) => {
  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed <= 0
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    parsed,
    MAX_LIMIT
  );
};

const escapeRegex = (
  value
) =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const withTransaction =
  async (callback) => {
    const session =
      await mongoose.startSession();

    try {
      let result;

      await session.withTransaction(
        async () => {
          result =
            await callback(
              session
            );
        }
      );

      return result;
    } finally {
      await session.endSession();
    }
  };

/* =========================================================
   DOCUMENT HELPERS
========================================================= */

const getVendorInvoiceDocument =
  async ({
    tenantId,
    vendorInvoiceId,
    includeDeleted = false,
    session = null,
  }) => {
    ensureObjectId(
      vendorInvoiceId,
      "vendor invoice ID"
    );

    const query = {
      _id: vendorInvoiceId,
      tenant: tenantId,
    };

    if (!includeDeleted) {
      query.isDeleted = false;
    }

    const dbQuery =
      VendorInvoice.findOne(
        query
      );

    if (session) {
      dbQuery.session(session);
    }

    const invoice =
      await dbQuery;

    if (!invoice) {
      throw notFoundError();
    }

    return invoice;
  };

const getInvoiceItems =
  async ({
    tenantId,
    vendorInvoiceId,
    includeDeleted = false,
    session = null,
  }) => {
    const query = {
      tenant: tenantId,
      vendorInvoice:
        vendorInvoiceId,
    };

    if (!includeDeleted) {
      query.isDeleted = false;
    }

    const dbQuery =
      VendorInvoiceItem.find(
        query
      ).sort({
        lineNumber: 1,
      });

    if (session) {
      dbQuery.session(session);
    }

    return dbQuery;
  };

const ensureSupplier =
  async ({
    tenantId,
    supplierId,
    session,
  }) => {
    ensureObjectId(
      supplierId,
      "supplier ID"
    );

    const supplier =
      await Supplier.findOne({
        _id: supplierId,
        tenant: tenantId,
        isDeleted: false,
      }).session(session);

    if (!supplier) {
      throw createError(
        "Supplier not found",
        404,
        "SUPPLIER_NOT_FOUND"
      );
    }

    return supplier;
  };

const ensurePurchaseOrder =
  async ({
    tenantId,
    purchaseOrderId,
    supplierId,
    session,
  }) => {
    if (!purchaseOrderId) {
      return null;
    }

    ensureObjectId(
      purchaseOrderId,
      "purchase order ID"
    );

    const purchaseOrder =
      await PurchaseOrder.findOne({
        _id: purchaseOrderId,
        tenant: tenantId,
        isDeleted: false,
      }).session(session);

    if (!purchaseOrder) {
      throw createError(
        "Purchase order not found",
        404,
        "PURCHASE_ORDER_NOT_FOUND"
      );
    }

    if (
      String(
        purchaseOrder.supplier
      ) !==
      String(supplierId)
    ) {
      throw createError(
        "Purchase order supplier does not match invoice supplier",
        400,
        "SUPPLIER_MISMATCH"
      );
    }

    return purchaseOrder;
  };

const ensureGoodsReceived =
  async ({
    tenantId,
    goodsReceivedId,
    supplierId,
    purchaseOrderId,
    session,
  }) => {
    if (!goodsReceivedId) {
      return null;
    }

    ensureObjectId(
      goodsReceivedId,
      "goods received ID"
    );

    const goodsReceived =
      await GoodsReceived.findOne({
        _id: goodsReceivedId,
        tenant: tenantId,
        isDeleted: false,
      }).session(session);

    if (!goodsReceived) {
      throw createError(
        "Goods received document not found",
        404,
        "GOODS_RECEIVED_NOT_FOUND"
      );
    }

    if (
      goodsReceived.supplier &&
      String(
        goodsReceived.supplier
      ) !==
        String(supplierId)
    ) {
      throw createError(
        "Goods received supplier does not match invoice supplier",
        400,
        "SUPPLIER_MISMATCH"
      );
    }

    if (
      purchaseOrderId &&
      goodsReceived.purchaseOrder &&
      String(
        goodsReceived.purchaseOrder
      ) !==
        String(purchaseOrderId)
    ) {
      throw createError(
        "Goods received purchase order does not match invoice purchase order",
        400,
        "PURCHASE_ORDER_MISMATCH"
      );
    }

    return goodsReceived;
  };

/* =========================================================
   NUMBER GENERATION
========================================================= */

const generateInvoiceNumber =
  async ({
    tenantId,
    session,
  }) => {
    const year =
      new Date().getFullYear();

    const prefix =
      `VIN-${year}-`;

    const latestInvoice =
      await VendorInvoice.findOne({
        tenant: tenantId,

        invoiceNumber: {
          $regex:
            `^${prefix}\\d+$`,
        },
      })
        .sort({
          invoiceNumber: -1,
        })
        .select(
          "invoiceNumber"
        )
        .session(session)
        .lean();

    let nextNumber = 1;

    if (
      latestInvoice
        ?.invoiceNumber
    ) {
      const sequence =
        Number.parseInt(
          latestInvoice
            .invoiceNumber
            .replace(
              prefix,
              ""
            ),
          10
        );

      if (
        Number.isInteger(
          sequence
        )
      ) {
        nextNumber =
          sequence + 1;
      }
    }

    return (
      prefix +
      String(nextNumber).padStart(
        6,
        "0"
      )
    );
  };

/* =========================================================
   SNAPSHOT HELPERS
========================================================= */

const createSupplierSnapshot =
  (supplier) => ({
    supplierCode:
      supplier.supplierCode ||
      supplier.code ||
      null,

    supplierName:
      supplier.supplierName ||
      supplier.name ||
      null,

    taxNumber:
      supplier.taxNumber ||
      supplier.taxId ||
      null,

    phone:
      supplier.phone ||
      null,

    email:
      supplier.email ||
      null,

    address:
      supplier.address
        ?.formattedAddress ||
      supplier.address ||
      null,
  });

const createProductSnapshot =
  ({
    sourceItem,
    itemPayload,
  }) => ({
    productName:
      itemPayload.productName ||
      sourceItem
        ?.productSnapshot
        ?.productName ||
      sourceItem
        ?.productSnapshot
        ?.name ||
      null,

    sku:
      itemPayload.sku ||
      sourceItem
        ?.productSnapshot
        ?.sku ||
      null,

    barcode:
      itemPayload.barcode ||
      sourceItem
        ?.productSnapshot
        ?.barcode ||
      null,

    description:
      itemPayload.description ||
      sourceItem
        ?.productSnapshot
        ?.description ||
      null,

    unitName:
      itemPayload.unitName ||
      sourceItem
        ?.productSnapshot
        ?.unitName ||
      null,

    unitCode:
      itemPayload.unitCode ||
      sourceItem
        ?.productSnapshot
        ?.unitCode ||
      null,
  });

const createVariantSnapshot =
  ({
    sourceItem,
    itemPayload,
  }) => ({
    variantName:
      itemPayload.variantName ||
      sourceItem
        ?.variantSnapshot
        ?.variantName ||
      sourceItem
        ?.variantSnapshot
        ?.name ||
      null,

    sku:
      itemPayload.variantSku ||
      sourceItem
        ?.variantSnapshot
        ?.sku ||
      null,

    barcode:
      itemPayload.variantBarcode ||
      sourceItem
        ?.variantSnapshot
        ?.barcode ||
      null,

    attributes:
      itemPayload.variantAttributes ||
      sourceItem
        ?.variantSnapshot
        ?.attributes ||
      {},
  });

/* =========================================================
   ITEM SOURCE VALIDATION
========================================================= */

const loadItemSources =
  async ({
    tenantId,
    itemPayload,
    purchaseOrderId,
    goodsReceivedId,
    session,
  }) => {
    let purchaseOrderItem =
      null;

    let goodsReceivedItem =
      null;

    if (
      itemPayload.purchaseOrderItem
    ) {
      ensureObjectId(
        itemPayload.purchaseOrderItem,
        "purchase order item ID"
      );

      purchaseOrderItem =
        await PurchaseOrderItem.findOne({
          _id:
            itemPayload.purchaseOrderItem,

          tenant:
            tenantId,

          purchaseOrder:
            purchaseOrderId,

          isDeleted:
            false,
        }).session(session);

      if (
        !purchaseOrderItem
      ) {
        throw createError(
          "Purchase order item not found",
          404,
          "PURCHASE_ORDER_ITEM_NOT_FOUND"
        );
      }
    }

    if (
      itemPayload.goodsReceivedItem
    ) {
      ensureObjectId(
        itemPayload.goodsReceivedItem,
        "goods received item ID"
      );

      goodsReceivedItem =
        await GoodsReceivedItem.findOne({
          _id:
            itemPayload.goodsReceivedItem,

          tenant:
            tenantId,

          goodsReceived:
            goodsReceivedId,

          isDeleted:
            false,
        }).session(session);

      if (
        !goodsReceivedItem
      ) {
        throw createError(
          "Goods received item not found",
          404,
          "GOODS_RECEIVED_ITEM_NOT_FOUND"
        );
      }
    }

    const productId =
      itemPayload.product ||
      goodsReceivedItem?.product ||
      purchaseOrderItem?.product;

    if (!productId) {
      throw createError(
        "Product is required for every invoice item",
        400,
        "PRODUCT_REQUIRED"
      );
    }

    if (
      purchaseOrderItem &&
      goodsReceivedItem &&
      String(
        purchaseOrderItem.product
      ) !==
        String(
          goodsReceivedItem.product
        )
    ) {
      throw createError(
        "Purchase order item and goods received item product mismatch",
        400,
        "ITEM_PRODUCT_MISMATCH"
      );
    }

    return {
      purchaseOrderItem,
      goodsReceivedItem,
      productId,
    };
  };

/* =========================================================
   CREATE ITEM PAYLOAD
========================================================= */

const buildInvoiceItemPayload =
  async ({
    tenantId,
    vendorInvoiceId,
    purchaseOrderId,
    goodsReceivedId,
    itemPayload,
    lineNumber,
    exchangeRate,
    userId,
    session,
  }) => {
    const {
      purchaseOrderItem,
      goodsReceivedItem,
      productId,
    } =
      await loadItemSources({
        tenantId,
        itemPayload,
        purchaseOrderId,
        goodsReceivedId,
        session,
      });

    const invoicedQuantity =
      roundAmount(
        itemPayload
          .invoicedQuantity,
        4
      );

    if (
      invoicedQuantity <= 0
    ) {
      throw createError(
        `Invoice item ${lineNumber} quantity must be greater than zero`,
        400,
        "INVALID_INVOICE_QUANTITY"
      );
    }

    const unitPrice =
      roundAmount(
        itemPayload.unitPrice ??
          purchaseOrderItem
            ?.unitPrice ??
          purchaseOrderItem
            ?.price ??
          0,
        6
      );

    if (unitPrice < 0) {
      throw createError(
        `Invoice item ${lineNumber} unit price cannot be negative`,
        400,
        "INVALID_UNIT_PRICE"
      );
    }

    const acceptedQuantity =
      roundAmount(
        itemPayload
          .acceptedQuantity ??
          goodsReceivedItem
            ?.acceptedQuantity ??
          0,
        4
      );

    const rejectedQuantity =
      roundAmount(
        itemPayload
          .rejectedQuantity ??
          goodsReceivedItem
            ?.rejectedQuantity ??
          0,
        4
      );

    const returnedQuantity =
      roundAmount(
        itemPayload
          .returnedQuantity ??
          0,
        4
      );

    const sourceItem =
      goodsReceivedItem ||
      purchaseOrderItem;

    const invoiceItem =
      new VendorInvoiceItem({
        tenant: tenantId,

        vendorInvoice:
          vendorInvoiceId,

        lineNumber,

        purchaseOrder:
          purchaseOrderId ||
          null,

        purchaseOrderItem:
          purchaseOrderItem?._id ||
          null,

        goodsReceived:
          goodsReceivedId ||
          null,

        goodsReceivedItem:
          goodsReceivedItem?._id ||
          null,

        product:
          productId,

        variant:
          itemPayload.variant ||
          goodsReceivedItem?.variant ||
          purchaseOrderItem?.variant ||
          null,

        productSnapshot:
          createProductSnapshot({
            sourceItem,
            itemPayload,
          }),

        variantSnapshot:
          createVariantSnapshot({
            sourceItem,
            itemPayload,
          }),

        invoicedQuantity,
        acceptedQuantity,
        rejectedQuantity,
        returnedQuantity,

        unit:
          itemPayload.unit ||
          sourceItem?.unit ||
          null,

        conversionFactor:
          itemPayload
            .conversionFactor ??
          sourceItem
            ?.conversionFactor ??
          1,

        unitPrice,

        discount: {
          type:
            itemPayload.discount
              ?.type ||
            "None",

          rate:
            itemPayload.discount
              ?.rate ||
            0,

          amount:
            itemPayload.discount
              ?.amount ||
            0,
        },

        tax: {
          taxCode:
            itemPayload.tax
              ?.taxCode ||
            null,

          taxName:
            itemPayload.tax
              ?.taxName ||
            null,

          taxRate:
            itemPayload.tax
              ?.taxRate ||
            0,

          withholdingTaxRate:
            itemPayload.tax
              ?.withholdingTaxRate ||
            0,

          inclusive:
            Boolean(
              itemPayload.tax
                ?.inclusive
            ),
        },

        shippingAllocation:
          itemPayload
            .shippingAllocation ||
          0,

        otherChargeAllocation:
          itemPayload
            .otherChargeAllocation ||
          0,

        roundOffAllocation:
          itemPayload
            .roundOffAllocation ||
          0,

        matching: {
          purchaseOrderQuantity:
            purchaseOrderItem
              ?.orderedQuantity ??
            purchaseOrderItem
              ?.quantity ??
            0,

          goodsReceivedQuantity:
            goodsReceivedItem
              ?.acceptedQuantity ??
            goodsReceivedItem
              ?.receivedQuantity ??
            0,

          invoiceQuantity:
            invoicedQuantity,

          purchaseOrderUnitPrice:
            purchaseOrderItem
              ?.unitPrice ??
            purchaseOrderItem
              ?.price ??
            0,

          invoiceUnitPrice:
            unitPrice,

          taxVariance:
            itemPayload
              .matching
              ?.taxVariance ||
            0,

          status:
            "Not Matched",
        },

        accountingAllocation: {
          expenseAccount:
            itemPayload
              .accountingAllocation
              ?.expenseAccount ||
            null,

          inventoryAccount:
            itemPayload
              .accountingAllocation
              ?.inventoryAccount ||
            null,

          taxAccount:
            itemPayload
              .accountingAllocation
              ?.taxAccount ||
            null,

          withholdingTaxAccount:
            itemPayload
              .accountingAllocation
              ?.withholdingTaxAccount ||
            null,

          costCenter:
            itemPayload
              .accountingAllocation
              ?.costCenter ||
            null,

          department:
            itemPayload
              .accountingAllocation
              ?.department ||
            null,

          project:
            itemPayload
              .accountingAllocation
              ?.project ||
            null,
        },

        remarks:
          normalizeText(
            itemPayload.remarks
          ),

        status: "Draft",

        createdBy:
          userId,

        updatedBy:
          userId,
      });

    invoiceItem
      .calculateQuantitySummary();

    invoiceItem
      .calculateFinancialSummary({
        exchangeRate,
      });

    return invoiceItem;
  };

/* =========================================================
   RECALCULATE HEADER SUMMARY
========================================================= */

const recalculateInvoiceSummary =
  async ({
    invoice,
    tenantId,
    session,
  }) => {
    const items =
      await VendorInvoiceItem.find({
        tenant: tenantId,

        vendorInvoice:
          invoice._id,

        isDeleted: false,
      }).session(session);

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalWithholdingTax = 0;
    let totalShipping = 0;
    let totalOtherCharges = 0;
    let totalRoundOff = 0;
    let grandTotal = 0;

    for (const item of items) {
      item.calculateQuantitySummary();

      item.calculateFinancialSummary({
        exchangeRate:
          invoice.exchangeRate,
      });

      subtotal +=
        Number(
          item.grossAmount || 0
        );

      totalDiscount +=
        Number(
          item.discount
            ?.amount || 0
        );

      totalTax +=
        Number(
          item.tax
            ?.taxAmount || 0
        );

      totalWithholdingTax +=
        Number(
          item.tax
            ?.withholdingTaxAmount ||
            0
        );

      totalShipping +=
        Number(
          item.shippingAllocation ||
            0
        );

      totalOtherCharges +=
        Number(
          item.otherChargeAllocation ||
            0
        );

      totalRoundOff +=
        Number(
          item.roundOffAllocation ||
            0
        );

      grandTotal +=
        Number(
          item.lineTotal || 0
        );

      await item.save({
        session,
      });
    }

    invoice.subtotal =
      roundAmount(subtotal);

    invoice.discountSummary = {
      ...invoice
        .discountSummary
        ?.toObject?.(),

      discountType:
        totalDiscount > 0
          ? "Fixed"
          : "None",

      discountAmount:
        roundAmount(
          totalDiscount
        ),

      discountRate: 0,
    };

    invoice.taxSummary = {
      ...invoice
        .taxSummary
        ?.toObject?.(),

      taxableAmount:
        roundAmount(
          subtotal -
            totalDiscount
        ),

      taxAmount:
        roundAmount(
          totalTax
        ),

      withholdingTaxAmount:
        roundAmount(
          totalWithholdingTax
        ),
    };

    invoice.shippingAmount =
      roundAmount(
        totalShipping
      );

    invoice.otherCharges =
      roundAmount(
        totalOtherCharges
      );

    invoice.roundOffAmount =
      roundAmount(
        totalRoundOff
      );

    invoice.grandTotal =
      roundAmount(
        grandTotal
      );

    invoice.baseCurrencyTotal =
      roundAmount(
        grandTotal *
          Number(
            invoice.exchangeRate ||
              1
          )
      );

    invoice.calculateFinancialSummary();

    return {
      items,
      summary: {
        subtotal:
          invoice.subtotal,

        totalDiscount,
        totalTax,
        totalWithholdingTax,
        totalShipping,
        totalOtherCharges,
        grandTotal:
          invoice.grandTotal,
      },
    };
  };

/* =========================================================
   CREATE VENDOR INVOICE
========================================================= */

const createVendorInvoice =
  async ({
    tenantId,
    userId,
    payload,
  }) =>
    withTransaction(
      async (session) => {
        if (
          !Array.isArray(
            payload.items
          ) ||
          payload.items.length ===
            0
        ) {
          throw createError(
            "At least one vendor invoice item is required",
            400,
            "VENDOR_INVOICE_ITEMS_REQUIRED"
          );
        }

        const supplier =
          await ensureSupplier({
            tenantId,
            supplierId:
              payload.supplier,
            session,
          });

        const purchaseOrder =
          await ensurePurchaseOrder({
            tenantId,

            purchaseOrderId:
              payload.purchaseOrder,

            supplierId:
              supplier._id,

            session,
          });

        const goodsReceived =
          await ensureGoodsReceived({
            tenantId,

            goodsReceivedId:
              payload.goodsReceived,

            supplierId:
              supplier._id,

            purchaseOrderId:
              purchaseOrder?._id ||
              null,

            session,
          });

        const supplierInvoiceNumber =
          normalizeText(
            payload
              .supplierInvoiceNumber
          );

        if (
          !supplierInvoiceNumber
        ) {
          throw createError(
            "Supplier invoice number is required",
            400,
            "SUPPLIER_INVOICE_NUMBER_REQUIRED"
          );
        }

        const duplicateInvoice =
          await VendorInvoice.findOne({
            tenant: tenantId,

            supplier:
              supplier._id,

            supplierInvoiceNumber,

            isDeleted: false,
          }).session(session);

        if (duplicateInvoice) {
          throw conflictError(
            "This supplier invoice number already exists"
          );
        }

        const invoiceNumber =
          payload.invoiceNumber ||
          (await generateInvoiceNumber({
            tenantId,
            session,
          }));

        const invoice =
          new VendorInvoice({
            tenant: tenantId,

            invoiceNumber,

            supplierInvoiceNumber,

            invoiceDate:
              payload.invoiceDate ||
              new Date(),

            postingDate:
              payload.postingDate ||
              null,

            dueDate:
              payload.dueDate,

            accountingPeriod:
              normalizeText(
                payload.accountingPeriod
              ),

            supplier:
              supplier._id,

            supplierSnapshot:
              createSupplierSnapshot(
                supplier
              ),

            purchaseOrder:
              purchaseOrder?._id ||
              null,

            goodsReceived:
              goodsReceived?._id ||
              null,

            warehouse:
              payload.warehouse ||
              goodsReceived
                ?.warehouse ||
              purchaseOrder
                ?.warehouse ||
              null,

            currency:
              payload.currency ||
              purchaseOrder
                ?.currency ||
              "BDT",

            exchangeRate:
              payload.exchangeRate ||
              1,

            baseCurrency:
              payload.baseCurrency ||
              "BDT",

            paymentTerms:
              normalizeText(
                payload.paymentTerms
              ),

            remarks:
              normalizeText(
                payload.remarks
              ),

            internalNotes:
              normalizeText(
                payload.internalNotes
              ),

            attachments:
              Array.isArray(
                payload.attachments
              )
                ? payload.attachments.map(
                    (
                      attachment
                    ) => ({
                      ...attachment,

                      uploadedBy:
                        attachment
                          .uploadedBy ||
                        userId,

                      uploadedAt:
                        attachment
                          .uploadedAt ||
                        new Date(),
                    })
                  )
                : [],

            approval: {
              required:
                Boolean(
                  payload.approval
                    ?.required
                ),

              status:
                payload.approval
                  ?.required
                  ? "Pending"
                  : "Not Required",
            },

            matching: {
              status:
                "Not Matched",
            },

            status: "Draft",

            statusHistory: [
              {
                status: "Draft",

                changedAt:
                  new Date(),

                changedBy:
                  userId,

                remarks:
                  "Vendor invoice created",
              },
            ],

            createdBy:
              userId,

            updatedBy:
              userId,
          });

        await invoice.save({
          session,
        });

        const invoiceItems = [];

        for (
          let index = 0;
          index <
          payload.items.length;
          index += 1
        ) {
          const item =
            await buildInvoiceItemPayload({
              tenantId,

              vendorInvoiceId:
                invoice._id,

              purchaseOrderId:
                purchaseOrder?._id ||
                null,

              goodsReceivedId:
                goodsReceived?._id ||
                null,

              itemPayload:
                payload.items[index],

              lineNumber:
                index + 1,

              exchangeRate:
                invoice.exchangeRate,

              userId,
              session,
            });

          await item.save({
            session,
          });

          invoiceItems.push(item);
        }

        await recalculateInvoiceSummary({
          invoice,
          tenantId,
          session,
        });

        await invoice.save({
          session,
        });

        return {
          invoice,
          items:
            invoiceItems,
        };
      }
    );

/* =========================================================
   GET VENDOR INVOICE LIST
========================================================= */

const getVendorInvoiceList =
  async ({
    tenantId,
    query = {},
  }) => {
    const page =
      normalizePage(
        query.page
      );

    const limit =
      normalizeLimit(
        query.limit
      );

    const skip =
      (page - 1) *
      limit;

    const filter = {
      tenant: tenantId,
      isDeleted:
        query.includeDeleted ===
        "true"
          ? {
              $in: [
                true,
                false,
              ],
            }
          : false,
    };

    if (query.status) {
      filter.status =
        query.status;
    }

    if (query.supplier) {
      ensureObjectId(
        query.supplier,
        "supplier ID"
      );

      filter.supplier =
        query.supplier;
    }

    if (
      query.purchaseOrder
    ) {
      ensureObjectId(
        query.purchaseOrder,
        "purchase order ID"
      );

      filter.purchaseOrder =
        query.purchaseOrder;
    }

    if (
      query.goodsReceived
    ) {
      ensureObjectId(
        query.goodsReceived,
        "goods received ID"
      );

      filter.goodsReceived =
        query.goodsReceived;
    }

    if (
      query.paymentStatus
    ) {
      filter[
        "paymentSummary.paymentStatus"
      ] =
        query.paymentStatus;
    }

    if (
      query.matchingStatus
    ) {
      filter[
        "matching.status"
      ] =
        query.matchingStatus;
    }

    if (
      query.approvalStatus
    ) {
      filter[
        "approval.status"
      ] =
        query.approvalStatus;
    }

    if (
      query.dateFrom ||
      query.dateTo
    ) {
      filter.invoiceDate = {};

      if (query.dateFrom) {
        filter.invoiceDate.$gte =
          new Date(
            query.dateFrom
          );
      }

      if (query.dateTo) {
        const endDate =
          new Date(
            query.dateTo
          );

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.invoiceDate.$lte =
          endDate;
      }
    }

    if (
      query.dueDateFrom ||
      query.dueDateTo
    ) {
      filter.dueDate = {};

      if (
        query.dueDateFrom
      ) {
        filter.dueDate.$gte =
          new Date(
            query.dueDateFrom
          );
      }

      if (
        query.dueDateTo
      ) {
        const endDate =
          new Date(
            query.dueDateTo
          );

        endDate.setHours(
          23,
          59,
          59,
          999
        );

        filter.dueDate.$lte =
          endDate;
      }
    }

    if (
      query.overdue ===
      "true"
    ) {
      filter.dueDate = {
        $lt: new Date(),
      };

      filter.status = {
        $nin: [
          "Paid",
          "Cancelled",
        ],
      };

      filter[
        "paymentSummary.outstandingAmount"
      ] = {
        $gt: 0,
      };
    }

    if (query.search) {
      const expression =
        new RegExp(
          escapeRegex(
            query.search
          ),
          "i"
        );

      filter.$or = [
        {
          invoiceNumber:
            expression,
        },

        {
          supplierInvoiceNumber:
            expression,
        },

        {
          "supplierSnapshot.supplierName":
            expression,
        },

        {
          "supplierSnapshot.supplierCode":
            expression,
        },
      ];
    }

    const allowedSortFields =
      new Set([
        "invoiceDate",
        "dueDate",
        "createdAt",
        "updatedAt",
        "invoiceNumber",
        "grandTotal",
        "status",
      ]);

    const sortBy =
      allowedSortFields.has(
        query.sortBy
      )
        ? query.sortBy
        : "createdAt";

    const sortOrder =
      query.sortOrder ===
      "asc"
        ? 1
        : -1;

    const [
      invoices,
      total,
    ] = await Promise.all([
      VendorInvoice.find(
        filter
      )
        .populate(
          "supplier",
          "supplierCode supplierName name email phone"
        )
        .populate(
          "purchaseOrder",
          "purchaseOrderNumber orderNumber status"
        )
        .populate(
          "goodsReceived",
          "goodsReceivedNumber grnNumber status"
        )
        .sort({
          [sortBy]:
            sortOrder,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      VendorInvoice.countDocuments(
        filter
      ),
    ]);

    return {
      data: invoices,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    };
  };

/* =========================================================
   GET VENDOR INVOICE BY ID
========================================================= */

const getVendorInvoiceById =
  async ({
    tenantId,
    vendorInvoiceId,
    includeDeleted = false,
  }) => {
    ensureObjectId(
      vendorInvoiceId,
      "vendor invoice ID"
    );

    const invoice =
      await VendorInvoice.findOne({
        _id:
          vendorInvoiceId,

        tenant:
          tenantId,

        ...(includeDeleted
          ? {}
          : {
              isDeleted:
                false,
            }),
      })
        .populate(
          "supplier"
        )
        .populate(
          "purchaseOrder"
        )
        .populate(
          "goodsReceived"
        )
        .populate(
          "warehouse"
        )
        .populate(
          "createdBy",
          "name email"
        )
        .populate(
          "updatedBy",
          "name email"
        )
        .populate(
          "approval.approvedBy",
          "name email"
        )
        .populate(
          "approval.rejectedBy",
          "name email"
        )
        .lean();

    if (!invoice) {
      throw notFoundError();
    }

    const items =
      await VendorInvoiceItem.find({
        tenant: tenantId,

        vendorInvoice:
          vendorInvoiceId,

        ...(includeDeleted
          ? {}
          : {
              isDeleted:
                false,
            }),
      })
        .sort({
          lineNumber: 1,
        })
        .populate(
          "product"
        )
        .populate(
          "purchaseOrderItem"
        )
        .populate(
          "goodsReceivedItem"
        )
        .lean();

    return {
      ...invoice,
      items,
    };
  };

/* =========================================================
   UPDATE VENDOR INVOICE
========================================================= */

const updateVendorInvoice =
  async ({
    tenantId,
    vendorInvoiceId,
    userId,
    payload,
  }) =>
    withTransaction(
      async (session) => {
        const invoice =
          await getVendorInvoiceDocument({
            tenantId,
            vendorInvoiceId,
            session,
          });

        if (
          !EDITABLE_STATUSES.includes(
            invoice.status
          )
        ) {
          throw createError(
            "Only draft vendor invoices can be edited",
            400,
            "VENDOR_INVOICE_NOT_EDITABLE"
          );
        }

        if (
          payload.supplier &&
          String(
            payload.supplier
          ) !==
            String(
              invoice.supplier
            )
        ) {
          throw createError(
            "Supplier cannot be changed after invoice creation",
            400,
            "SUPPLIER_CHANGE_NOT_ALLOWED"
          );
        }

        const editableFields = [
          "supplierInvoiceNumber",
          "invoiceDate",
          "postingDate",
          "dueDate",
          "accountingPeriod",
          "warehouse",
          "currency",
          "exchangeRate",
          "baseCurrency",
          "paymentTerms",
          "remarks",
          "internalNotes",
        ];

        for (
          const field of
          editableFields
        ) {
          if (
            Object.prototype.hasOwnProperty.call(
              payload,
              field
            )
          ) {
            invoice[field] =
              payload[field];
          }
        }

        if (
          payload.approval
        ) {
          invoice.approval.required =
            Boolean(
              payload.approval
                .required
            );

          invoice.approval.status =
            invoice.approval
              .required
              ? "Pending"
              : "Not Required";
        }

        if (
          Array.isArray(
            payload.attachments
          )
        ) {
          invoice.attachments =
            payload.attachments.map(
              (
                attachment
              ) => ({
                ...attachment,

                uploadedBy:
                  attachment
                    .uploadedBy ||
                  userId,

                uploadedAt:
                  attachment
                    .uploadedAt ||
                  new Date(),
              })
            );
        }

        invoice.updatedBy =
          userId;

        if (
          Array.isArray(
            payload.items
          )
        ) {
          if (
            payload.items.length ===
            0
          ) {
            throw createError(
              "At least one vendor invoice item is required",
              400,
              "VENDOR_INVOICE_ITEMS_REQUIRED"
            );
          }

          await VendorInvoiceItem.updateMany(
            {
              tenant:
                tenantId,

              vendorInvoice:
                invoice._id,

              isDeleted:
                false,
            },

            {
              $set: {
                isDeleted:
                  true,

                deletedAt:
                  new Date(),

                deletedBy:
                  userId,

                deleteReason:
                  "Replaced during invoice update",

                updatedBy:
                  userId,
              },
            },

            {
              session,
            }
          );

          for (
            let index = 0;
            index <
            payload.items.length;
            index += 1
          ) {
            const item =
              await buildInvoiceItemPayload({
                tenantId,

                vendorInvoiceId:
                  invoice._id,

                purchaseOrderId:
                  invoice.purchaseOrder,

                goodsReceivedId:
                  invoice.goodsReceived,

                itemPayload:
                  payload.items[index],

                lineNumber:
                  index + 1,

                exchangeRate:
                  invoice.exchangeRate,

                userId,
                session,
              });

            await item.save({
              session,
            });
          }
        }

        await recalculateInvoiceSummary({
          invoice,
          tenantId,
          session,
        });

        await invoice.save({
          session,
        });

        return getVendorInvoiceById({
          tenantId,

          vendorInvoiceId:
            invoice._id,
        });
      }
    );

/* =========================================================
   THREE-WAY MATCHING
========================================================= */

const performThreeWayMatching =
  async ({
    tenantId,
    vendorInvoiceId,
    userId,
    payload = {},
  }) =>
    withTransaction(
      async (session) => {
        const invoice =
          await getVendorInvoiceDocument({
            tenantId,
            vendorInvoiceId,
            session,
          });

        if (
          invoice.status ===
          "Cancelled"
        ) {
          throw createError(
            "Cancelled vendor invoice cannot be matched",
            400,
            "CANCELLED_INVOICE_MATCHING_NOT_ALLOWED"
          );
        }

        const items =
          await getInvoiceItems({
            tenantId,

            vendorInvoiceId:
              invoice._id,

            session,
          });

        if (
          items.length === 0
        ) {
          throw createError(
            "Vendor invoice has no active items",
            400,
            "INVOICE_ITEMS_NOT_FOUND"
          );
        }

        const quantityTolerance =
          Number(
            payload.quantityTolerance ??
              0
          );

        const priceTolerance =
          Number(
            payload.priceTolerance ??
              0
          );

        const taxTolerance =
          Number(
            payload.taxTolerance ??
              0
          );

        let matchedItems = 0;
        let mismatchedItems = 0;

        const mismatchReasons =
          [];

        for (const item of items) {
          const result =
            item.calculateMatching({
              quantityTolerance,
              priceTolerance,
              taxTolerance,
              userId,
            });

          item.updatedBy =
            userId;

          await item.save({
            session,
          });

          if (
            result.status ===
            "Matched"
          ) {
            matchedItems += 1;
          } else {
            mismatchedItems +=
              1;

            mismatchReasons.push(
              `Line ${item.lineNumber}: ${result.status}`
            );
          }
        }

        const totalItems =
          items.length;

        if (
          matchedItems ===
          totalItems
        ) {
          invoice.matching.status =
            "Matched";

          invoice.matching.purchaseOrderMatched =
            Boolean(
              invoice.purchaseOrder
            );

          invoice.matching.goodsReceivedMatched =
            Boolean(
              invoice.goodsReceived
            );

          invoice.matching.quantityMatched =
            true;

          invoice.matching.priceMatched =
            true;

          invoice.matching.taxMatched =
            true;

          invoice.matching.mismatchReason =
            null;
        } else if (
          matchedItems > 0
        ) {
          invoice.matching.status =
            "Partially Matched";

          invoice.matching.quantityMatched =
            false;

          invoice.matching.priceMatched =
            false;

          invoice.matching.taxMatched =
            false;

          invoice.matching.mismatchReason =
            mismatchReasons.join(
              "; "
            );
        } else {
          invoice.matching.status =
            "Mismatch";

          invoice.matching.quantityMatched =
            false;

          invoice.matching.priceMatched =
            false;

          invoice.matching.taxMatched =
            false;

          invoice.matching.mismatchReason =
            mismatchReasons.join(
              "; "
            );
        }

        invoice.matching.matchedAt =
          new Date();

        invoice.matching.matchedBy =
          userId;

        invoice.updatedBy =
          userId;

        await invoice.save({
          session,
        });

        return {
          invoiceId:
            invoice._id,

          matchingStatus:
            invoice.matching
              .status,

          totalItems,
          matchedItems,
          mismatchedItems,

          items: items.map(
            (item) => ({
              itemId:
                item._id,

              lineNumber:
                item.lineNumber,

              product:
                item.product,

              matching:
                item.matching,
            })
          ),
        };
      }
    );

/* =========================================================
   CHANGE VENDOR INVOICE STATUS
========================================================= */

const changeVendorInvoiceStatus =
  async ({
    tenantId,
    vendorInvoiceId,
    userId,
    status,
    remarks = null,
  }) =>
    withTransaction(
      async (session) => {
        const invoice =
          await getVendorInvoiceDocument({
            tenantId,
            vendorInvoiceId,
            session,
          });

        const allowedStatuses =
          STATUS_TRANSITIONS[
            invoice.status
          ] || [];

        if (
          !allowedStatuses.includes(
            status
          )
        ) {
          throw createError(
            `Cannot change vendor invoice status from "${invoice.status}" to "${status}"`,
            400,
            "INVALID_VENDOR_INVOICE_STATUS_TRANSITION"
          );
        }

        if (
          status ===
          "Approved"
        ) {
          if (
            invoice.approval
              ?.required &&
            invoice.approval
              ?.status !==
              "Approved"
          ) {
            invoice.approval.status =
              "Approved";

            invoice.approval.approvedAt =
              new Date();

            invoice.approval.approvedBy =
              userId;
          }

          if (
            invoice.matching
              ?.status ===
            "Mismatch"
          ) {
            throw createError(
              "Vendor invoice with matching mismatch cannot be approved",
              400,
              "MATCHING_MISMATCH"
            );
          }
        }

        if (
          status ===
          "Pending Approval"
        ) {
          invoice.approval.required =
            true;

          invoice.approval.status =
            "Pending";

          invoice.approval.submittedAt =
            new Date();

          invoice.approval.submittedBy =
            userId;
        }

        if (
          status ===
          "Paid" &&
          invoice.paymentSummary
            ?.paymentStatus !==
            "Paid"
        ) {
          throw createError(
            "Invoice cannot be marked Paid while outstanding amount remains",
            400,
            "OUTSTANDING_AMOUNT_REMAINS"
          );
        }

        if (
          status ===
          "Cancelled" &&
          Number(
            invoice.paymentSummary
              ?.totalPaid || 0
          ) > 0
        ) {
          throw createError(
            "Paid or partially paid invoice cannot be cancelled",
            400,
            "PAID_INVOICE_CANNOT_BE_CANCELLED"
          );
        }

        invoice.addStatusHistory({
          status,
          userId,
          remarks,
        });

        await invoice.save({
          session,
        });

        return invoice;
      }
    );

/* =========================================================
   DELETE VENDOR INVOICE
========================================================= */

const deleteVendorInvoice =
  async ({
    tenantId,
    vendorInvoiceId,
    userId,
    reason = null,
  }) =>
    withTransaction(
      async (session) => {
        const invoice =
          await getVendorInvoiceDocument({
            tenantId,
            vendorInvoiceId,
            session,
          });

        if (
          !DELETABLE_STATUSES.includes(
            invoice.status
          )
        ) {
          throw createError(
            "Only draft or cancelled vendor invoices can be deleted",
            400,
            "VENDOR_INVOICE_NOT_DELETABLE"
          );
        }

        invoice.softDelete({
          userId,
          reason,
        });

        await invoice.save({
          session,
        });

        await VendorInvoiceItem.updateMany(
          {
            tenant: tenantId,

            vendorInvoice:
              invoice._id,

            isDeleted: false,
          },

          {
            $set: {
              isDeleted: true,
              deletedAt:
                new Date(),
              deletedBy:
                userId,
              deleteReason:
                normalizeText(
                  reason
                ) ||
                "Parent vendor invoice deleted",
              updatedBy:
                userId,
            },
          },

          {
            session,
          }
        );

        return {
          vendorInvoiceId:
            invoice._id,

          deleted: true,
        };
      }
    );

/* =========================================================
   RESTORE VENDOR INVOICE
========================================================= */

const restoreVendorInvoice =
  async ({
    tenantId,
    vendorInvoiceId,
    userId,
  }) =>
    withTransaction(
      async (session) => {
        const invoice =
          await getVendorInvoiceDocument({
            tenantId,
            vendorInvoiceId,
            includeDeleted:
              true,
            session,
          });

        if (
          !invoice.isDeleted
        ) {
          throw createError(
            "Vendor invoice is not deleted",
            400,
            "VENDOR_INVOICE_NOT_DELETED"
          );
        }

        const duplicateInvoice =
          await VendorInvoice.findOne({
            tenant: tenantId,

            supplier:
              invoice.supplier,

            supplierInvoiceNumber:
              invoice.supplierInvoiceNumber,

            isDeleted:
              false,

            _id: {
              $ne: invoice._id,
            },
          }).session(session);

        if (duplicateInvoice) {
          throw conflictError(
            "Cannot restore because another active invoice has the same supplier invoice number"
          );
        }

        invoice.restore({
          userId,
        });

        await invoice.save({
          session,
        });

        await VendorInvoiceItem.updateMany(
          {
            tenant: tenantId,

            vendorInvoice:
              invoice._id,

            isDeleted:
              true,
          },

          {
            $set: {
              isDeleted:
                false,

              deletedAt:
                null,

              deletedBy:
                null,

              deleteReason:
                null,

              updatedBy:
                userId,
            },
          },

          {
            session,
          }
        );

        return getVendorInvoiceById({
          tenantId,

          vendorInvoiceId:
            invoice._id,
        });
      }
    );

/* =========================================================
   OUTSTANDING SUMMARY
========================================================= */

const getVendorInvoiceOutstandingSummary =
  async ({
    tenantId,
    supplierId = null,
  }) => {
    if (supplierId) {
      ensureObjectId(
        supplierId,
        "supplier ID"
      );
    }

    return VendorInvoice
      .getOutstandingSummary({
        tenantId,
        supplierId,
      });
  };

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createVendorInvoice,
  getVendorInvoiceList,
  getVendorInvoiceById,
  updateVendorInvoice,
  performThreeWayMatching,
  changeVendorInvoiceStatus,
  deleteVendorInvoice,
  restoreVendorInvoice,
  getVendorInvoiceOutstandingSummary,
};