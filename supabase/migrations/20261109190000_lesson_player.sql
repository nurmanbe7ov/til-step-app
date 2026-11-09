-- Черновик урока «Приветствие»: фразы нужно сверить с носителем.
-- Запускать этот файл отдельно. Init-миграцию повторно не запускать.

create or replace function public.normalize_answer(value text)
returns text
language sql
immutable
as $$
  select trim(
    both ' ' from regexp_replace(
      translate(
        translate(
          coalesce(value, ''),
          'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯӨҮҢ',
          'абвгдеёжзийклмнопрстуфхцчшщъыьэюяөүң'
        ),
        'ё.,!?;:«»"()',
        'е'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create or replace function public.submit_answer(p_exercise_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_exercise_id uuid;
  v_lesson_id uuid;
  v_type public.exercise_type;
  v_payload jsonb;
  v_answers text[];
  v_explanation text;
  v_vocabulary_id uuid;
  v_position integer;
  v_xp_reward integer;
  v_lesson_published boolean;
  v_course_published boolean;
  v_total integer;
  v_progress public.user_progress%rowtype;
  v_stats public.user_stats%rowtype;
  v_raw text;
  v_normalized text;
  v_correct boolean;
  v_correct_answer text;
  v_next integer;
  v_score integer;
  v_finished boolean;
  v_status text;
  v_new_word boolean := false;
  v_today date;
  v_streak integer;
  v_longest integer;
  v_last date;
  v_xp integer;
  v_xp_gained integer := 0;
  v_learned integer;
  v_xp_awarded boolean;
begin
  v_user := auth.uid();

  if v_user is null then
    return jsonb_build_object('error', 'Войдите снова');
  end if;

  v_exercise_id := p_exercise_id;

  if v_exercise_id is null then
    return jsonb_build_object('error', 'Задание не найдено');
  end if;

  select
    exercise.lesson_id,
    exercise.type,
    exercise.payload,
    exercise.accepted_answers,
    exercise.explanation,
    exercise.vocabulary_id,
    exercise.position
  into
    v_lesson_id,
    v_type,
    v_payload,
    v_answers,
    v_explanation,
    v_vocabulary_id,
    v_position
  from (
    select
      exercises.id,
      exercises.lesson_id,
      exercises.type,
      exercises.payload,
      exercises.accepted_answers,
      exercises.explanation,
      exercises.vocabulary_id,
      (row_number() over (order by exercises.order_index) - 1)::integer as position
    from public.exercises
    where exercises.lesson_id = (
      select lesson_id
      from public.exercises
      where id = v_exercise_id
    )
  ) as exercise
  where exercise.id = v_exercise_id;

  if not found then
    return jsonb_build_object('error', 'Задание не найдено');
  end if;

  select
    lessons.xp_reward,
    lessons.is_published,
    courses.is_published
  into
    v_xp_reward,
    v_lesson_published,
    v_course_published
  from public.lessons
  join public.courses on courses.id = lessons.course_id
  where lessons.id = v_lesson_id;

  if not found then
    return jsonb_build_object('error', 'Задание не найдено');
  end if;

  if (not v_lesson_published or not v_course_published) and not public.is_admin() then
    return jsonb_build_object('error', 'Урок недоступен');
  end if;

  select count(*)::integer
  into v_total
  from public.exercises
  where lesson_id = v_lesson_id;

  insert into public.user_progress (user_id, lesson_id, total_exercises)
  values (v_user, v_lesson_id, v_total)
  on conflict (user_id, lesson_id) do nothing;

  select *
  into v_progress
  from public.user_progress
  where user_id = v_user
    and lesson_id = v_lesson_id
  for update;

  if not found then
    return jsonb_build_object('error', 'Не удалось сохранить ответ. Попробуйте ещё раз.');
  end if;

  select coalesce(current_streak, 0)
  into v_streak
  from public.user_stats
  where user_id = v_user;

  if v_progress.status = 'completed' or v_progress.current_exercise_index >= v_total then
    return jsonb_build_object(
      'isCorrect', false,
      'correctAnswer', '',
      'explanation', null,
      'nextIndex', v_total,
      'total', v_total,
      'correctCount', v_progress.score,
      'completed', true,
      'xpGained', 0,
      'streak', coalesce(v_streak, 0)
    );
  end if;

  if v_position is null or v_position <> v_progress.current_exercise_index then
    return jsonb_build_object('error', 'Это задание уже пройдено или ещё не открыто');
  end if;

  v_raw := coalesce(p_answer, '');

  if char_length(v_raw) > 500 then
    return jsonb_build_object('error', 'Не удалось проверить ответ.');
  end if;

  v_normalized := public.normalize_answer(v_raw);
  v_correct := v_type = 'flashcard'
    or (
      v_normalized <> ''
      and exists (
        select 1
        from unnest(v_answers) as candidate
        where public.normalize_answer(candidate) = v_normalized
      )
    );

  v_correct_answer := coalesce(v_answers[1], '');

  if v_type = 'flashcard' then
    v_correct_answer := coalesce(v_payload ->> 'russianTranslation', v_correct_answer);
  end if;

  insert into public.user_stats (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select *
  into v_stats
  from public.user_stats
  where user_id = v_user
  for update;

  if not found then
    raise exception 'stats_missing';
  end if;

  insert into public.user_answers (user_id, exercise_id, lesson_id, answer, is_correct)
  values (v_user, v_exercise_id, v_lesson_id, v_raw, v_correct);

  if v_correct and v_vocabulary_id is not null then
    v_new_word := not exists (
      select 1
      from public.user_vocabulary
      where user_id = v_user
        and word_id = v_vocabulary_id
    );

    insert into public.user_vocabulary (
      user_id,
      word_id,
      learned,
      correct_answers,
      wrong_answers,
      last_reviewed_at
    )
    values (v_user, v_vocabulary_id, true, 1, 0, now())
    on conflict (user_id, word_id) do update
    set
      learned = true,
      correct_answers = public.user_vocabulary.correct_answers + 1,
      last_reviewed_at = now();
  end if;

  v_next := v_progress.current_exercise_index + 1;
  v_score := v_progress.score + case when v_correct then 1 else 0 end;
  v_finished := v_next >= v_total;
  v_status := case when v_finished then 'completed' else 'in_progress' end;
  v_learned := v_stats.learned_words_count + case when v_new_word then 1 else 0 end;
  v_xp := v_stats.total_xp;
  v_streak := v_stats.current_streak;
  v_longest := v_stats.longest_streak;
  v_last := v_stats.last_activity_date;
  v_xp_awarded := v_progress.xp_awarded;

  if v_finished and not v_progress.xp_awarded then
    v_today := (now() at time zone 'Asia/Bishkek')::date;
    v_xp_gained := v_xp_reward;
    v_xp := v_xp + v_xp_reward;
    v_xp_awarded := true;

    if v_last is distinct from v_today then
      if v_last = v_today - 1 then
        v_streak := v_streak + 1;
      else
        v_streak := 1;
      end if;
    end if;

    v_last := v_today;
    v_longest := greatest(v_longest, v_streak);
  end if;

  update public.user_stats
  set
    total_xp = v_xp,
    learned_words_count = v_learned,
    current_streak = v_streak,
    longest_streak = v_longest,
    last_activity_date = v_last
  where user_id = v_user;

  update public.user_progress
  set
    status = v_status,
    current_exercise_index = v_next,
    completed_exercises = v_next,
    total_exercises = v_total,
    score = v_score,
    xp_awarded = v_xp_awarded,
    completed_at = case
      when v_status = 'completed' then coalesce(v_progress.completed_at, now())
      else v_progress.completed_at
    end
  where id = v_progress.id;

  return jsonb_build_object(
    'isCorrect', v_correct,
    'correctAnswer', v_correct_answer,
    'explanation', v_explanation,
    'nextIndex', v_next,
    'total', v_total,
    'correctCount', v_score,
    'completed', v_finished,
    'xpGained', v_xp_gained,
    'streak', v_streak
  );
end;
$$;

revoke all on function public.normalize_answer(text) from public, anon;
revoke all on function public.submit_answer(uuid, text) from public, anon;
grant execute on function public.submit_answer(uuid, text) to authenticated;

insert into public.vocabulary (
  kyrgyz_word,
  russian_translation,
  example_kyrgyz,
  example_russian
)
select
  v.kyrgyz_word,
  v.russian_translation,
  v.example_kyrgyz,
  v.example_russian
from (
  values
    ('Салам', 'Привет', 'Салам, кандайсың?', 'Привет, как дела?'),
    ('Рахмат', 'Спасибо', 'Рахмат, жакшы.', 'Спасибо, хорошо.'),
    ('Саламатсызбы', 'Здравствуйте', 'Саламатсызбы!', 'Здравствуйте!')
) as v(kyrgyz_word, russian_translation, example_kyrgyz, example_russian)
where not exists (
  select 1
  from public.vocabulary existing
  where existing.kyrgyz_word = v.kyrgyz_word
    and existing.russian_translation = v.russian_translation
);

insert into public.exercises (
  lesson_id,
  type,
  prompt,
  payload,
  accepted_answers,
  explanation,
  order_index,
  vocabulary_id
)
select
  l.id,
  v.type::public.exercise_type,
  v.prompt,
  v.payload::jsonb,
  v.accepted_answers,
  v.explanation,
  v.order_index,
  (
    select voc.id
    from public.vocabulary voc
    where voc.kyrgyz_word = v.kyrgyz_word
    order by voc.created_at
    limit 1
  )
from public.lessons l
join public.courses c on c.id = l.course_id
join (
  values
    (
      1,
      'flashcard',
      'Новое слово',
      '{"kyrgyzWord":"Салам","russianTranslation":"Привет","exampleKyrgyz":"Салам, кандайсың?","exampleRussian":"Привет, как дела?"}',
      array[]::text[],
      null::text,
      'Салам'::text
    ),
    (
      2,
      'flashcard',
      'Новое слово',
      '{"kyrgyzWord":"Рахмат","russianTranslation":"Спасибо","exampleKyrgyz":"Рахмат, жакшы.","exampleRussian":"Спасибо, хорошо."}',
      array[]::text[],
      null::text,
      'Рахмат'::text
    ),
    (
      3,
      'flashcard',
      'Новое слово',
      '{"kyrgyzWord":"Саламатсызбы","russianTranslation":"Здравствуйте","exampleKyrgyz":"Саламатсызбы!","exampleRussian":"Здравствуйте!"}',
      array[]::text[],
      null::text,
      'Саламатсызбы'::text
    ),
    (
      4,
      'multiple_choice',
      'Как переводится «Саламатсызбы»?',
      '{"prompt":"Как переводится «Саламатсызбы»?","options":["Здравствуйте","Спасибо","До свидания","Пожалуйста"]}',
      array['Здравствуйте']::text[],
      '«Саламатсызбы» — вежливое «здравствуйте».',
      null::text
    ),
    (
      5,
      'multiple_choice',
      'Как переводится «Рахмат»?',
      '{"prompt":"Как переводится «Рахмат»?","options":["Спасибо","Привет","Извините","Пожалуйста"]}',
      array['Спасибо']::text[],
      '«Рахмат» значит «спасибо».',
      null::text
    ),
    (
      6,
      'sentence_builder',
      'Соберите предложение',
      '{"translation":"Меня зовут Эрбол","tokens":["Менин","атым","Эрбол"],"distractors":["сен","рахмат"]}',
      array['Менин атым Эрбол']::text[],
      'Менин атым Эрбол — «Меня зовут Эрбол».',
      null::text
    ),
    (
      7,
      'sentence_builder',
      'Соберите предложение',
      '{"translation":"Я в порядке","tokens":["Мен","жакшымын"],"distractors":["сен","салам"]}',
      array['Мен жакшымын']::text[],
      'Мен жакшымын — «Я в порядке».',
      null::text
    )
) as v(order_index, type, prompt, payload, accepted_answers, explanation, kyrgyz_word)
  on c.title = 'Знакомство'
 and l.title = 'Приветствие'
where not exists (
  select 1
  from public.exercises existing
  where existing.lesson_id = l.id
    and existing.order_index = v.order_index
);
