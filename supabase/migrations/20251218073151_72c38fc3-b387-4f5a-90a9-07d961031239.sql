-- Create storage bucket for KPI attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('kpi-attachments', 'kpi-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for KPI attachments
CREATE POLICY "Users can upload KPI attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'kpi-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view KPI attachments in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'kpi-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own KPI attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'kpi-attachments'
  AND auth.uid() IS NOT NULL
);

-- Add milestones column to kpis table
ALTER TABLE public.kpis 
ADD COLUMN IF NOT EXISTS milestones jsonb DEFAULT '[
  {"percent": 25, "label": "Getting Started", "reached": false, "reached_at": null},
  {"percent": 50, "label": "Halfway There", "reached": false, "reached_at": null},
  {"percent": 75, "label": "Almost Done", "reached": false, "reached_at": null},
  {"percent": 100, "label": "Goal Achieved!", "reached": false, "reached_at": null}
]'::jsonb;