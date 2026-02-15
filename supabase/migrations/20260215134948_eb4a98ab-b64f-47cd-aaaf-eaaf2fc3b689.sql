ALTER TABLE public.organizations
  ADD COLUMN careers_page_title text DEFAULT 'Join Our Team',
  ADD COLUMN careers_page_subtitle text DEFAULT 'Discover opportunities to grow your career with us. We''re looking for talented people to help shape the future.',
  ADD COLUMN careers_header_color text;