import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Minimum 8 characters'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

// ── Member registration — mirrors CreateMemberDto exactly ──────

const mobileRegex = /^[6-9]\d{9}$/;

export const createMemberSchema = z.object({
  // Personal
  fullName: z.string().min(2, 'Full name is required').max(255),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  mobileNumber: z.string().regex(mobileRegex, 'Enter a valid 10-digit mobile number'),
  alternateMobile: z.string().regex(mobileRegex).optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().min(5, 'Address is required').max(500),

  // Sensitive
  aadhaarNumber: z.string().length(12, 'Aadhaar must be 12 digits'),
  panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN format').optional().or(z.literal('')),

  // Current status + org
  currentStatus: z.enum(
    ['school_student', 'college_student', 'working_professional', 'business', 'other'],
    { required_error: 'Current status is required' },
  ),
  currentStatusOrg: z.string().max(255).optional(),

  // Parents (both mandatory)
  parentsName: z.string().min(2, 'Parents name is required').max(255),
  parentsContact: z.string().regex(mobileRegex, 'Enter a valid 10-digit mobile number'),

  // Prior pathak
  hasPriorPathakExp: z.boolean().default(false),
  priorPathakName: z.string().max(255).optional(),

  // Instrument (4 options)
  instrument: z.enum(['dhol', 'tasha', 'tool', 'dhwaj'], {
    required_error: 'Please select an instrument',
  }),

  // Availability
  availability: z.enum(['daily', 'two_days_week', 'three_days_week', 'other'], {
    required_error: 'Please select your availability',
  }),
  availabilityOther: z.string().max(255).optional(),

  joiningReason: z.string().min(10, 'Please tell us why you want to join').max(1000),

  // Health
  hasHealthCondition: z.enum(['yes', 'no'], { required_error: 'Please answer this question' }),
  healthDetails: z.string().max(500).optional(),

  // Declaration
  digitalSignature: z.string().min(2, 'Type your full name to sign'),
  declarationAccepted: z.boolean().refine((v) => v === true, {
    message: 'You must accept the declaration to register',
  }),
}).superRefine((data, ctx) => {
  // Org/other details required based on current status
  if (
    ['school_student', 'college_student', 'working_professional', 'business'].includes(data.currentStatus) &&
    !data.currentStatusOrg?.trim()
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['currentStatusOrg'], message: 'Please enter your school / college / organisation name' });
  }
  if (data.currentStatus === 'other' && !data.currentStatusOrg?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['currentStatusOrg'], message: 'Please specify your current status' });
  }
  // Prior pathak name required when hasPriorPathakExp = true
  if (data.hasPriorPathakExp && !data.priorPathakName?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priorPathakName'], message: 'Please enter the name of the Pathak' });
  }
  // Availability other text required when Other selected
  if (data.availability === 'other' && !data.availabilityOther?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['availabilityOther'], message: 'Please describe your availability' });
  }
  // Health details required when yes
  if (data.hasHealthCondition === 'yes' && !data.healthDetails?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['healthDetails'], message: 'Please specify your health condition or limitation' });
  }
});
export type CreateMemberFormValues = z.infer<typeof createMemberSchema>;

// ── Session creation ─────────────────────────────────────────

export const createSessionSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  sessionType: z.enum(['practice', 'event', 'workshop', 'rehearsal', 'other']),
  sessionDate: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationName: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  allowedRadiusMeters: z.number().min(10).max(2000).default(100),
  isLocationRestricted: z.boolean().default(false),
  notes: z.string().optional(),
});
export type CreateSessionFormValues = z.infer<typeof createSessionSchema>;

// ── Admin creation ───────────────────────────────────────────

export const createAdminSchema = z.object({
  email: z.string().email('Enter a valid email'),
  fullName: z.string().min(2, 'Full name is required'),
  password: z.string().min(8, 'Minimum 8 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal('')),
});
export type CreateAdminFormValues = z.infer<typeof createAdminSchema>;
