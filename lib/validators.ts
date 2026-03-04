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
      componentName: z.string().min(1, 'Component name is required'),
      sacCode: z.string().optional().nullable(),
      quantity: z.number().positive('Quantity must be positive'),
      unitPrice: z.number().positive('Unit price must be positive'),
      totalPrice: z.number().optional(),
      isProductHeader: z.boolean().optional().default(false),
      sortOrder: z.number().optional()
    })
  ).min(1, 'At least one item is required')
})

export const updateQuotationSchema = createQuotationSchema.extend({
  quotationNo: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted']).optional()
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
  emailFrom: z.string().email('Invalid email address'),
  termsConditions: z.string().optional().nullable()
})

export const sendEmailSchema = z.object({
  quotationId: z.string().min(1, 'Quotation ID is required'),
  to: z.string().email('Invalid email address'),
  cc: z.string().email('Invalid email').optional().nullable(),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().optional().nullable()
})

export const generatePdfSchema = z.object({
  quotationId: z.string().min(1, 'Quotation ID is required')
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

export type { CreateQuotation, UpdateQuotation, CreateProduct, UpdateSettings, SendEmail }
