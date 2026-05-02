export interface User {
  id: number;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  organizationId: number;
  departmentId?: number | null;
  status: 'active' | 'inactive' | 'locked';
  role?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EffectivePermissions {
  permissions: Record<string, boolean>;
  resolutionChain: PermissionResolution[];
}

export interface PermissionResolution {
  permissionSlug: string;
  granted: boolean;
  source: 'direct' | 'role' | 'department';
  sourceId?: number;
  sourceName?: string;
  reason?: string;
}

export interface NotificationPayload {
  userId: number;
  event: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
