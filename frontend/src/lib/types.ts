/** Shapes returned by /api/admin/**, mirroring the Java DTOs. */

export type Role = 'customer' | 'staff' | 'admin'
export type AccountStatus = 'active' | 'inactive'

export type User = {
  id: number
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: Role
  status: AccountStatus
  dateOfBirth: string | null
  createdAt: string
}

export type SignInResponse = { token: string; user: User }

export function fullName(u: Pick<User, 'firstName' | 'lastName'>): string {
  return `${u.firstName} ${u.lastName}`.trim()
}

export function initials(u: Pick<User, 'firstName' | 'lastName'>): string {
  return [u.firstName, u.lastName]
    .filter(Boolean)
    .map(n => n[0]!.toUpperCase())
    .join('')
}
