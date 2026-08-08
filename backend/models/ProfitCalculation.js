const mongoose = require("mongoose");

const CALCULATION_STATUS = [
  "pending",
  "processing",
  "completed",
  "failed",
  "superseded",
];

const decimalField = () => ({
  type: mongoose.Schema.Types.Decimal128,
  required: true,
  default: () => mongoose.Types.Decimal128.fromString("0"),
});

const summarySchema = new mongoose.Schema({
  grossRevenue: decimalField(),
  totalDiscount: decimalField(),
  netRevenue: decimalField(),
  cogs: decimalField(),
  grossProfit: decimalField(),
  courierCost: decimalField(),
  packagingCost: decimalField(),
  paymentFee: decimalField(),
  marketplaceFee: decimalField(),
  marketingCost: decimalField(),
  operatingExpense: decimalField(),
  financialCost: decimalField(),
  tax: decimalField(),
  netProfit: decimalField(),
  grossMarginPercent: decimalField(),
  netMarginPercent: decimalField(),
},{_id:false});

const profitCalculationSchema = new mongoose.Schema({
  tenant:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Tenant",
    required:true,
    immutable:true,
    index:true,
  },

  order:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Order",
    required:true,
    immutable:true,
  },

  orderNumber:{
    type:String,
    required:true,
    uppercase:true,
    trim:true,
    immutable:true,
  },

  saleFinancialSnapshot:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"SaleFinancialSnapshot",
    required:true,
    immutable:true,
  },

  calculationVersion:{
    type:Number,
    required:true,
    default:1,
    min:1,
    immutable:true,
  },

  status:{
    type:String,
    enum:CALCULATION_STATUS,
    default:"pending",
    index:true,
  },

  currency:{
    type:String,
    default:"BDT",
    uppercase:true,
    trim:true,
  },

  salesChannel:{
    type:String,
    default:"website",
    lowercase:true,
    trim:true,
  },

  customer:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Customer",
    default:null,
  },

  calculatedAt:{
    type:Date,
    default:null,
  },

  summary:{
    type:summarySchema,
    required:true,
    default:()=>({}),
  },

  sourceEventCount:{
    type:Number,
    default:0,
    min:0,
  },

  checksum:{
    type:String,
    default:null,
    trim:true,
  },

  errorMessage:{
    type:String,
    default:null,
    trim:true,
  }

},{
  timestamps:true,
  minimize:false,
  strict:"throw",
});

profitCalculationSchema.pre("validate",function(next){
  if(this.status==="completed" && !this.calculatedAt){
    this.calculatedAt=new Date();
  }
  next();
});

profitCalculationSchema.index(
 {tenant:1,order:1,calculationVersion:1},
 {unique:true,name:"tenant_order_profitcalc_unique"}
);

profitCalculationSchema.index({
 tenant:1,
 status:1,
 createdAt:1,
});

profitCalculationSchema.index({
 tenant:1,
 salesChannel:1,
 calculatedAt:-1,
});

profitCalculationSchema.index({
 tenant:1,
 customer:1,
 calculatedAt:-1,
});

module.exports=mongoose.model(
 "ProfitCalculation",
 profitCalculationSchema
);
