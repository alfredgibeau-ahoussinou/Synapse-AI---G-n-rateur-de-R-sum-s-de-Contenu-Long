-- Tables minimales pour le MVP

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  bucket text not null,
  object_key text not null,
  status text not null check (status in ('UPLOADED','TRANSCRIBED','COMPLETED','ERROR')),
  transcription text,
  llm_result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_user_idx on public.jobs(user_id);

-- Trigger pour updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp on public.jobs;
create trigger set_timestamp
before update on public.jobs
for each row
execute function public.set_updated_at();


