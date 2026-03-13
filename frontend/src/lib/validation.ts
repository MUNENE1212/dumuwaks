import { z } from 'zod';

// === Common field schemas ===

export const phoneSchema = z
  .string()
  .regex(/^(?:\+?254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone number (e.g. 0712345678)');

export const emailSchema = z.string().email('Enter a valid email address');

export const amountSchema = z.coerce
  .number({ invalid_type_error: 'Enter a valid number' })
  .positive('Amount must be greater than zero');

export const futureDateSchema = z.string().refine(
  (val) => !val || new Date(val) >= new Date(new Date().toDateString()),
  'Date must be today or later'
);

export const requiredString = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`).trim();

// === Counter Offer ===

export const counterOfferSchema = z.object({
  proposedAmount: amountSchema,
  reason: requiredString('Reason'),
  additionalNotes: z.string().trim().optional(),
});

export type CounterOfferFormData = z.infer<typeof counterOfferSchema>;

// === Search Filters ===

export const searchFiltersSchema = z.object({
  serviceCategory: requiredString('Service category'),
  address: z.string().trim().optional(),
  urgency: z.string().default('medium'),
  budget: z.string().optional(),
  preferredDate: z.string().optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
});

export type SearchFiltersFormData = z.infer<typeof searchFiltersSchema>;

// === Booking Wizard Step Schemas ===

export const bookingStep1Schema = z.object({
  serviceCategory: requiredString('Service category'),
  serviceType: requiredString('Service type'),
});

export const bookingStep2Schema = z.object({
  description: requiredString('Problem description'),
});

export const bookingStep3Schema = z.object({
  scheduledDate: requiredString('Date'),
  scheduledTime: requiredString('Time'),
});

export const bookingStep4Schema = z.object({
  serviceLocation: z.object({
    address: requiredString('Address'),
  }),
});

export const bookingStepSchemas = [
  bookingStep1Schema,
  bookingStep2Schema,
  bookingStep3Schema,
  bookingStep4Schema,
] as const;

// === Service Type Custom Input ===

export const customServiceInputSchema = z
  .string()
  .min(3, 'Enter at least 3 characters')
  .max(100, 'Description is too long')
  .regex(/^[a-zA-Z0-9\s\-/&().]+$/, 'Only letters, numbers, spaces, and basic punctuation allowed');
