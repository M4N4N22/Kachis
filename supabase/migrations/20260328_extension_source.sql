-- Allow browser companion commitments (run if attestations table already exists).
alter table public.attestations drop constraint if exists attestations_source_check;
alter table public.attestations
  add constraint attestations_source_check
  check (source in ('console', 'agent', 'extension', 'chain'));
