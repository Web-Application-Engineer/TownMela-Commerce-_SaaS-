const mongoose = require("mongoose");

const decimalField = () => ({
  type: mongoose.Schema.Types.Decimal128,
  required: true,
  default: () => mongoose.Types.Decimal128.fromString("0"),
});

const businessMetricDailySchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    immutable: true,
    index: true,
  },

  metricDate: {
    type: Date,
    required: true,
    index: true,
  },

  currency: {
    type: String,
    default: "BDT",
    uppercase: true,
    trim: true,
  },

  sales: {
    orders: { type: Number, default: 0 },
    deliveredOrders: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    grossRevenue: decimalField(),
    discount: decimalField(),
    netRevenue: decimalField(),
  },

  profit: {
    cogs: decimalField(),
    grossProfit: decimalField(),
    courierCost: decimalField(),
    packagingCost: decimalField(),
    paymentFee: decimalField(),
    marketingCost: decimalField(),
    operatingExpense: decimalField(),
    tax: decimalField(),
    netProfit: decimalField(),
    grossMarginPercent: decimalField(),
    netMarginPercent: decimalField(),
  },

  inventory: {
    productsSold: { type: Number, default: 0 },
    unitsSold: { type: Number, default: 0 },
    inventoryLoss: decimalField(),
  },

  customers: {
    newCustomers: { type: Number, default: 0 },
    returningCustomers: { type: Number, default: 0 },
  },

  calculationVersion: {
    type: Number,
    default: 1,
    min: 1,
  },

  sourceEventCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  generatedAt: {
    type: Date,
    default: Date.now,
  },

  checksum: {
    type: String,
    default: null,
    trim: true,
  }
},{
  timestamps:true,
  minimize:false,
  strict:"throw",
});

businessMetricDailySchema.index(
  { tenant:1, metricDate:1 },
  { unique:true, name:"tenant_metric_date_unique" }
);

businessMetricDailySchema.index({
  tenant:1,
  generatedAt:-1,
});

module.exports = mongoose.model(
  "BusinessMetricDaily",
  businessMetricDailySchema
);
