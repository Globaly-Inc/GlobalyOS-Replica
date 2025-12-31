import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSendSignal, useCurrentEmployee } from '@/services/useCall';
import { CallParticipant, CallSignal } from '@/types/call';
import { toast } from 'sonner';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Create a black placeholder video track
const createPlaceholderVideoTrack = (): MediaStreamTrack => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const stream = canvas.captureStream(1);
  const track = stream.getVideoTracks()[0];
  track.enabled = false;
  return track;
};

export const useWebRTC = (callId: string | null, participants: CallParticipant[]) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const screenStream = useRef<MediaStream | null>(null);
  const originalVideoTrack = useRef<MediaStreamTrack | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const makingOffer = useRef<Set<string>>(new Set());
  
  const { data: currentEmployee } = useCurrentEmployee();
  const sendSignal = useSendSignal();
  
  // Initialize local media - ALWAYS get both audio and video tracks for consistent m-lines
  const initializeMedia = useCallback(async (videoEnabled: boolean) => {
    try {
      console.log('[WebRTC] Initializing media, videoEnabled:', videoEnabled);
      
      // Always get audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: videoEnabled ? { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: 'user' 
        } : false,
      });
      
      // If video wasn't requested, add a placeholder track to ensure consistent m-line ordering
      if (!videoEnabled) {
        const placeholderTrack = createPlaceholderVideoTrack();
        stream.addTrack(placeholderTrack);
        console.log('[WebRTC] Added placeholder video track');
      } else {
        originalVideoTrack.current = stream.getVideoTracks()[0] || null;
      }
      
      // Log all tracks
      stream.getTracks().forEach(track => {
        console.log(`[WebRTC] Track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoOff(!videoEnabled);
      
      return stream;
    } catch (error) {
      console.error('[WebRTC] Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
      throw error;
    }
  }, []);
  
  // Create peer connection for a specific participant
  const createPeerConnection = useCallback((targetEmployeeId: string, stream: MediaStream) => {
    if (!callId || !currentEmployee) return null;
    
    console.log('[WebRTC] Creating peer connection for:', targetEmployeeId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks - IMPORTANT: add in consistent order (audio first, then video)
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    
    audioTracks.forEach(track => {
      console.log('[WebRTC] Adding audio track:', track.enabled, track.readyState);
      pc.addTrack(track, stream);
    });
    
    videoTracks.forEach(track => {
      console.log('[WebRTC] Adding video track:', track.enabled, track.readyState);
      pc.addTrack(track, stream);
    });
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate to:', targetEmployeeId);
        sendSignal.mutate({
          callId,
          toEmployeeId: targetEmployeeId,
          signalType: 'ice-candidate',
          signalData: event.candidate.toJSON(),
        });
      }
    };
    
    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received track from:', targetEmployeeId, 
        'kind:', event.track.kind, 
        'enabled:', event.track.enabled,
        'readyState:', event.track.readyState
      );
      
      const remoteStream = event.streams[0];
      if (remoteStream) {
        // Listen for track state changes
        event.track.onended = () => console.log('[WebRTC] Remote track ended:', event.track.kind);
        event.track.onmute = () => console.log('[WebRTC] Remote track muted:', event.track.kind);
        event.track.onunmute = () => console.log('[WebRTC] Remote track unmuted:', event.track.kind);
        
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(targetEmployeeId, remoteStream);
          return next;
        });
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state ${targetEmployeeId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(targetEmployeeId);
          return next;
        });
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state ${targetEmployeeId}:`, pc.iceConnectionState);
    };
    
    pc.onsignalingstatechange = () => {
      console.log(`[WebRTC] Signaling state ${targetEmployeeId}:`, pc.signalingState);
    };
    
    peerConnections.current.set(targetEmployeeId, pc);
    return pc;
  }, [callId, currentEmployee, sendSignal]);
  
  // Create and send offer
  const createOffer = useCallback(async (targetEmployeeId: string, stream: MediaStream) => {
    if (!callId) return;
    
    let pc = peerConnections.current.get(targetEmployeeId);
    if (!pc) {
      pc = createPeerConnection(targetEmployeeId, stream);
      if (!pc) return;
    }
    
    // Avoid multiple simultaneous offers
    if (makingOffer.current.has(targetEmployeeId)) {
      console.log('[WebRTC] Already making offer to:', targetEmployeeId);
      return;
    }
    
    // Only create offer if in stable state
    if (pc.signalingState !== 'stable') {
      console.log('[WebRTC] Not in stable state for:', targetEmployeeId, pc.signalingState);
      return;
    }
    
    try {
      makingOffer.current.add(targetEmployeeId);
      console.log('[WebRTC] Creating offer for:', targetEmployeeId);
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await pc.setLocalDescription(offer);
      
      sendSignal.mutate({
        callId,
        toEmployeeId: targetEmployeeId,
        signalType: 'offer',
        signalData: offer,
      });
      
      console.log('[WebRTC] Offer sent to:', targetEmployeeId);
    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error);
    } finally {
      makingOffer.current.delete(targetEmployeeId);
    }
  }, [callId, createPeerConnection, sendSignal]);
  
  // Handle incoming signal
  const handleSignal = useCallback(async (signal: CallSignal, stream: MediaStream) => {
    if (!currentEmployee || signal.to_employee_id !== currentEmployee.id) return;
    
    const fromId = signal.from_employee_id;
    console.log('[WebRTC] Handling signal:', signal.signal_type, 'from:', fromId);
    
    let pc = peerConnections.current.get(fromId);
    
    if (signal.signal_type === 'offer') {
      if (!pc) {
        pc = createPeerConnection(fromId, stream);
        if (!pc) return;
      }
      
      try {
        // Handle glare: determine who should win based on ID comparison
        const isPolite = currentEmployee.id < fromId;
        const offerCollision = makingOffer.current.has(fromId) || pc.signalingState !== 'stable';
        
        if (offerCollision) {
          if (!isPolite) {
            console.log('[WebRTC] Ignoring offer (we are impolite and win)');
            return;
          }
          // We're polite, rollback our offer
          console.log('[WebRTC] Rolling back (we are polite)');
          await pc.setLocalDescription({ type: 'rollback' });
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data as RTCSessionDescriptionInit));
        
        // Apply any pending ICE candidates
        const pending = pendingCandidates.current.get(fromId) || [];
        console.log('[WebRTC] Applying', pending.length, 'pending candidates');
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current.delete(fromId);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        sendSignal.mutate({
          callId: signal.call_id,
          toEmployeeId: fromId,
          signalType: 'answer',
          signalData: answer,
        });
        
        console.log('[WebRTC] Answer sent to:', fromId);
      } catch (error) {
        console.error('[WebRTC] Error handling offer:', error);
      }
    } else if (signal.signal_type === 'answer') {
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data as RTCSessionDescriptionInit));
          
          // Apply any pending ICE candidates
          const pending = pendingCandidates.current.get(fromId) || [];
          console.log('[WebRTC] Applying', pending.length, 'pending candidates after answer');
          for (const candidate of pending) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates.current.delete(fromId);
          
          console.log('[WebRTC] Answer processed from:', fromId);
        } catch (error) {
          console.error('[WebRTC] Error handling answer:', error);
        }
      } else {
        console.log('[WebRTC] Ignoring answer, not in have-local-offer state:', pc?.signalingState);
      }
    } else if (signal.signal_type === 'ice-candidate') {
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data as RTCIceCandidateInit));
        } catch (error) {
          console.error('[WebRTC] Error adding ICE candidate:', error);
        }
      } else {
        // Queue the candidate
        const pending = pendingCandidates.current.get(fromId) || [];
        pending.push(signal.signal_data as RTCIceCandidateInit);
        pendingCandidates.current.set(fromId, pending);
        console.log('[WebRTC] Queued ICE candidate, total:', pending.length);
      }
    }
  }, [currentEmployee, createPeerConnection, sendSignal]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('[WebRTC] Audio track enabled:', audioTrack.enabled);
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);
  
  // Toggle video - uses replaceTrack to avoid m-line issues
  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    
    try {
      if (isVideoOff) {
        // Turn video ON - get new camera track
        console.log('[WebRTC] Turning video ON');
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } 
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (!newVideoTrack) {
          console.error('[WebRTC] No video track obtained');
          return;
        }
        
        originalVideoTrack.current = newVideoTrack;
        
        // Replace track in local stream
        const oldTrack = stream.getVideoTracks()[0];
        if (oldTrack) {
          stream.removeTrack(oldTrack);
          oldTrack.stop();
        }
        stream.addTrack(newVideoTrack);
        
        // Replace track in all peer connections using replaceTrack (no renegotiation needed)
        for (const [peerId, pc] of peerConnections.current) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
            console.log('[WebRTC] Replaced video track for:', peerId);
          }
        }
        
        setIsVideoOff(false);
        // Trigger re-render with new stream reference
        setLocalStream(new MediaStream(stream.getTracks()));
      } else {
        // Turn video OFF - replace with placeholder
        console.log('[WebRTC] Turning video OFF');
        const placeholderTrack = createPlaceholderVideoTrack();
        
        const oldTrack = stream.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          stream.removeTrack(oldTrack);
        }
        stream.addTrack(placeholderTrack);
        
        // Replace in peer connections
        for (const [peerId, pc] of peerConnections.current) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(placeholderTrack);
            console.log('[WebRTC] Replaced with placeholder for:', peerId);
          }
        }
        
        originalVideoTrack.current = null;
        setIsVideoOff(true);
        setLocalStream(new MediaStream(stream.getTracks()));
      }
    } catch (error) {
      console.error('[WebRTC] Error toggling video:', error);
      toast.error('Failed to toggle camera');
    }
  }, [isVideoOff]);
  
  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    
    try {
      console.log('[WebRTC] Starting screen share');
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      
      screenStream.current = displayStream;
      const screenTrack = displayStream.getVideoTracks()[0];
      
      // Store current video track for restoration
      const currentVideoTrack = stream.getVideoTracks()[0];
      if (currentVideoTrack && currentVideoTrack.readyState === 'live' && currentVideoTrack.enabled) {
        originalVideoTrack.current = currentVideoTrack;
      }
      
      // Handle browser's "Stop sharing" button
      screenTrack.onended = () => {
        console.log('[WebRTC] Screen share ended by user');
        stopScreenShare();
      };
      
      // Replace video track with screen track in all peer connections
      for (const [peerId, pc] of peerConnections.current) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
          console.log('[WebRTC] Screen track replaced for:', peerId);
        }
      }
      
      // Update local stream
      const oldTrack = stream.getVideoTracks()[0];
      if (oldTrack) {
        stream.removeTrack(oldTrack);
      }
      stream.addTrack(screenTrack);
      
      setIsScreenSharing(true);
      setLocalStream(new MediaStream(stream.getTracks()));
      toast.success('Screen sharing started');
    } catch (error) {
      console.error('[WebRTC] Screen share failed:', error);
      if ((error as Error).name === 'NotAllowedError') {
        toast.error('Screen sharing was cancelled');
      } else {
        toast.error('Failed to share screen');
      }
    }
  }, []);
  
  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    const stream = localStreamRef.current;
    
    console.log('[WebRTC] Stopping screen share');
    
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    // Determine what to restore
    let restoreTrack: MediaStreamTrack;
    
    if (originalVideoTrack.current && originalVideoTrack.current.readyState === 'live') {
      restoreTrack = originalVideoTrack.current;
      console.log('[WebRTC] Restoring original camera track');
    } else if (!isVideoOff) {
      // Get new camera track
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        restoreTrack = newStream.getVideoTracks()[0];
        originalVideoTrack.current = restoreTrack;
        console.log('[WebRTC] Got new camera track');
      } catch (error) {
        console.error('[WebRTC] Error getting camera:', error);
        restoreTrack = createPlaceholderVideoTrack();
      }
    } else {
      restoreTrack = createPlaceholderVideoTrack();
      console.log('[WebRTC] Using placeholder track');
    }
    
    // Replace in peer connections
    for (const [peerId, pc] of peerConnections.current) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(restoreTrack);
        console.log('[WebRTC] Restored track for:', peerId);
      }
    }
    
    // Update local stream
    if (stream) {
      const oldTrack = stream.getVideoTracks()[0];
      if (oldTrack) {
        stream.removeTrack(oldTrack);
      }
      stream.addTrack(restoreTrack);
      setLocalStream(new MediaStream(stream.getTracks()));
    }
    
    setIsScreenSharing(false);
    toast.info('Screen sharing stopped');
  }, [isVideoOff]);
  
  // Cleanup
  const cleanup = useCallback(() => {
    console.log('[WebRTC] Cleaning up');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    setRemoteStreams(new Map());
    pendingCandidates.current.clear();
    makingOffer.current.clear();
    setIsScreenSharing(false);
    originalVideoTrack.current = null;
  }, []);
  
  // Listen for signaling
  useEffect(() => {
    if (!callId || !currentEmployee || !localStreamRef.current) return;
    
    console.log('[WebRTC] Setting up signaling listener for call:', callId);
    
    const channel = supabase
      .channel(`call-signaling-${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signaling',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          const signal = payload.new as unknown as CallSignal;
          if (localStreamRef.current) {
            handleSignal(signal, localStreamRef.current);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, currentEmployee, handleSignal]);
  
  // Create offers to all participants when joining
  useEffect(() => {
    if (!callId || !currentEmployee || !localStreamRef.current || participants.length === 0) return;
    
    const otherParticipants = participants.filter(
      p => p.employee_id !== currentEmployee.id && p.status === 'joined'
    );
    
    console.log('[WebRTC] Creating offers for participants:', otherParticipants.map(p => p.employee_id));
    
    otherParticipants.forEach(participant => {
      if (!peerConnections.current.has(participant.employee_id) && localStreamRef.current) {
        // Add a small delay to ensure everything is ready
        setTimeout(() => {
          if (localStreamRef.current) {
            createOffer(participant.employee_id, localStreamRef.current);
          }
        }, 100);
      }
    });
  }, [callId, currentEmployee, participants, createOffer]);
  
  return {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    initializeMedia,
    createOffer,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup,
  };
};
