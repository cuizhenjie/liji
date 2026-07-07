import { NextRequest, NextResponse } from 'next/server';

/**
 * Teams API - 多租户支持
 * 支持家庭共享和团队协作
 */

export interface Team {
  id: string;
  name: string;
  type: 'family' | 'team' | 'organization';
  ownerId: string;
  createdAt: string;
  settings: TeamSettings;
  memberCount: number;
}

export interface TeamSettings {
  maxMembers: number;
  sharedContacts: boolean;
  sharedCalendar: boolean;
  sharedBudget: boolean;
  approvalRequired: boolean;
  defaultVisibility: 'public' | 'private' | 'members_only';
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  permissions: string[];
  nickname?: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

// Demo data
const DEMO_TEAMS: Team[] = [
  {
    id: 'team-family-zhang',
    name: '张家',
    type: 'family',
    ownerId: 'user-001',
    createdAt: '2026-01-15T00:00:00Z',
    settings: {
      maxMembers: 10,
      sharedContacts: true,
      sharedCalendar: true,
      sharedBudget: true,
      approvalRequired: false,
      defaultVisibility: 'members_only',
    },
    memberCount: 4,
  },
  {
    id: 'team-work-li',
    name: '李总秘书处',
    type: 'team',
    ownerId: 'user-002',
    createdAt: '2026-02-01T00:00:00Z',
    settings: {
      maxMembers: 5,
      sharedContacts: true,
      sharedCalendar: true,
      sharedBudget: false,
      approvalRequired: true,
      defaultVisibility: 'members_only',
    },
    memberCount: 3,
  },
];

const DEMO_MEMBERS: TeamMember[] = [
  {
    id: 'member-001',
    teamId: 'team-family-zhang',
    userId: 'user-001',
    role: 'owner',
    joinedAt: '2026-01-15T00:00:00Z',
    permissions: ['*'],
    nickname: '爸爸',
  },
  {
    id: 'member-002',
    teamId: 'team-family-zhang',
    userId: 'user-003',
    role: 'admin',
    joinedAt: '2026-01-15T00:00:00Z',
    permissions: ['contacts:read', 'contacts:write', 'calendar:read', 'calendar:write', 'billing:read'],
    nickname: '妈妈',
  },
  {
    id: 'member-003',
    teamId: 'team-family-zhang',
    userId: 'user-004',
    role: 'member',
    joinedAt: '2026-01-20T00:00:00Z',
    permissions: ['contacts:read', 'calendar:read'],
    nickname: '女儿',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'user-001';

  // Return teams for the user
  const userTeams = DEMO_TEAMS.filter(team => {
    const member = DEMO_MEMBERS.find(m => m.teamId === team.id && m.userId === userId);
    return member !== undefined;
  });

  return NextResponse.json({
    success: true,
    data: userTeams,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, settings } = body;

  const newTeam: Team = {
    id: `team-${Date.now()}`,
    name: name || '新团队',
    type: type || 'family',
    ownerId: 'user-001',
    createdAt: new Date().toISOString(),
    settings: settings || {
      maxMembers: 10,
      sharedContacts: true,
      sharedCalendar: true,
      sharedBudget: false,
      approvalRequired: false,
      defaultVisibility: 'members_only',
    },
    memberCount: 1,
  };

  return NextResponse.json({
    success: true,
    data: newTeam,
  });
}
