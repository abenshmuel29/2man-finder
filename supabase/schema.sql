-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  gender text check (gender in ('male', 'female')),
  age integer,
  height text,
  weight text,
  body_type text check (body_type in ('slim', 'athletic', 'average', 'muscular', 'curvy', 'plus_size')),
  sports text[] default '{}',
  interests text[] default '{}',
  hobbies text[] default '{}',
  school text,
  job text,
  snapchat text,
  instagram text,
  neighborhood text check (neighborhood in (
    'south_beach', 'miami_beach', 'brickell', 'downtown', 'wynwood',
    'coral_gables', 'coconut_grove', 'aventura', 'north_miami',
    'south_miami', 'doral', 'kendall', 'hialeah', 'little_havana',
    'midtown', 'design_district'
  )),
  photos text[] default '{}',
  bio text,
  profile_complete boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Friend groups
create table public.friend_groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  gender text check (gender in ('male', 'female')),
  creator_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null
);

-- Friend group members
create table public.friend_group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.friend_groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  vote_count integer default 0,
  invited_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  unique(group_id, user_id)
);

-- Friend group votes
create table public.friend_group_votes (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.friend_groups(id) on delete cascade,
  candidate_id uuid references public.profiles(id) on delete cascade,
  voter_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(group_id, candidate_id, voter_id)
);

-- Interests (likes between users)
create table public.interests (
  id uuid default uuid_generate_v4() primary key,
  from_user_id uuid references public.profiles(id) on delete cascade,
  to_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(from_user_id, to_user_id)
);

-- Passes (not interested)
create table public.passes (
  id uuid default uuid_generate_v4() primary key,
  from_user_id uuid references public.profiles(id) on delete cascade,
  to_user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(from_user_id, to_user_id)
);

-- Double date proposals
create table public.double_date_proposals (
  id uuid default uuid_generate_v4() primary key,
  guy1_id uuid references public.profiles(id) on delete cascade,
  guy2_id uuid references public.profiles(id) on delete cascade,
  girl1_id uuid references public.profiles(id) on delete cascade,
  girl2_id uuid references public.profiles(id) on delete cascade,
  guys_group_id uuid references public.friend_groups(id),
  girls_group_id uuid references public.friend_groups(id),
  status text check (status in ('pending', 'confirmed', 'expired', 'declined')) default 'pending',
  expires_at timestamptz,
  created_at timestamptz default now() not null
);

-- Proposal confirmations
create table public.proposal_confirmations (
  id uuid default uuid_generate_v4() primary key,
  proposal_id uuid references public.double_date_proposals(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  confirmed_at timestamptz default now() not null,
  unique(proposal_id, user_id)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.friend_groups enable row level security;
alter table public.friend_group_members enable row level security;
alter table public.friend_group_votes enable row level security;
alter table public.interests enable row level security;
alter table public.passes enable row level security;
alter table public.double_date_proposals enable row level security;
alter table public.proposal_confirmations enable row level security;

-- Profiles policies
create policy "Profiles viewable by authenticated users" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Friend groups policies
create policy "Groups viewable by authenticated" on public.friend_groups
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can create groups" on public.friend_groups
  for insert with check (auth.role() = 'authenticated');
create policy "Creator can update group" on public.friend_groups
  for update using (auth.uid() = creator_id);

-- Friend group members policies
create policy "Members viewable by authenticated" on public.friend_group_members
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can join groups" on public.friend_group_members
  for insert with check (auth.role() = 'authenticated');
create policy "Members can be updated by authenticated" on public.friend_group_members
  for update using (auth.role() = 'authenticated');

-- Friend group votes policies
create policy "Votes viewable by authenticated" on public.friend_group_votes
  for select using (auth.role() = 'authenticated');
create policy "Authenticated can vote" on public.friend_group_votes
  for insert with check (auth.uid() = voter_id);

-- Interests policies
create policy "Users view their interests" on public.interests
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "Users create interests" on public.interests
  for insert with check (auth.uid() = from_user_id);

-- Passes policies
create policy "Users view own passes" on public.passes
  for select using (auth.uid() = from_user_id);
create policy "Users create passes" on public.passes
  for insert with check (auth.uid() = from_user_id);

-- Proposals policies
create policy "Participants view proposals" on public.double_date_proposals
  for select using (
    auth.uid() = guy1_id or auth.uid() = guy2_id or
    auth.uid() = girl1_id or auth.uid() = girl2_id
  );
create policy "Authenticated create proposals" on public.double_date_proposals
  for insert with check (auth.role() = 'authenticated');
create policy "Participants update proposals" on public.double_date_proposals
  for update using (
    auth.uid() = guy1_id or auth.uid() = guy2_id or
    auth.uid() = girl1_id or auth.uid() = girl2_id
  );

-- Confirmations policies
create policy "Authenticated view confirmations" on public.proposal_confirmations
  for select using (auth.role() = 'authenticated');
create policy "Users confirm own proposals" on public.proposal_confirmations
  for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage bucket for photos
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);

create policy "Anyone can view photos" on storage.objects
  for select using (bucket_id = 'photos');
create policy "Authenticated users can upload photos" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "Users can delete own photos" on storage.objects
  for delete using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- Function to check for and create double date proposals after a mutual match
create or replace function public.check_and_create_proposals(
  p_guy_id uuid,
  p_girl_id uuid
) returns void as $$
declare
  v_guy_group record;
  v_girl_group record;
  v_guy2 record;
  v_girl2 record;
  v_exists boolean;
begin
  for v_guy_group in
    select fgm.group_id
    from public.friend_group_members fgm
    join public.friend_groups fg on fg.id = fgm.group_id
    where fgm.user_id = p_guy_id and fgm.status = 'approved' and fg.gender = 'male'
  loop
    for v_girl_group in
      select fgm.group_id
      from public.friend_group_members fgm
      join public.friend_groups fg on fg.id = fgm.group_id
      where fgm.user_id = p_girl_id and fgm.status = 'approved' and fg.gender = 'female'
    loop
      for v_guy2 in
        select fgm.user_id
        from public.friend_group_members fgm
        where fgm.group_id = v_guy_group.group_id
          and fgm.status = 'approved'
          and fgm.user_id != p_guy_id
      loop
        for v_girl2 in
          select fgm.user_id
          from public.friend_group_members fgm
          where fgm.group_id = v_girl_group.group_id
            and fgm.status = 'approved'
            and fgm.user_id != p_girl_id
            and exists (select 1 from public.interests where from_user_id = v_guy2.user_id and to_user_id = fgm.user_id)
            and exists (select 1 from public.interests where from_user_id = fgm.user_id and to_user_id = v_guy2.user_id)
        loop
          select exists (
            select 1 from public.double_date_proposals
            where status = 'pending'
              and ((guy1_id = p_guy_id and guy2_id = v_guy2.user_id) or (guy1_id = v_guy2.user_id and guy2_id = p_guy_id))
              and ((girl1_id = p_girl_id and girl2_id = v_girl2.user_id) or (girl1_id = v_girl2.user_id and girl2_id = p_girl_id))
          ) into v_exists;

          if not v_exists then
            insert into public.double_date_proposals
              (guy1_id, guy2_id, girl1_id, girl2_id, guys_group_id, girls_group_id, status, expires_at)
            values
              (p_guy_id, v_guy2.user_id, p_girl_id, v_girl2.user_id,
               v_guy_group.group_id, v_girl_group.group_id, 'pending', now() + interval '24 hours');
          end if;
        end loop;
      end loop;
    end loop;
  end loop;
end;
$$ language plpgsql security definer;
