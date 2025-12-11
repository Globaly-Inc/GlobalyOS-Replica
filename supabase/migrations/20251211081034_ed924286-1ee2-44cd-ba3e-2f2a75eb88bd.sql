-- Create employee_documents table
CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  folder TEXT NOT NULL CHECK (folder IN ('personal', 'contracts', 'payslips')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Employees can view their own documents
CREATE POLICY "Users can view own documents"
ON public.employee_documents
FOR SELECT
USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Managers can view direct reports documents
CREATE POLICY "Managers can view direct reports documents"
ON public.employee_documents
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM employees e
  WHERE e.id = employee_documents.employee_id
  AND e.manager_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
));

-- HR and admins can view all documents
CREATE POLICY "HR and admins can view all documents"
ON public.employee_documents
FOR SELECT
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- HR and admins can manage all documents
CREATE POLICY "HR and admins can manage documents"
ON public.employee_documents
FOR ALL
USING (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'));

-- Users can upload to personal folder only
CREATE POLICY "Users can upload to personal folder"
ON public.employee_documents
FOR INSERT
WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  AND folder = 'personal'
);

-- Users can delete their own personal documents
CREATE POLICY "Users can delete own personal documents"
ON public.employee_documents
FOR DELETE
USING (
  employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  AND folder = 'personal'
);

-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-documents', 'employee-documents', false);

-- Storage policies: Users can view their own documents
CREATE POLICY "Users can view own document files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'employee-documents' 
  AND (
    -- User's own documents
    (storage.foldername(name))[1] IN (SELECT id::text FROM employees WHERE user_id = auth.uid())
    -- Or HR/Admin
    OR has_role(auth.uid(), 'hr') 
    OR has_role(auth.uid(), 'admin')
    -- Or manager of the employee
    OR EXISTS (
      SELECT 1 FROM employees e 
      WHERE e.id::text = (storage.foldername(name))[1]
      AND e.manager_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
  )
);

-- Storage policies: HR/Admin can upload
CREATE POLICY "HR and admins can upload document files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
);

-- Storage policies: Users can upload to personal folder
CREATE POLICY "Users can upload to personal folder files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM employees WHERE user_id = auth.uid())
  AND (storage.foldername(name))[2] = 'personal'
);

-- Storage policies: HR/Admin can delete
CREATE POLICY "HR and admins can delete document files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-documents'
  AND (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
);

-- Storage policies: Users can delete their own personal documents
CREATE POLICY "Users can delete own personal document files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-documents'
  AND (storage.foldername(name))[1] IN (SELECT id::text FROM employees WHERE user_id = auth.uid())
  AND (storage.foldername(name))[2] = 'personal'
);