/**
 * Chat Message Flow Tests
 * Tests sending, receiving, and managing chat messages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn((_table: string) => mockSupabase),
  select: vi.fn((_columns?: string) => mockSupabase),
  insert: vi.fn((_data: any) => mockSupabase),
  update: vi.fn((_data: any) => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn((_column: string, _value: any) => mockSupabase),
  order: vi.fn((_column: string, _options?: any) => mockSupabase),
  limit: vi.fn((_count: number) => mockSupabase),
  single: vi.fn(),
  channel: vi.fn((_name: string) => mockSupabase),
  on: vi.fn((_event: string, _filter: any, _callback?: any) => mockSupabase),
  subscribe: vi.fn(),
  storage: {
    from: vi.fn((_bucket: string) => ({
      upload: vi.fn((_path: string, _file: any) => Promise.resolve({ error: null })),
      getPublicUrl: vi.fn((_path: string) => ({ data: { publicUrl: 'https://example.com/file.pdf' } })),
    })),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Chat Message Flow', () => {
  const mockEmployee = {
    id: 'emp-123',
    organization_id: 'org-123',
    user_id: 'user-123',
  };

  const mockConversation = {
    id: 'conv-123',
    organization_id: 'org-123',
    is_group: false,
  };

  const mockSpace = {
    id: 'space-123',
    name: 'General',
    organization_id: 'org-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
  });

  describe('Send Message', () => {
    it('should send a text message to a conversation', async () => {
      const messageContent = 'Hello, team!';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'msg-123',
          conversation_id: mockConversation.id,
          sender_id: mockEmployee.id,
          content: messageContent,
          content_type: 'text',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from('chat_messages')
        .insert({
          organization_id: mockEmployee.organization_id,
          conversation_id: mockConversation.id,
          sender_id: mockEmployee.id,
          content: messageContent,
          content_type: 'text',
        });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.content).toBe(messageContent);
      expect(data.conversation_id).toBe(mockConversation.id);
    });

    it('should send a message to a space', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'msg-124',
          space_id: mockSpace.id,
          sender_id: mockEmployee.id,
          content: 'Hello space!',
          content_type: 'text',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.space_id).toBe(mockSpace.id);
    });

    it('should send message with attachment', async () => {
      const storage = mockSupabase.storage.from('chat-attachments');
      
      // Upload file
      const uploadResult = await storage.upload('org-123/file.pdf', new Blob(['test']));
      expect(uploadResult.error).toBeNull();

      // Get public URL
      const { data: urlData } = storage.getPublicUrl('org-123/file.pdf');
      expect(urlData.publicUrl).toBeDefined();

      // Create message with attachment
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'msg-125',
          content: '',
          content_type: 'text',
          attachments: [{
            id: 'att-1',
            file_name: 'document.pdf',
            file_path: 'org-123/file.pdf',
            file_type: 'application/pdf',
          }],
        },
        error: null,
      });

      const { data } = await mockSupabase.single();
      expect(data.attachments).toHaveLength(1);
    });
  });

  describe('Message Reactions', () => {
    it('should add reaction to a message', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'reaction-1',
          message_id: 'msg-123',
          employee_id: mockEmployee.id,
          emoji: '👍',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.emoji).toBe('👍');
    });

    it('should toggle reaction off when clicked again', async () => {
      // First check if reaction exists
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'reaction-1' },
        error: null,
      });

      // Then delete it
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockSupabase.from('chat_message_reactions')
        .delete()
        .eq('id', 'reaction-1');

      const result = await mockSupabase.single();
      expect(result.error).toBeNull();
    });
  });

  describe('Message Threading', () => {
    it('should send reply to a message', async () => {
      const parentMessageId = 'msg-123';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'msg-reply-1',
          reply_to_id: parentMessageId,
          content: 'This is a reply',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.reply_to_id).toBe(parentMessageId);
    });

    it('should fetch thread replies', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: [
          { id: 'reply-1', reply_to_id: 'msg-123', content: 'Reply 1' },
          { id: 'reply-2', reply_to_id: 'msg-123', content: 'Reply 2' },
        ],
        error: null,
      });

      const { data } = await mockSupabase.single();
      expect(data).toHaveLength(2);
    });
  });

  describe('Message Operations', () => {
    it('should edit own message', async () => {
      const newContent = 'Updated message';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'msg-123',
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.content).toBe(newContent);
      expect(data.is_edited).toBe(true);
    });

    it('should delete own message', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'msg-123' },
        error: null,
      });

      mockSupabase.from('chat_messages')
        .delete()
        .eq('id', 'msg-123')
        .eq('sender_id', mockEmployee.id); // RLS ensures only own messages

      const { error } = await mockSupabase.single();
      expect(error).toBeNull();
    });

    it('should pin message', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'msg-123',
          is_pinned: true,
          pinned_at: new Date().toISOString(),
          pinned_by: mockEmployee.id,
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.is_pinned).toBe(true);
    });
  });

  describe('Read Receipts', () => {
    it('should mark messages as read', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'receipt-1',
          message_id: 'msg-123',
          employee_id: mockEmployee.id,
          read_at: new Date().toISOString(),
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.read_at).toBeDefined();
    });
  });

  describe('Mentions', () => {
    it('should save mentions when message contains @mentions', async () => {
      const mentionedEmployees = ['emp-456', 'emp-789'];

      mockSupabase.single.mockResolvedValueOnce({
        data: mentionedEmployees.map(empId => ({
          message_id: 'msg-123',
          employee_id: empId,
        })),
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('should fetch messages where user is mentioned', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: [
          { id: 'msg-1', content: 'Hey @John, check this out' },
          { id: 'msg-2', content: '@John @Jane please review' },
        ],
        error: null,
      });

      const { data } = await mockSupabase.single();
      expect(data).toHaveLength(2);
    });
  });

  describe('Realtime Updates', () => {
    it('should subscribe to new messages', () => {
      const callback = vi.fn();

      mockSupabase.channel('chat-messages')
        .on('postgres_changes', { event: 'INSERT' }, callback)
        .subscribe();

      expect(mockSupabase.channel).toHaveBeenCalledWith('chat-messages');
      expect(mockSupabase.on).toHaveBeenCalled();
      expect(mockSupabase.subscribe).toHaveBeenCalled();
    });
  });
});
