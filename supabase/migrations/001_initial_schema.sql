create table if not exists traces (
  id text primary key,
  created_at timestamptz not null default now(),
  mode text not null check (mode in ('sandbox', 'fiber-rpc')),
  sender_node text not null,
  receiver_node text not null,
  amount numeric not null,
  asset text not null,
  status text not null check (status in ('success', 'pending', 'failed', 'replayed')),
  latency_ms integer not null,
  failure_stage text,
  failure_fingerprint text
);

create table if not exists trace_events (
  id text primary key,
  trace_id text not null references traces(id) on delete cascade,
  timestamp_ms integer not null,
  stage text not null,
  message text not null,
  severity text not null check (severity in ('info', 'warning', 'error', 'success')),
  metadata jsonb
);

create table if not exists diagnoses (
  trace_id text primary key references traces(id) on delete cascade,
  fingerprint text not null,
  title text not null,
  explanation text not null,
  likely_causes text[] not null default '{}',
  suggested_fixes text[] not null default '{}',
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  replay_strategies text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists replay_results (
  id text primary key,
  trace_id text not null references traces(id) on delete cascade,
  scenario text not null,
  changed_condition text not null,
  result text not null check (result in ('success', 'failed')),
  latency_ms integer not null,
  explanation text not null,
  recommended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  trace_id text primary key references traces(id) on delete cascade,
  markdown text not null,
  json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists scenario_runs (
  id bigserial primary key,
  scenario text not null,
  trace_id text references traces(id) on delete set null,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists traces_created_at_idx on traces(created_at desc);
create index if not exists traces_status_idx on traces(status);
create index if not exists traces_failure_fingerprint_idx on traces(failure_fingerprint);
create index if not exists trace_events_trace_id_idx on trace_events(trace_id, timestamp_ms);
create index if not exists replay_results_trace_id_idx on replay_results(trace_id, created_at);

create or replace function replace_replay_results(p_trace_id text, p_results jsonb)
returns void
language plpgsql
as $$
begin
  delete from replay_results where trace_id = p_trace_id;

  insert into replay_results (
    id,
    trace_id,
    scenario,
    changed_condition,
    result,
    latency_ms,
    explanation,
    recommended
  )
  select
    item->>'id',
    p_trace_id,
    item->>'scenario',
    item->>'changed_condition',
    item->>'result',
    (item->>'latency_ms')::integer,
    item->>'explanation',
    coalesce((item->>'recommended')::boolean, false)
  from jsonb_array_elements(p_results) as item;

  update traces
  set status = 'replayed'
  where id = p_trace_id and status = 'failed';
end;
$$;
