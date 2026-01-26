-- Increase file size limit to 50MB for chat-attachments bucket
UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'chat-attachments';