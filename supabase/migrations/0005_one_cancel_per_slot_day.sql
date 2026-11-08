-- A class can be cancelled once per day; a double tap must not create two rows.
create unique index calendar_items_slot_day_key on calendar_items (class_slot_id, on_date) where class_slot_id is not null;
