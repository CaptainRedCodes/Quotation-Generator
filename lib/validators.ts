import { z } from 'zod'

export const createQuotationSchema = z.object({
  toCompanyName: z.string().min(1, 'Company name is required'),
  toAddress: z.string().min(1, 'Address is required'),
  toGstNo: z.string().optional().nullable(),
  toPhone: z.string().optional().nullable(),
  toEmail: z.string().email('Invalid email').optional().nullable(),
  quotationNo: z.string().optional(),
  date: z.string().optional(),
  termsConditions: z.string().optional().nullable(),
  status: z.enum(['draft', 'sent', 'accepted']).optional().default('draft'),
  items: z.array(
    z.object({
      componentName: z.string(),
      sacCode: z.string().optional().nullable(),
      quantity: z.number().min(0),
      unitPrice: z.number().min(0),
      totalPrice: z.number().optional(),
      isProductHeader: z.boolean().optional().default(false),
      sortOrder: z.number().optional()
    })
  ).min(1, 'At least one item is required')
})

export const updateQuotationSchema = createQuotationSchema.extend({
  quotationNo: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted']).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().optional()
})

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional().nullable(),
  active: z.boolean().default(true),
  components: z.array(
    z.object({
      componentName: z.string().min(1, 'Component name is required'),
      sacCode: z.string().optional().nullable(),
      quantity: z.number().positive('Quantity must be positive'),
      unitPrice: z.number().positive('Unit price must be positive'),
      sortOrder: z.number().optional()
    })
  ).optional().default([])
})

export const updateProductSchema = createProductSchema

export const updateSettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address: z.string().min(1, 'Address is required'),
  gstNo: z.string().min(1, 'GST number is required'),
  panNo: z.string().min(1, 'PAN number is required'),
  cinNo: z.string().optional().nullable(),
  msmeNo: z.string().optional().nullable(),
  emailFrom: z.string().email('Invalid email address'),
  termsConditions: z.string().optional().nullable()
})

export const sendEmailSchema = z.object({
  quotationId: z.string().min(1),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional().nullable(),
  subject: z.string().min(1),
  message: z.string().optional().nullable()
})

export const generatePdfSchema = z.object({
  quotationId: z.string().min(1, 'Quotation ID is required')
})

export const createInvoiceSchema = z.object({
  quotationId: z.string().optional(),
  invoiceNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  toCompanyName: z.string().min(1, 'Company name is required'),
  toAddress: z.string().min(1, 'Address is required'),
  toGstNo: z.string().optional().nullable(),
  toPhone: z.string().optional().nullable(),
  toEmail: z.string().email('Invalid email').optional().nullable(),
  subtotal: z.number().min(0),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().optional(),
  discountAmount: z.number().optional(),
  gstPercent: z.number().min(0),
  gstAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  status: z.enum(['pending', 'paid', 'overdue']).optional().default('pending'),
  notes: z.string().optional().nullable(),
  termsConditions: z.string().optional().nullable(),
  items: z.array(z.object({
    componentName: z.string(),
    sacCode: z.string().optional().nullable(),
    quantity: z.number().int().min(0),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    isProductHeader: z.boolean().optional().default(false),
    sortOrder: z.number().optional()
  })).min(1, 'At least one item is required')
})

export const updateInvoiceSchema = createInvoiceSchema.omit({ quotationId: true }).extend({
  invoiceNo: z.string().min(1),
  items: z.array(z.object({
    componentName: z.string(),
    sacCode: z.string().optional().nullable(),
    quantity: z.number().int().min(0),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    isProductHeader: z.boolean().optional().default(false),
    sortOrder: z.number().optional()
  })).optional()
})

export const generateInvoicePdfSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required')
})

export const changePasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
})

type CreateQuotation = z.infer<typeof createQuotationSchema>
type UpdateQuotation = z.infer<typeof updateQuotationSchema>
type CreateProduct = z.infer<typeof createProductSchema>
type UpdateSettings = z.infer<typeof updateSettingsSchema>
type SendEmail = z.infer<typeof sendEmailSchema>
type CreateInvoice = z.infer<typeof createInvoiceSchema>
type UpdateInvoice = z.infer<typeof updateInvoiceSchema>

export type { CreateQuotation, UpdateQuotation, CreateProduct, UpdateSettings, SendEmail, CreateInvoice, UpdateInvoice }
