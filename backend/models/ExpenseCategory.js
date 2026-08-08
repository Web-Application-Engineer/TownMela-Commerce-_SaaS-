const mongoose = require("mongoose");

const CATEGORY_TYPES = [
  "operating",
  "marketing",
  "courier",
  "packaging",
  "payment",
  "salary",
  "utility",
  "rent",
  "tax",
  "financial",
  "other",
];

const expenseCategorySchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
    immutable: true,
    index: true,
  },

  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },

  name: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    default: null,
    trim: true,
  },

  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExpenseCategory",
    default: null,
  },

  categoryType: {
    type: String,
    enum: CATEGORY_TYPES,
    default: "other",
  },

  color: {
    type: String,
    default: "#64748B",
  },

  icon: {
    type: String,
    default: "folder",
  },

  sortOrder: {
    type: Number,
    default: 0,
    min: 0,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  isSystem: {
    type: Boolean,
    default: false,
    immutable: true,
  },

  allowManualEntry: {
    type: Boolean,
    default: true,
  },

  defaultFinancialEventType: {
    type: String,
    default: "operating_expense",
    trim: true,
  },

  budgetEnabled: {
    type: Boolean,
    default: false,
  },

  notes: {
    type: String,
    default: null,
    trim: true,
  },
},{
  timestamps:true,
  minimize:false,
  strict:"throw",
});

expenseCategorySchema.index(
  { tenant:1, code:1 },
  { unique:true, name:"tenant_expense_category_code_unique" }
);

expenseCategorySchema.index(
  { tenant:1, name:1 },
  { unique:true, name:"tenant_expense_category_name_unique" }
);

expenseCategorySchema.index({
  tenant:1,
  parent:1,
  sortOrder:1,
});

expenseCategorySchema.index({
  tenant:1,
  categoryType:1,
  isActive:1,
});

expenseCategorySchema.pre("deleteOne",{document:true,query:false},function(next){
  if(this.isSystem){
    return next(new Error("System expense categories cannot be deleted."));
  }
  next();
});

module.exports = mongoose.model(
  "ExpenseCategory",
  expenseCategorySchema
);
