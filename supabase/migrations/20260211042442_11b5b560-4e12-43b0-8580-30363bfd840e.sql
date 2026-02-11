-- Update hiring-documents bucket: increase file size limit to 25MB
UPDATE storage.buckets 
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'image/jpeg', 
      'image/png'
    ]
WHERE id = 'hiring-documents';