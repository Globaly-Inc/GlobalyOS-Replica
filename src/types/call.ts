export interface CallSession {
  id: string;
  organization_id: string;
  conversation_id: string | null;
  space_id: string | null;
  call_type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
  initiated_by: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  participants?: CallParticipant[];
  initiator?: {
    id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface CallParticipant {
  id: string;
  call_id: string;
  employee_id: string;
  organization_id: string;
  status: 'ringing' | 'joined' | 'left' | 'declined' | 'missed';
  joined_at: string | null;
  left_at: string | null;
  is_muted: boolean;
  is_video_off: boolean;
  created_at: string;
  employee?: {
    id: string;
    user_id: string;
    position: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface CallSignal {
  id: string;
  call_id: string;
  from_employee_id: string;
  to_employee_id: string;
  organization_id: string;
  signal_type: 'offer' | 'answer' | 'ice-candidate';
  signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  created_at: string;
}

export interface CallState {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  callDuration: number;
}
