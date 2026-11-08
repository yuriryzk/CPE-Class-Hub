-- No officers here: the first head officer is added by hand after setup.
insert into courses (slot, name, code, color) values
  (1, 'Microprocessors', 'MICROP', '#ff6b6b'),
  (2, 'Project Management', 'PM', '#ff9f43'),
  (3, 'CpE Laws and Professional Practice', 'LAWS', '#ffd93d'),
  (4, 'Basic Occupational Health and Safety', 'BOHS', '#b8e62e'),
  (5, 'Introduction to HDL', 'HDL', '#3ddc97'),
  (6, 'Computer Networks and Security', 'CNS', '#5b8cff'),
  (7, 'Methods of Research', 'MOR', '#a78bfa'),
  (8, 'Computer Engineering Drafting and Design', 'CEDD', '#ff7ec7'),
  (9, 'Elective 1', 'ELEC', '#c6c3ff');

insert into term (starts_on, week_count) values ('2026-11-15', 18);
insert into term_breaks (starts_on, label) values
  ('2026-12-20', 'Christmas break'),
  ('2026-12-27', 'New Year break');
