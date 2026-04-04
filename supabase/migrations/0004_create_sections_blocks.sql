-- Sections table
create table public.sections (
  id serial primary key,
  page_id integer not null references public.pages(id) on delete cascade,
  type text not null default 'default',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sections_page on public.sections(page_id);

create trigger sections_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

-- Blocks table
create table public.blocks (
  id serial primary key,
  section_id integer not null references public.sections(id) on delete cascade,
  type text not null,
  content jsonb not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blocks_section on public.blocks(section_id);

create trigger blocks_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();
