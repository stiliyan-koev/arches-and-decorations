-- GDPR storage limit for booking requests. Run once in the Supabase SQL editor.
-- Additive, safe to re-run. No code depends on it, but /privacy already
-- promises it: 12 months after the event, a request forgets who sent it.
--
-- What goes: bookings.customer_name, phone, note and booking_items.custom_text
-- (the requirements text, which can hold a child's name). What stays: the
-- products, colours, quantities, dates, city and prices — so past bookings
-- still count in any statistics, with nothing that points to a person.
--
-- "The event" is the last day the booking occupies: the return date for a
-- rental, the event day for a service. A row without dates falls back to when
-- it was sent.
--
-- Runs every night at 03:15 UTC through pg_cron, which Supabase ships. To see
-- it worked: select * from cron.job;  and, the morning after,
-- select * from cron.job_run_details order by start_time desc limit 5;

create or replace function forget_old_requests() returns void
language sql set search_path = public as $$
  update booking_items bi
     set custom_text = null
    from bookings b
   where b.id = bi.booking_id
     and bi.custom_text is not null
     and coalesce(b.end_date, b.start_date, b.event_date, b.created_at::date)
         < (current_date - interval '12 months')::date;

  update bookings
     set customer_name = null, phone = null, note = null
   where (customer_name is not null or phone is not null or note is not null)
     and coalesce(end_date, start_date, event_date, created_at::date)
         < (current_date - interval '12 months')::date;
$$;

-- Only the nightly job calls it. Supabase grants new functions to the API
-- roles by default, and nobody on the site should be able to trigger a wipe.
revoke execute on function forget_old_requests() from public, anon, authenticated, service_role;

create extension if not exists pg_cron;

-- Same name = the existing job is updated, so re-running doesn't add a second.
select cron.schedule('forget-old-requests', '15 3 * * *', 'select forget_old_requests()');
