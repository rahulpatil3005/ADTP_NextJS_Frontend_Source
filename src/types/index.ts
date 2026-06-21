// ── Auth ─────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'admin' | 'member';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: UserRole;
  userId: string;
}

// ── Members ──────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'other';
export type CurrentStatus =
  | 'school_student' | 'college_student'
  | 'working_professional' | 'business' | 'other';
export type Instrument = 'dhol' | 'tasha' | 'tool' | 'dhwaj' | 'dholki' | 'zanj' | 'support' | 'other';
export type Availability = 'daily' | 'two_days_week' | 'three_days_week' | 'weekly' | 'bi_weekly' | 'monthly' | 'other';
export type MemberStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Member {
  id: string;
  member_id: string;
  full_name: string;
  date_of_birth?: string;
  gender?: Gender;
  mobile_number: string;
  alternate_mobile?: string;
  email?: string;
  address?: string;
  aadhaar_number?: string;
  pan_number?: string;
  photo_url?: string;
  current_status?: CurrentStatus;
  current_status_org?: string;
  parents_name?: string;
  parents_contact?: string;
  guardian_name?: string;
  guardian_contact?: string;
  has_prior_pathak_exp?: boolean;
  prior_pathak_name?: string;
  instrument: Instrument;
  availability?: Availability;
  availability_other?: string;
  joining_reason?: string;
  medical_conditions?: string;
  physical_limitations?: string;
  health_notes?: string;
  status: MemberStatus;
  joining_date?: string;
  qr_generated_at?: string;
  created_at: string;
}

export interface MemberListResponse {
  data: Member[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MemberAttendanceSummary {
  member_id: string;
  member_code: string;
  full_name: string;
  instrument: Instrument;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
  attendance_percentage: number;
  last_seen_at?: string;
}

// ── Attendance ───────────────────────────────────────────────

export type SessionType = 'practice' | 'event' | 'workshop' | 'rehearsal' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'leave';

export interface Session {
  id: string;
  title: string;
  session_type: SessionType;
  session_date: string;
  start_time?: string;
  end_time?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  allowed_radius_meters: number;
  is_location_restricted: boolean;
  total_scanned?: number;
  created_by_name?: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  member_id: string;
  full_name: string;
  member_code: string;
  instrument: Instrument;
  photo_url?: string;
  attendance_status: AttendanceStatus;
  check_in_time?: string;
  check_in_method?: string;
  check_out_time?: string;
}

export interface DailySummary {
  session_date: string;
  session_id: string;
  session_title: string;
  session_type: SessionType;
  total_members: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  half_day_count: number;
  leave_count: number;
  attendance_percentage: number;
}

// ── Dashboard ────────────────────────────────────────────────

export interface SuperAdminDashboard {
  members: {
    active_members: number;
    inactive_members: number;
    pending_members: number;
    total_members: number;
  };
  todaySummary: DailySummary | null;
  recentRegistrations: Member[];
  totalAdmins: number;
  weeklyTrend: {
    session_date: string;
    present: number;
    absent: number;
    avg_percentage: number;
  }[];
}

export interface AdminDashboard {
  todaySummary: DailySummary | null;
  totalActiveMembers: number;
  recentActivity: AttendanceRecord[];
}

// ── Admins ───────────────────────────────────────────────────

export interface Admin {
  id: string;
  user_id: string;
  full_name: string;
  employee_code?: string;
  email: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  permissions: Record<string, boolean>;
  created_at: string;
}

// ── Notifications ────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// ── API Envelope ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}
