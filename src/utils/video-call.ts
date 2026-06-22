import { API_BASE_URL } from '@/services/api-client';

const DEFAULT_JITSI_BASE_URL = 'https://meet.jit.si';
const ROOM_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,96}$/;

export type VideoCallSession = {
  room: string;
  fallbackUrl: string;
};

type VideoCallRouteOptions = {
  displayName?: string | null;
  role?: 'patient' | 'professional' | 'owner' | 'guest';
};

export function parseVideoCallSession(onlineRoomUrl?: string | null): VideoCallSession | null {
  const value = onlineRoomUrl?.trim();

  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const room = normalizeRoom(url.searchParams.get('room') ?? getLastPathSegment(url.pathname));

    if (!room) {
      return null;
    }

    return {
      room,
      fallbackUrl: url.searchParams.get('fallback') ?? (isJitsiUrl(url) ? value : buildJitsiFallbackUrl(room)),
    };
  } catch {
    const room = normalizeRoom(value);

    return room
      ? {
          room,
          fallbackUrl: buildJitsiFallbackUrl(room),
        }
      : null;
  }
}

export function buildVideoCallRoute(onlineRoomUrl: string, options: VideoCallRouteOptions = {}) {
  const session = parseVideoCallSession(onlineRoomUrl);

  if (!session) {
    return null;
  }

  const displayName = normalizeDisplayName(options.displayName);

  return {
    pathname: '/video-call',
    params: {
      room: session.room,
      fallback: session.fallbackUrl,
      ...(displayName ? { localName: displayName } : {}),
      ...(options.role ? { role: options.role } : {}),
    },
  } as const;
}

export function buildSignalingUrl(room: string) {
  const apiUrl = new URL(API_BASE_URL);
  const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const apiPath = apiUrl.pathname.replace(/\/$/, '');

  return `${protocol}//${apiUrl.host}${apiPath}/video-call/signaling/${encodeURIComponent(room)}`;
}

export function buildJitsiFallbackUrl(room: string) {
  return `${DEFAULT_JITSI_BASE_URL}/${encodeURIComponent(room)}`;
}

function normalizeRoom(value?: string | null) {
  if (!value) {
    return null;
  }

  let decoded: string;

  try {
    decoded = decodeURIComponent(value.trim()).replace(/^\/+|\/+$/g, '');
  } catch {
    return null;
  }

  return ROOM_PATTERN.test(decoded) ? decoded : null;
}

function getLastPathSegment(pathname: string) {
  return pathname.split('/').filter(Boolean).at(-1) ?? null;
}

function isJitsiUrl(url: URL) {
  return url.hostname === 'meet.jit.si' || url.hostname.endsWith('.meet.jit.si');
}

function normalizeDisplayName(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, ' ');

  return normalized ? normalized.slice(0, 80) : null;
}
