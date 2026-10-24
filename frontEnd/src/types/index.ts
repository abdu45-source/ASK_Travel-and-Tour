export enum Permission {
  MANAGER_CREATE = 'MANAGER_CREATE',
  MANAGER_ASSIGN = 'MANAGER_ASSIGN',
  MANAGER_SUSPEND = 'MANAGER_SUSPEND',
  MANAGER_REVOKE = 'MANAGER_REVOKE',
  ROLE_READ = 'ROLE_READ',
  ROLE_MANAGE = 'ROLE_MANAGE',
  USER_READ = 'USER_READ',

  DESTINATION_READ_PUBLIC = 'DESTINATION_READ_PUBLIC',
  DESTINATION_CREATE = 'DESTINATION_CREATE',
  DESTINATION_UPDATE = 'DESTINATION_UPDATE',
  DESTINATION_DELETE = 'DESTINATION_DELETE',
  PRICING_MANAGE = 'PRICING_MANAGE',

  AGENT_CREATE = 'AGENT_CREATE',
  AGENT_READ = 'AGENT_READ',
  AGENT_UPDATE = 'AGENT_UPDATE',
  AGENT_DEACTIVATE = 'AGENT_DEACTIVATE',
  AGENT_PERFORMANCE_READ = 'AGENT_PERFORMANCE_READ',

  CLIENT_REGISTER = 'CLIENT_REGISTER',
  CLIENT_READ = 'CLIENT_READ',

  BOOKING_CREATE = 'BOOKING_CREATE',
  BOOKING_READ = 'BOOKING_READ',
  BOOKING_APPROVE = 'BOOKING_APPROVE',
  BOOKING_REJECT = 'BOOKING_REJECT',
  BOOKING_COMMENT = 'BOOKING_COMMENT',
  BOOKING_CANCEL = 'BOOKING_CANCEL',
  BOOKING_COMPLETE = 'BOOKING_COMPLETE',

  WALLET_READ = 'WALLET_READ',
  COMMISSION_PAYOUT_PROCESS = 'COMMISSION_PAYOUT_PROCESS',

  REPORT_READ = 'REPORT_READ',
  REPORT_EXPORT = 'REPORT_EXPORT',
  DASHBOARD_READ = 'DASHBOARD_READ',

  NOTIFICATION_READ = 'NOTIFICATION_READ',
  CHAT_USE = 'CHAT_USE',
  CHAT_MODERATE = 'CHAT_MODERATE',

  AUDIT_READ = 'AUDIT_READ',
}

export enum PermissionScope {
  ANY = 'ANY',
  OWN = 'OWN',
  ASSIGNED = 'ASSIGNED',
  TEAM = 'TEAM',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  roles: string[];
  permissions: Record<string, PermissionScope>;
  agentProfile?: {
    id: string;
    referral_code: string;
    wallet_balance: number;
    deactivated_at?: string;
    payout_details?: string;
  };
  clientProfile?: {
    referred_by_agent_id?: string;
    referral_code_used?: string;
    client_referral_code?: string;
  };
}

export interface Agent {
  id: string;
  user_id: string;
  referral_code: string;
  wallet_balance: number;
  manager_id?: string;
  payout_details?: string;
  deactivated_at?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export interface PriceRule {
  id: string;
  destination_id: string;
  name: string;
  start_date: string;
  end_date: string;
  adjust_type: 'PERCENT' | 'FIXED_AMOUNT' | 'OVERRIDE';
  value: number;
  priority: number;
}

export interface Destination {
  id: string;
  slug: string;
  title: string;
  region: string;
  short_description: string;
  description: string;
  base_price: number;
  duration_days: number;
  capacity?: number;
  popularity_score: number;
  status: string;
  gallery_images: string[];
  itinerary: { day: number; title: string; activities: string }[];
  inclusions: string[];
  exclusions: string[];
  priceRules?: PriceRule[];
}

export interface Booking {
  id: string;
  client_id: string;
  destination_id: string;
  agent_id?: string;
  travel_date: string;
  travelers: number;
  unit_price: number;
  total_price: number;
  penalty_fee: number;
  refund_amount: number;
  download_count?: number;
  status: BookingStatus;
  manager_comment?: string;
  client_notes?: string;
  created_at: string;
  destination?: Destination;
  client?: {
    user: {
      id: string;
      name: string;
      email: string;
      phone?: string;
    };
  };
  agent?: {
    referral_code: string;
    user: {
      name: string;
      email: string;
    };
  };
  statusHistory?: {
    id: string;
    from_status?: BookingStatus;
    to_status: BookingStatus;
    comment?: string;
    created_at: string;
  }[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at?: string;
  created_at: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PipelineRequest {
  id: string;
  bookingRef: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  destinationId: string;
  destinationTitle: string;
  destinationSlug: string;
  destinationImage?: string;
  travelDate: string;
  travelers: number;
  unitPrice: number;
  totalPrice: number;
  commissionAmount: number;
  commissionRate: number;
  status: BookingStatus;
  managerComment?: string;
  clientNotes?: string;
  createdAt: string;
  approvedAt?: string;
  isDailyRegistered: boolean;
}

export interface PipelineClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  isToday: boolean;
}

export interface DynamicReferralCode {
  id: string;
  code: string;
  clientEmail?: string | null;
  clientName?: string | null;
  personalNote?: string | null;
  status: 'ACTIVE' | 'CLAIMED' | 'EXPIRED';
  sentCount: number;
  lastSentAt?: string | null;
  createdAt: string;
  claimedAt?: string | null;
}

export interface PipelineStats {
  dailyRegistered: number;
  totalClients: number;
  pendingApproval: number;
  rejected: number;
  approved: number;
  walletBalance: number;
  referralCode?: string;
  primaryReferralCode?: string;
  activeDynamicCode?: string | null;
  dynamicCodes?: DynamicReferralCode[];
  requests: PipelineRequest[];
  clients: PipelineClient[];
}
