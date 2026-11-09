// Row shapes as returned by Supabase: uuids, dates and times are strings.
export type Course = {
  id: string;
  slot: number;
  name: string;
  code: string;
  color: string;
  instructor: string; // '' when not set
};

export type Slot = {
  id: string;
  course_id: string;
  weekday: number; // 1 = Monday ... 7 = Sunday
  starts_at: string; // 'HH:MM:SS'
  ends_at: string;
  room: string | null;
  lab_group: '' | 'G1' | 'G2';
};

export type Item = {
  created_at: string;
  id: string;
  course_id: string;
  kind: 'quiz_exam' | 'due' | 'no_class' | 'extra_class';
  title: string;
  on_date: string; // 'YYYY-MM-DD'
  at_time: string | null;
  notes: string | null;
  moved_from_date: string | null;
  moved_from_time: string | null;
  class_slot_id: string | null;
  lab_group: '' | 'G1' | 'G2';
};

export type Notice = {
  created_at: string;
  id: string;
  course_id: string;
  title: string;
  body: string;
  posted_on: string;
  pinned: boolean;
  done: boolean;
  calendar_item_id: string | null;
  created_by: string | null;
  lab_group: '' | 'G1' | 'G2';
};

export type FileRow = {
  created_at: string;
  id: string;
  course_id: string | null;
  title: string;
  file_type: string;
  week_label: string | null;
  url: string | null;
  storage_path: string | null;
  size_bytes: number | null;
  mime_type: string | null;
};

export type Term = { starts_on: string; week_count: number };
export type TermBreak = { starts_on: string; label: string };

/** Colour of class-wide (General) files: the site's cyan. */
export const GENERAL = '#22d3ee';

/** Kind labels shown to people. Lives here, not in a client component, so server pages can read it. */
export const KIND: Record<Item['kind'], string> = { quiz_exam: 'Quiz/exam', due: 'Due', no_class: 'No class', extra_class: 'Extra class' };
