-- Enable REPLICA IDENTITY FULL for proper realtime updates on call tables
ALTER TABLE call_participants REPLICA IDENTITY FULL;
ALTER TABLE call_sessions REPLICA IDENTITY FULL;
ALTER TABLE call_signaling REPLICA IDENTITY FULL;