-- A notice can expire: `expires_on` is the last day it shows, and the day after it is hidden from the public
-- pages, the schedule and the nightly summary by itself (officers don't have to mark it done). Null never expires.
-- The public pages filter it in code, so the existing row-level policies cover the new column unchanged.
alter table notices add column expires_on date;
