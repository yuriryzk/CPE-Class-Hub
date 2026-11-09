-- Notices and calendar items can be for the whole class ('') or one lab group.
alter table calendar_items add column lab_group text not null default '' check (lab_group in ('', 'G1', 'G2'));
alter table notices add column lab_group text not null default '' check (lab_group in ('', 'G1', 'G2'));

-- Move ELEC (slot 9) between CNS and MOR: 9 -> 7, 7 -> 8, 8 -> 9.
-- The unique check runs per row, so drop it for the swap.
alter table courses drop constraint courses_slot_key;
update courses set slot = case slot when 9 then 7 when 7 then 8 when 8 then 9 end where slot in (7, 8, 9);
alter table courses add constraint courses_slot_key unique (slot);
