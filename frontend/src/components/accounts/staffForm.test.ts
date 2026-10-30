import {
  defaultStaffValues,
  STAFF_FIELD_FOR_CODE,
  staffBody,
  staffCreateBody,
  staffSchema,
  type StaffFormInput
} from '@/components/accounts/staffForm'
import type { User } from '@/lib/types'

const typed: StaffFormInput = {
  firstName: '  Dara  ',
  lastName: 'Pich',
  email: '  Dara@mos.test ',
  phone: '',
  role: 'staff',
  password: 'coffee123'
}

/** ['field', 'message'] for every problem the schema found. */
function problems(schema: ReturnType<typeof staffSchema>, values: unknown): string[][] {
  const parsed = schema.safeParse(values)
  return parsed.success ? [] : parsed.error.issues.map(issue => [issue.path.join('.'), issue.message])
}

describe('staffSchema', () => {
  it('trims what was typed and keeps the chosen role', () => {
    const parsed = staffSchema(true).safeParse(typed)

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data).toEqual({
      firstName: 'Dara',
      lastName: 'Pich',
      email: 'Dara@mos.test',
      phone: '',
      role: 'staff',
      password: 'coffee123'
    })
  })

  it('asks for a first name', () => {
    expect(problems(staffSchema(true), { ...typed, firstName: '   ' })).toEqual([
      ['firstName', 'Enter a first name.']
    ])
  })

  it('needs an email or a phone number (server code contact_required)', () => {
    expect(problems(staffSchema(true), { ...typed, email: '  ', phone: '' })).toEqual([
      ['email', 'Enter an email or a phone number.']
    ])
  })

  it('a phone number alone is enough', () => {
    expect(problems(staffSchema(true), { ...typed, email: '', phone: '012 345 678' })).toEqual([])
  })

  it('a new account needs 8 characters of password', () => {
    expect(problems(staffSchema(true), { ...typed, password: 'coffee1' })).toEqual([
      ['password', 'Use at least 8 characters.']
    ])
  })

  it('an edit needs no password at all', () => {
    expect(problems(staffSchema(false), { ...typed, password: '' })).toEqual([])
  })

  it('only staff and admin are offered as roles', () => {
    expect(staffSchema(false).safeParse({ ...typed, role: 'customer' }).success).toBe(false)
  })
})

describe('staffBody', () => {
  const values = {
    firstName: 'Dara',
    lastName: '',
    email: '',
    phone: '+85512345678',
    role: 'admin' as const,
    password: 'coffee123'
  }

  it('sends a blank contact field as null, not an empty string', () => {
    expect(staffBody(values)).toEqual({
      firstName: 'Dara',
      lastName: '',
      email: null,
      phone: '+85512345678',
      role: 'admin'
    })
  })

  it('carries the password only when creating', () => {
    expect(staffCreateBody(values)).toEqual({
      firstName: 'Dara',
      lastName: '',
      email: null,
      phone: '+85512345678',
      role: 'admin',
      password: 'coffee123'
    })
    expect('password' in staffBody(values)).toBe(false)
  })
})

describe('STAFF_FIELD_FOR_CODE', () => {
  it('puts each server code on the field the admin can fix', () => {
    expect(STAFF_FIELD_FOR_CODE.email_taken).toBe('email')
    expect(STAFF_FIELD_FOR_CODE.invalid_email).toBe('email')
    expect(STAFF_FIELD_FOR_CODE.contact_required).toBe('email')
    expect(STAFF_FIELD_FOR_CODE.phone_taken).toBe('phone')
    expect(STAFF_FIELD_FOR_CODE.invalid_phone).toBe('phone')
    expect(STAFF_FIELD_FOR_CODE.weak_password).toBe('password')
  })

  it('leaves self_lockout to a toast: no field can fix it', () => {
    expect(STAFF_FIELD_FOR_CODE.self_lockout).toBeUndefined()
  })
})

describe('defaultStaffValues', () => {
  const sokha: User = {
    id: 8,
    firstName: 'Sokha',
    lastName: 'Nuon',
    email: null,
    phone: '+85598765432',
    role: 'admin',
    status: 'inactive',
    dateOfBirth: null,
    createdAt: '2026-09-02T03:00:00Z'
  }

  it('turns a missing email into an empty input', () => {
    expect(defaultStaffValues(sokha)).toEqual({
      firstName: 'Sokha',
      lastName: 'Nuon',
      email: '',
      phone: '+85598765432',
      role: 'admin',
      password: ''
    })
  })

  it('a new account starts blank and as staff', () => {
    expect(defaultStaffValues(null)).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'staff',
      password: ''
    })
  })
})
