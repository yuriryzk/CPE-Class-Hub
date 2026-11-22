-- Syllabus ingest: deadlines that belong to no single course become class-wide
-- ("General") notices, like the files table's null course_id. pgTAP not run —
-- supabase CLI is broken on this host.
alter table notices alter column course_id drop not null;
