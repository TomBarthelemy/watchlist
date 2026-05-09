// @ts-nocheck
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type InviteToListInput = {
  listId: string;
  friendUserId?: string;
  email?: string;
  role?: 'editor';
  message?: string;
};

export type InviteToListResult = {
  ok: true;
  requestId: string;
  status: 'processed';
  message: 'Invitation traitee';
};

export type InviteToListError = {
  ok: false;
  code:
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'BAD_REQUEST'
    | 'LIST_NOT_FOUND'
    | 'NOT_MEMBER'
    | 'NOT_ALLOWED_ROLE'
    | 'CONFLICT_PENDING'
    | 'RATE_LIMITED'
    | 'INTERNAL_ERROR';
  message: string;
};

type DbList = {
  id: string;
  name: string;
};

type DbMembership = {
  role: string;
};

type DbUserLookup = {
  id: string;
  email: string;
};

type DbInvitation = {
  id: string;
  token: string;
};

type DbFriendRequest = {
  id: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_BASE_URL =
  (Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? 'http://localhost:4200').trim();
const INVITE_ACCEPT_PATH = (Deno.env.get('INVITE_ACCEPT_PATH') ?? '/auth/accept-invite').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: InviteToListResult | InviteToListError, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(
  code: InviteToListError['code'],
  message: string,
  status: number
): Response {
  return jsonResponse({ ok: false, code, message }, status);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isUuid(value: string | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

function canonicalFriendPair(a: string, b: string) {
  return a < b
    ? { user_low_id: a, user_high_id: b }
    : { user_low_id: b, user_high_id: a };
}

function normalizeAppPath(path: string): string {
  if (!path) return '/';
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.replace(/\/{2,}/g, '/');
}

function buildInviteRedirect(token: string): string {
  const url = new URL(normalizeAppPath(INVITE_ACCEPT_PATH), APP_BASE_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

async function requireListAccess(admin: SupabaseClient, listId: string, userId: string) {
  const { data: list, error: listError } = await admin
    .from('lists')
    .select('id, name')
    .eq('id', listId)
    .maybeSingle<DbList>();

  if (listError) throw listError;
  if (!list) return { list: null, membership: null };

  const { data: membership, error: membershipError } = await admin
    .from('list_members')
    .select('role')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle<DbMembership>();

  if (membershipError) throw membershipError;
  return { list, membership };
}

async function isAlreadyListMember(admin: SupabaseClient, listId: string, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from('list_members')
    .select('user_id')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function hasFriendship(admin: SupabaseClient, a: string, b: string): Promise<boolean> {
  const pair = canonicalFriendPair(a, b);
  const { data, error } = await admin
    .from('friendships')
    .select('id')
    .eq('user_low_id', pair.user_low_id)
    .eq('user_high_id', pair.user_high_id)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function ensurePendingFriendRequest(
  admin: SupabaseClient,
  senderId: string,
  receiverId: string,
  contextListId: string
): Promise<void> {
  const { data: pending, error: pendingError } = await admin
    .from('friend_requests')
    .select('id')
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId},status.eq.pending),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId},status.eq.pending)`)
    .limit(1);

  if (pendingError) throw pendingError;
  if ((pending ?? []).length > 0) return;

  const { error: insertError } = await admin.from('friend_requests').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    context_list_id: contextListId,
    status: 'pending',
  });

  if (insertError && insertError.code !== '23505') {
    throw insertError;
  }
}

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<DbUserLookup | null> {
  const { data, error } = await admin
    .from('users')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle<DbUserLookup>();

  if (error) throw error;
  return data;
}

async function findPendingInvitationForUser(
  admin: SupabaseClient,
  listId: string,
  inviteeUserId: string
): Promise<DbInvitation | null> {
  const { data, error } = await admin
    .from('list_invitations')
    .select('id, token')
    .eq('list_id', listId)
    .eq('invitee_user_id', inviteeUserId)
    .eq('status', 'pending')
    .maybeSingle<DbInvitation>();

  if (error) throw error;
  return data;
}

async function findPendingInvitationForEmail(
  admin: SupabaseClient,
  listId: string,
  email: string
): Promise<DbInvitation | null> {
  const { data, error } = await admin
    .from('list_invitations')
    .select('id, token')
    .eq('list_id', listId)
    .ilike('invitee_email', email)
    .eq('status', 'pending')
    .maybeSingle<DbInvitation>();

  if (error) throw error;
  return data;
}

async function createInvitationForUser(
  admin: SupabaseClient,
  listId: string,
  inviterId: string,
  inviteeUserId: string,
  roleToGrant: 'editor',
  message?: string
): Promise<DbInvitation> {
  const existing = await findPendingInvitationForUser(admin, listId, inviteeUserId);
  if (existing) return existing;

  const { data, error } = await admin
    .from('list_invitations')
    .insert({
      list_id: listId,
      inviter_id: inviterId,
      invitee_user_id: inviteeUserId,
      role_to_grant: roleToGrant,
      message: message?.trim() || null,
      status: 'pending',
    })
    .select('id, token')
    .single<DbInvitation>();

  if (error) throw error;
  return data;
}

async function createInvitationForEmail(
  admin: SupabaseClient,
  listId: string,
  inviterId: string,
  email: string,
  roleToGrant: 'editor',
  message?: string
): Promise<DbInvitation> {
  const existing = await findPendingInvitationForEmail(admin, listId, email);
  if (existing) return existing;

  const { data, error } = await admin
    .from('list_invitations')
    .insert({
      list_id: listId,
      inviter_id: inviterId,
      invitee_email: email,
      role_to_grant: roleToGrant,
      message: message?.trim() || null,
      status: 'pending',
    })
    .select('id, token')
    .single<DbInvitation>();

  if (error) throw error;
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('BAD_REQUEST', 'Method not allowed', 405);
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Utilisateur non authentifie', 401);
    }

    const payload = (await req.json()) as InviteToListInput;
    const listId = payload.listId?.trim();
    const friendUserId = payload.friendUserId?.trim();
    const email = payload.email ? normalizeEmail(payload.email) : undefined;
    const role = payload.role ?? 'editor';
    const message = payload.message?.trim();

    if (!isUuid(listId)) {
      return errorResponse('BAD_REQUEST', 'listId invalide', 400);
    }

    if (role !== 'editor') {
      return errorResponse('NOT_ALLOWED_ROLE', 'Seul le role editor peut etre invite', 400);
    }

    const hasFriendTarget = !!friendUserId;
    const hasEmailTarget = !!email;

    if ((hasFriendTarget ? 1 : 0) + (hasEmailTarget ? 1 : 0) !== 1) {
      return errorResponse('BAD_REQUEST', 'Utiliser soit friendUserId soit email', 400);
    }

    if (hasFriendTarget && !isUuid(friendUserId)) {
      return errorResponse('BAD_REQUEST', 'friendUserId invalide', 400);
    }

    if (message && message.length > 500) {
      return errorResponse('BAD_REQUEST', 'Message trop long', 400);
    }

    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { list, membership } = await requireListAccess(admin, listId, user.id);

    if (!list) {
      return errorResponse('LIST_NOT_FOUND', 'Playlist introuvable', 404);
    }

    if (!membership) {
      return errorResponse('NOT_MEMBER', 'Vous devez etre membre de la playlist', 403);
    }

    if (!['owner', 'editor'].includes(membership.role)) {
      return errorResponse('FORBIDDEN', 'Role insuffisant pour inviter', 403);
    }

    if (friendUserId) {
      if (friendUserId === user.id) {
        return errorResponse('BAD_REQUEST', 'Impossible de vous inviter vous-meme', 400);
      }

      const alreadyFriend = await hasFriendship(admin, user.id, friendUserId);
      if (!alreadyFriend) {
        return errorResponse('FORBIDDEN', 'Cet utilisateur ne fait pas partie de vos amis', 403);
      }

      const alreadyMember = await isAlreadyListMember(admin, listId, friendUserId);
      if (alreadyMember) {
        return jsonResponse({
          ok: true,
          requestId: crypto.randomUUID(),
          status: 'processed',
          message: 'Invitation traitee',
        });
      }

      const invitation = await createInvitationForUser(
        admin,
        listId,
        user.id,
        friendUserId,
        role,
        message
      );

      return jsonResponse({
        ok: true,
        requestId: invitation.id,
        status: 'processed',
        message: 'Invitation traitee',
      });
    }

    if (!email) {
      return errorResponse('BAD_REQUEST', 'Email requis', 400);
    }

    const inviterProfile = await findUserByEmail(admin, user.email ?? '');
    if (inviterProfile && normalizeEmail(inviterProfile.email) === email) {
      return errorResponse('BAD_REQUEST', 'Impossible de vous inviter vous-meme', 400);
    }

    const existingUser = await findUserByEmail(admin, email);

    if (existingUser) {
      if (existingUser.id === user.id) {
        return errorResponse('BAD_REQUEST', 'Impossible de vous inviter vous-meme', 400);
      }

      const alreadyMember = await isAlreadyListMember(admin, listId, existingUser.id);
      if (alreadyMember) {
        return jsonResponse({
          ok: true,
          requestId: crypto.randomUUID(),
          status: 'processed',
          message: 'Invitation traitee',
        });
      }

      const invitation = await createInvitationForUser(
        admin,
        listId,
        user.id,
        existingUser.id,
        role,
        message
      );

      const alreadyFriend = await hasFriendship(admin, user.id, existingUser.id);
      if (!alreadyFriend) {
        await ensurePendingFriendRequest(admin, user.id, existingUser.id, listId);
      }

      return jsonResponse({
        ok: true,
        requestId: invitation.id,
        status: 'processed',
        message: 'Invitation traitee',
      });
    }

    const invitation = await createInvitationForEmail(
      admin,
      listId,
      user.id,
      email,
      role,
      message
    );

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: buildInviteRedirect(invitation.token),
      data: {
        list_invitation_token: invitation.token,
        list_id: listId,
        role_to_grant: role,
      },
    });

    if (inviteError) {
      console.error('[invite-to-list] Supabase inviteUserByEmail failed', inviteError);
      return errorResponse('INTERNAL_ERROR', 'Invitation email non envoyee', 500);
    }

    return jsonResponse({
      ok: true,
      requestId: invitation.id,
      status: 'processed',
      message: 'Invitation traitee',
    });
  } catch (error) {
    console.error('[invite-to-list] unexpected error', error);
    return errorResponse('INTERNAL_ERROR', 'Erreur interne', 500);
  }
});
