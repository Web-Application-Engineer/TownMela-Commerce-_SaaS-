const mongoose = require("mongoose");

const PAYMENT_METHODS = [
  "cash","bank","mobile_banking","card","cheque","adjustment","other"
];

const EXPENSE_STATUSES = [
  "draft","approved","paid","cancelled"
];

const expenseSchema = new mongoose.Schema({
  tenant:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Tenant",
    required:true,
    immutable:true,
    index:true,
  },

  expenseNumber:{
    type:String,
    required:true,
    trim:true,
    uppercase:true,
  },

  category:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"ExpenseCategory",
    required:true,
    index:true,
  },

  title:{
    type:String,
    required:true,
    trim:true,
  },

  description:{
    type:String,
    default:null,
    trim:true,
  },

  amount:{
    type:mongoose.Schema.Types.Decimal128,
    required:true,
    min:0,
  },

  currency:{
    type:String,
    default:"BDT",
    uppercase:true,
    trim:true,
  },

  expenseDate:{
    type:Date,
    required:true,
    default:Date.now,
    index:true,
  },

  paymentMethod:{
    type:String,
    enum:PAYMENT_METHODS,
    default:"cash",
  },

  status:{
    type:String,
    enum:EXPENSE_STATUSES,
    default:"draft",
    index:true,
  },

  vendor:{
    type:String,
    default:null,
    trim:true,
  },

  referenceNumber:{
    type:String,
    default:null,
    trim:true,
  },

  financialEvent:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"FinancialEvent",
    default:null,
  },

  approvedBy:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    default:null,
  },

  approvedAt:{
    type:Date,
    default:null,
  },

  paidAt:{
    type:Date,
    default:null,
  },

  attachments:[{
    fileName:String,
    fileUrl:String,
    uploadedAt:{
      type:Date,
      default:Date.now,
    }
  }],

  notes:{
    type:String,
    default:null,
    trim:true,
  }
},{
  timestamps:true,
  minimize:false,
  strict:"throw",
});

expenseSchema.index(
  {tenant:1,expenseNumber:1},
  {unique:true,name:"tenant_expense_number_unique"}
);

expenseSchema.index({
  tenant:1,
  category:1,
  expenseDate:-1,
});

expenseSchema.index({
  tenant:1,
  status:1,
  expenseDate:-1,
});

expenseSchema.index({
  tenant:1,
  financialEvent:1,
});

module.exports=mongoose.model("Expense",expenseSchema);
