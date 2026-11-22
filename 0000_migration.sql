-- Roles
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

-- First user to sign up becomes the only admin
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(424242);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created_first_admin
after insert on auth.users for each row execute function public.handle_first_admin();

create or replace function public.update_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- CV profile (single row)
create table public.cv_profile (
  id int primary key default 1 check (id = 1),
  full_name text not null default '',
  headline text not null default '',
  about text not null default '',
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  website text not null default '',
  linkedin text not null default '',
  photo_url text not null default '',
  updated_at timestamptz not null default now()
);
grant select on public.cv_profile to anon, authenticated;
grant insert, update, delete on public.cv_profile to authenticated;
grant all on public.cv_profile to service_role;
alter table public.cv_profile enable row level security;
create policy "Anyone reads profile" on public.cv_profile for select to anon, authenticated using (true);
create policy "Admin inserts profile" on public.cv_profile for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin updates profile" on public.cv_profile for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger cv_profile_updated before update on public.cv_profile for each row execute function public.update_updated_at();
insert into public.cv_profile (id, full_name, headline, about)
values (1, 'Kayla Carrizal Betancourt', 'Tu título profesional aquí', 'Escribe una breve presentación sobre ti desde el panel de administración.');

-- Experience
create table public.cv_experience (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  organization text not null default '',
  location text not null default '',
  start_date text not null default '',
  end_date text not null default '',
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Education
create table public.cv_education (
  id uuid primary key default gen_random_uuid(),
  degree text not null,
  institution text not null default '',
  start_date text not null default '',
  end_date text not null default '',
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Skills
create table public.cv_skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
-- Recognitions (PDF)
create table public.cv_recognitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null default '',
  issued_date text not null default '',
  description text not null default '',
  file_path text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['cv_experience','cv_education','cv_skills','cv_recognitions'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Anyone reads" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "Admin inserts" on public.%I for insert to authenticated with check (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create policy "Admin updates" on public.%I for update to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create policy "Admin deletes" on public.%I for delete to authenticated using (public.has_role(auth.uid(), ''admin''))', t);
  end loop;
end $$;