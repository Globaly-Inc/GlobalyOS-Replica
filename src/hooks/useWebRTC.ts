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

export const useWebRTC = (callId: string | null, participants: CallParticipant[]) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const screenStream = useRef<MediaStream | null>(null);
  const originalVideoTrack = useRef<MediaStreamTrack | null>(null);
  
  const { data: currentEmployee } = useCurrentEmployee();
  const sendSignal = useSendSignal();
  
  // Initialize local media
  const initializeMedia = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720, facingMode: 'user' } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);
      setIsVideoOff(!video);
      
      // Store original video track for screen share restoration
      if (video) {
        originalVideoTrack.current = stream.getVideoTracks()[0] || null;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
      throw error;
    }
  }, []);
  
  // Create peer connection for a specific participant
  const createPeerConnection = useCallback((targetEmployeeId: string, stream: MediaStream) => {
    if (!callId || !currentEmployee) return null;
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
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
      console.log('Received remote track from:', targetEmployeeId);
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => new Map(prev).set(targetEmployeeId, remoteStream));
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${targetEmployeeId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(targetEmployeeId);
          return next;
        });
      }
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
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      sendSignal.mutate({
        callId,
        toEmployeeId: targetEmployeeId,
        signalType: 'offer',
        signalData: offer,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [callId, createPeerConnection, sendSignal]);
  
  // Handle incoming signal
  const handleSignal = useCallback(async (signal: CallSignal, stream: MediaStream) => {
    if (!currentEmployee || signal.to_employee_id !== currentEmployee.id) return;
    
    const fromId = signal.from_employee_id;
    let pc = peerConnections.current.get(fromId);
    
    if (signal.signal_type === 'offer') {
      if (!pc) {
        pc = createPeerConnection(fromId, stream);
        if (!pc) return;
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data as RTCSessionDescriptionInit));
        
        // Apply any pending ICE candidates
        const pending = pendingCandidates.current.get(fromId) || [];
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
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    } else if (signal.signal_type === 'answer') {
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data as RTCSessionDescriptionInit));
          
          // Apply any pending ICE candidates
          const pending = pendingCandidates.current.get(fromId) || [];
          for (const candidate of pending) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates.current.delete(fromId);
        } catch (error) {
          console.error('Error handling answer:', error);
        }
      }
    } else if (signal.signal_type === 'ice-candidate') {
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data as RTCIceCandidateInit));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      } else {
        // Queue the candidate
        const pending = pendingCandidates.current.get(fromId) || [];
        pending.push(signal.signal_data as RTCIceCandidateInit);
        pendingCandidates.current.set(fromId, pending);
      }
    }
  }, [currentEmployee, createPeerConnection, sendSignal]);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, [localStream]);
  
  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setIsVideoOff(prev => !prev);
      } else if (isVideoOff) {
        // Add video if it wasn't there
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const videoTrack = newStream.getVideoTracks()[0];
          localStream.addTrack(videoTrack);
          originalVideoTrack.current = videoTrack;
          
          // Update all peer connections
          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, localStream);
            }
          });
          
          setIsVideoOff(false);
        } catch (error) {
          console.error('Error adding video:', error);
          toast.error('Failed to enable camera');
        }
      }
    }
  }, [localStream, isVideoOff]);
  
  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!localStream) return;
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      
      screenStream.current = stream;
      const screenTrack = stream.getVideoTracks()[0];
      
      // Store original video track before replacing
      const currentVideoTrack = localStream.getVideoTracks()[0];
      if (currentVideoTrack) {
        originalVideoTrack.current = currentVideoTrack;
      }
      
      // Replace video track in all peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });
      
      // Handle browser's "Stop sharing" button
      screenTrack.onended = () => {
        stopScreenShare();
      };
      
      setIsScreenSharing(true);
      toast.success('Screen sharing started');
    } catch (error) {
      console.error('Screen share failed:', error);
      if ((error as Error).name === 'NotAllowedError') {
        toast.error('Screen sharing was cancelled');
      } else {
        toast.error('Failed to share screen');
      }
    }
  }, [localStream]);
  
  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    // Restore camera track
    if (originalVideoTrack.current && !isVideoOff) {
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && originalVideoTrack.current) {
          sender.replaceTrack(originalVideoTrack.current);
        }
      });
    }
    
    setIsScreenSharing(false);
    toast.info('Screen sharing stopped');
  }, [isVideoOff]);
  
  // Cleanup
  const cleanup = useCallback(() => {
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    
    if (screenStream.current) {
      screenStream.current.getTracks().forEach(track => track.stop());
      screenStream.current = null;
    }
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    setRemoteStreams(new Map());
    pendingCandidates.current.clear();
    setIsScreenSharing(false);
    originalVideoTrack.current = null;
  }, [localStream]);
  
  // Listen for signaling
  useEffect(() => {
    if (!callId || !currentEmployee || !localStream) return;
    
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
          handleSignal(signal, localStream);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, currentEmployee, localStream, handleSignal]);
  
  // Create offers to all participants when joining
  useEffect(() => {
    if (!callId || !currentEmployee || !localStream || participants.length === 0) return;
    
    const otherParticipants = participants.filter(
      p => p.employee_id !== currentEmployee.id && p.status === 'joined'
    );
    
    otherParticipants.forEach(participant => {
      if (!peerConnections.current.has(participant.employee_id)) {
        createOffer(participant.employee_id, localStream);
      }
    });
  }, [callId, currentEmployee, localStream, participants, createOffer]);
  
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
