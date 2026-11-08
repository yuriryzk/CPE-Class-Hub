-- Local-only data, applied by `supabase db reset`, never pushed to production.
-- E2E fixtures: one class week (Week 1, 15-21 Nov 2026) and a break-week item.

insert into class_slots (course_id, weekday, starts_at, ends_at, room, lab_group) values
  ((select id from courses where code = 'MICROP'), 1, '07:30', '09:00', 'ER 301', ''),
  ((select id from courses where code = 'MOR'),    1, '10:30', '12:00', 'ER 204', ''),
  ((select id from courses where code = 'MICROP'), 1, '13:00', '16:00', 'Lab 2', 'G1'),
  ((select id from courses where code = 'CNS'),    2, '09:00', '10:30', 'ER 204', ''),
  ((select id from courses where code = 'CNS'),    2, '13:00', '16:00', 'NetLab', 'G1'),
  ((select id from courses where code = 'CEDD'),   3, '07:30', '09:00', 'Draft 1', ''),
  ((select id from courses where code = 'PM'),     3, '09:00', '10:30', 'ER 301', ''),
  ((select id from courses where code = 'MICROP'), 3, '13:00', '16:00', 'Lab 2', 'G2'),
  ((select id from courses where code = 'LAWS'),   4, '07:30', '09:00', 'ER 105', ''),
  ((select id from courses where code = 'ELEC'),   4, '10:30', '12:00', 'ER 105', ''),
  ((select id from courses where code = 'CNS'),    4, '13:00', '16:00', 'NetLab', 'G2'),
  ((select id from courses where code = 'BOHS'),   5, '09:00', '10:30', 'ER 202', ''),
  ((select id from courses where code = 'HDL'),    5, '13:00', '15:00', 'Lab 3', '');

insert into calendar_items (course_id, kind, title, on_date, at_time, notes) values
  ((select id from courses where code = 'CNS'), 'quiz_exam', 'Quiz 1: OSI model', '2026-11-17', '09:00', 'Chapters 1 and 2'),
  ((select id from courses where code = 'MOR'), 'due', 'Research topic proposal', '2026-11-19', null, null),
  ((select id from courses where code = 'PM'),  'no_class', 'No class', '2026-11-18', null, 'Faculty meeting'),
  ((select id from courses where code = 'HDL'), 'due', 'Verilog exercises', '2026-12-22', null, null);

insert into notices (course_id, title, body, posted_on, calendar_item_id) values
  ((select id from courses where code = 'CNS'), 'Quiz 1 on Tuesday', 'Bring a pen. Covers chapters 1 and 2.', '2026-11-15',
    (select id from calendar_items where title = 'Quiz 1: OSI model')),
  ((select id from courses where code = 'LAWS'), 'Read the code of ethics', 'Read sections 1 to 3 before Thursday.', '2026-11-16', null);
insert into notices (course_id, title, body, posted_on, done) values
  ((select id from courses where code = 'PM'), 'Group list submitted', 'All groups are in. Thank you.', '2026-11-17', true);

insert into files (course_id, title, file_type, url) values
  ((select id from courses where code = 'CNS'), 'Packet Tracer download', 'Link', 'https://www.netacad.com'),
  ((select id from courses where code = 'MICROP'), 'Lab manual', 'PDF', 'https://example.com/microp-lab-manual.pdf'),
  (null, 'Class master list', 'Sheet', 'https://example.com/master-list');
