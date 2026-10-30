import { z } from 'zod'

import type { User } from '@/lib/types'

/** Staff accounts are either staff or admin; customers are never edited here (FR-27). */
export type StaffRole = 'staff' | 'admin'

/** Same minimum as AuthService.MIN_PASSWORD. */
export const MIN_PASSWORD = 8

/**
 * The add/edit staff form. `requirePassword` is true only when adding:
 * editing never touches the password (there is a separate reset dialog).
 */
export function staffSchema(requirePassword: boolean) {
  return z
    .object({
      firstName: z.string().trim().min(1, 'Enter a first name.').max(50, 'Use 50 characters or fewer.'),
      lastName: z.string().trim().max(50, 'Use 50 characters or fewer.'),
      email: z.string().trim().max(255, 'Use 255 characters or fewer.'),
      phone: z.string().trim().max(20, 'Use 20 characters or fewer.'),
      role: z.enum(['staff', 'admin']),
      password: z.string()
    })
    .refine(values => values.email !== '' || values.phone !== '', {
      message: 'Enter an email or a phone number.',
      path: ['email']
    })
    .refine(values => !requirePassword || values.password.length >= MIN_PASSWORD, {
      message: `Use at least ${MIN_PASSWORD} characters.`,
      path: ['password']
    })
}

type StaffSchema = ReturnType<typeof staffSchema>
export type StaffFormInput = z.input<StaffSchema>
export type StaffFormValues = z.output<StaffSchema>

/** AccountDtos.StaffRequest without the password. */
export type StaffBody = {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: StaffRole
}

/** PUT /api/admin/staff/{id}: a contact field left blank is sent as null, not "". */
export function staffBody(values: StaffFormValues): StaffBody {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email === '' ? null : values.email,
    phone: values.phone === '' ? null : values.phone,
    role: values.role
  }
}

/** POST /api/admin/staff: the same body plus the first password. */
export function staffCreateBody(values: StaffFormValues): StaffBody & { password: string } {
  return { ...staffBody(values), password: values.password }
}

/**
 * Server error codes that belong under a field instead of in a toast
 * (AccountService: email_taken, phone_taken, contact_required...).
 */
export const STAFF_FIELD_FOR_CODE: Record<string, keyof StaffFormInput> = {
  email_taken: 'email',
  invalid_email: 'email',
  contact_required: 'email',
  phone_taken: 'phone',
  invalid_phone: 'phone',
  weak_password: 'password',
  bad_role: 'role'
}

/** Pre-fills the form: an existing account, or a blank staff member. */
export function defaultStaffValues(staff: User | null): StaffFormInput {
  return {
    firstName: staff?.firstName ?? '',
    lastName: staff?.lastName ?? '',
    email: staff?.email ?? '',
    phone: staff?.phone ?? '',
    role: staff?.role === 'admin' ? 'admin' : 'staff',
    password: ''
  }
}

export const ROLE_LABEL: Record<StaffRole, string> = { staff: 'Staff', admin: 'Admin' }
