alter table traces drop constraint if exists traces_status_check;

alter table traces
  add constraint traces_status_check
  check (status in ('success', 'pending', 'failed', 'replayed'));
