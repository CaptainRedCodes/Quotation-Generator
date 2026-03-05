export const APP_CONFIG = {
  companyPrefix: 'ATPL',
  defaultGstPercent: 18,
  defaultCurrency: 'INR',
  currencySymbol: '₹',
} as const

export const QUOTATION_CONFIG = {
  minValidDays: 15,
  deliveryWeeks: 4,
  advancePercentage: 100,
} as const

export const PDF_CONFIG = {
  pageLeft: 40,
  pageRight: 565,
  logoWidth: 90,
  logoHeight: 45,
  logoTextOffsetX: 35,
  logoTextOffsetY: 22,
  companyNameOffsetY: 5,
  addressOffsetY: 18,
  taxInfoOffsetY: -12,
  toBoxWidthRatio: 0.55,
  toDateHeight: 70,
  tableHeaderHeight: 18,
  rowMinHeight: 12,
  headerRowHeight: 14,
  gstRowHeight: 14,
  discountRowHeight: 14,
  totalRowHeight: 14,
  amountWordsHeight: 18,
  termsBaseHeight: 15,
  termsLineHeight: 12,
  signatureRowHeight: 50,
} as const

export const COLUMNS = {
  sac: 310,
  qty: 385,
  unit: 430,
  amt: 500,
} as const

export const FONT_SIZES = {
  title: 14,
  companyName: 10,
  address: 7,
  taxInfo: 7,
  to: 8,
  tableHeader: 8,
  tableRow: 7,
  gst: 8,
  discount: 8,
  total: 9,
  amountWords: 7.5,
  terms: 8,
  termsLine: 7,
  signature: 8,
} as const

export const DEFAULTS = {
  quotationNumberPadding: 3,
} as const
