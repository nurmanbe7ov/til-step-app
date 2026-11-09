create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'admin');
create type public.course_level as enum ('A0', 'A1', 'A2', 'B1');
create type public.exercise_type as enum (
  'flashcard',
  'multiple_choice',
  'sentence_builder',
  'translation',
  'fill_blank',
  'listening'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.user_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  total_xp integer not null default 0 check (total_xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  learned_words_count integer not null default 0 check (learned_words_count >= 0),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  level public.course_level not null,
  order_index integer not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (order_index)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text not null default '',
  order_index integer not null,
  xp_reward integer not null default 10 check (xp_reward >= 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, order_index)
);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  kyrgyz_word text not null,
  russian_translation text not null,
  transcription text,
  example_kyrgyz text,
  example_russian text,
  audio_url text,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type public.exercise_type not null,
  prompt text not null default '',
  payload jsonb not null default '{}'::jsonb,
  accepted_answers text[] not null default '{}',
  explanation text,
  order_index integer not null,
  vocabulary_id uuid references public.vocabulary (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lesson_id, order_index),
  constraint exercises_payload_object check (jsonb_typeof(payload) = 'object')
);

create table public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_exercise_index integer not null default 0 check (current_exercise_index >= 0),
  completed_exercises integer not null default 0 check (completed_exercises >= 0),
  total_exercises integer not null default 0 check (total_exercises >= 0),
  score integer not null default 0 check (score >= 0),
  xp_awarded boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table public.user_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create table public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  word_id uuid not null references public.vocabulary (id) on delete cascade,
  learned boolean not null default false,
  correct_answers integer not null default 0 check (correct_answers >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  last_reviewed_at timestamptz,
  unique (user_id, word_id)
);

create index lessons_course_order_idx on public.lessons (course_id, order_index);
create index exercises_lesson_order_idx on public.exercises (lesson_id, order_index);
create index user_progress_user_idx on public.user_progress (user_id);
create index user_answers_user_idx on public.user_answers (user_id, created_at desc);
create index user_vocabulary_user_idx on public.user_vocabulary (user_id);
create unique index profiles_email_idx on public.profiles (email);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_stats_set_updated_at
before update on public.user_stats
for each row execute function public.set_updated_at();

create trigger user_progress_set_updated_at
before update on public.user_progress
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, new.id::text)
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Смена роли недоступна';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.vocabulary enable row level security;
alter table public.exercises enable row level security;
alter table public.user_progress enable row level security;
alter table public.user_answers enable row level security;
alter table public.user_vocabulary enable row level security;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (public.is_admin());

create policy user_stats_select_own_or_admin
on public.user_stats
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy courses_select_published
on public.courses
for select
to authenticated
using (is_published or public.is_admin());

create policy courses_write_admin
on public.courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy lessons_select_published
on public.lessons
for select
to authenticated
using (
  public.is_admin()
  or (
    is_published
    and exists (
      select 1
      from public.courses
      where courses.id = lessons.course_id
        and courses.is_published
    )
  )
);

create policy lessons_write_admin
on public.lessons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy vocabulary_select_authenticated
on public.vocabulary
for select
to authenticated
using (true);

create policy vocabulary_write_admin
on public.vocabulary
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy exercises_select_published
on public.exercises
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.lessons
    join public.courses on courses.id = lessons.course_id
    where lessons.id = exercises.lesson_id
      and lessons.is_published
      and courses.is_published
  )
);

create policy exercises_write_admin
on public.exercises
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy user_progress_own_or_admin_select
on public.user_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy user_progress_own_write
on public.user_progress
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

create policy user_progress_own_update
on public.user_progress
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy user_answers_own_or_admin_select
on public.user_answers
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy user_answers_own_insert
on public.user_answers
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

create policy user_vocabulary_own_or_admin_select
on public.user_vocabulary
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy user_vocabulary_own_insert
on public.user_vocabulary
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

create policy user_vocabulary_own_update
on public.user_vocabulary
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

revoke all on table
  public.profiles,
  public.user_stats,
  public.courses,
  public.lessons,
  public.vocabulary,
  public.exercises,
  public.user_progress,
  public.user_answers,
  public.user_vocabulary
from anon, public;

grant select, insert, update, delete on table
  public.profiles,
  public.courses,
  public.lessons,
  public.vocabulary,
  public.exercises,
  public.user_progress,
  public.user_answers,
  public.user_vocabulary
to authenticated;

grant select on table public.user_stats to authenticated;
grant execute on function public.is_admin() to authenticated;

insert into public.courses (title, description, level, order_index, is_published)
select
  v.title,
  v.description,
  v.level::public.course_level,
  v.order_index,
  v.is_published
from (
  values
    ('Знакомство', 'Приветствие и первые фразы.', 'A0', 1, true),
    ('Моя семья', 'Семья, возраст и простой рассказ о близких.', 'A1', 2, true),
    ('Мой рабочий день', 'Работа, время и вежливые рабочие фразы.', 'A1', 3, true)
) as v(title, description, level, order_index, is_published)
where not exists (
  select 1 from public.courses where courses.title = v.title
);

insert into public.lessons (course_id, title, description, order_index, xp_reward, is_published)
select c.id, v.title, v.description, v.order_index, 10, true
from public.courses c
join (
  values
    ('Знакомство', 'Приветствие', 'Первые слова при встрече.', 1),
    ('Знакомство', 'Как тебя зовут', 'Имя и знакомство.', 2),
    ('Знакомство', 'Откуда ты', 'Город и происхождение.', 3),
    ('Знакомство', 'Вежливые фразы', 'Спасибо, пожалуйста, извините.', 4),
    ('Знакомство', 'Знакомство с коллегой', 'Короткий разговор на работе.', 5),
    ('Моя семья', 'Члены семьи', 'Мама, папа, брат, сестра.', 1),
    ('Моя семья', 'Моя семья', 'Рассказ о своей семье.', 2),
    ('Моя семья', 'Возраст и числа', 'Сколько лет и простые числа.', 3),
    ('Моя семья', 'Где они живут', 'Дом и город семьи.', 4),
    ('Моя семья', 'Рассказ о семье', 'Несколько предложений подряд.', 5),
    ('Мой рабочий день', 'Профессии', 'Кем я работаю.', 1),
    ('Мой рабочий день', 'На работе', 'Офис и коллеги.', 2),
    ('Мой рабочий день', 'Время', 'Часы и распорядок дня.', 3),
    ('Мой рабочий день', 'Просьба подождать', 'Вежливая пауза в разговоре.', 4),
    ('Мой рабочий день', 'Предложить помощь', 'Чем я могу помочь.', 5)
) as v(course_title, title, description, order_index)
  on c.title = v.course_title
where not exists (
  select 1
  from public.lessons
  where lessons.course_id = c.id
    and lessons.order_index = v.order_index
);
