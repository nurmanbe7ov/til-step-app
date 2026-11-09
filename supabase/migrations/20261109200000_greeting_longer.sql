-- Продолжение урока «Приветствие»: было 7 заданий, станет 17.
-- Черновик: фразы нужно сверить с носителем.
-- Вставить в SQL Editor целиком. Init-миграцию и файл плеера повторно не запускать.
-- Уже пройденный урок откроется с новых заданий. Опыт второй раз не начисляется.

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
    ('Кандайсың', 'Как дела', 'Кандайсың?', 'Как дела?'),
    ('Жакшы', 'Хорошо', 'Жакшы, рахмат.', 'Хорошо, спасибо.'),
    ('Кош бол', 'До свидания', 'Кош бол!', 'До свидания!'),
    ('Кечиресиз', 'Извините', 'Кечиресиз.', 'Извините.')
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
      8,
      'flashcard',
      'Новое слово',
      '{"kyrgyzWord":"Кандайсың","russianTranslation":"Как дела","exampleKyrgyz":"Кандайсың?","exampleRussian":"Как дела?"}',
      array[]::text[],
      null::text,
      'Кандайсың'::text
    ),
    (
      9,
      'flashcard',
      'Новое слово',
      '{"kyrgyzWord":"Жакшы","russianTranslation":"Хорошо","exampleKyrgyz":"Жакшы, рахмат.","exampleRussian":"Хорошо, спасибо."}',
      array[]::text[],
      null::text,
      'Жакшы'::text
    ),
    (
      10,
      'flashcard',
      'Новое слово',
      '{"kyrgyzWord":"Кош бол","russianTranslation":"До свидания","exampleKyrgyz":"Кош бол!","exampleRussian":"До свидания!"}',
      array[]::text[],
      null::text,
      'Кош бол'::text
    ),
    (
      11,
      'flashcard',
      'Новое слово',
      '{"kyrgyzWord":"Кечиресиз","russianTranslation":"Извините","exampleKyrgyz":"Кечиресиз.","exampleRussian":"Извините."}',
      array[]::text[],
      null::text,
      'Кечиресиз'::text
    ),
    (
      12,
      'multiple_choice',
      'Как переводится «Кандайсың»?',
      '{"prompt":"Как переводится «Кандайсың»?","options":["Как дела","Спасибо","Здравствуйте","Хорошо"]}',
      array['Как дела']::text[],
      '«Кандайсың» — неформальное «как дела».',
      null::text
    ),
    (
      13,
      'multiple_choice',
      'Как переводится «Жакшы»?',
      '{"prompt":"Как переводится «Жакшы»?","options":["Хорошо","Привет","До свидания","Извините"]}',
      array['Хорошо']::text[],
      '«Жакшы» значит «хорошо».',
      null::text
    ),
    (
      14,
      'multiple_choice',
      'Как переводится «Кош бол»?',
      '{"prompt":"Как переводится «Кош бол»?","options":["До свидания","Спасибо","Привет","Пожалуйста"]}',
      array['До свидания']::text[],
      '«Кош бол» — неформальное «до свидания».',
      null::text
    ),
    (
      15,
      'multiple_choice',
      'Как переводится «Кечиресиз»?',
      '{"prompt":"Как переводится «Кечиресиз»?","options":["Извините","Хорошо","Здравствуйте","Спасибо"]}',
      array['Извините']::text[],
      '«Кечиресиз» значит «извините».',
      null::text
    ),
    (
      16,
      'sentence_builder',
      'Соберите предложение',
      '{"translation":"Как дела?","tokens":["Сен","кандайсың"],"distractors":["рахмат","кош"]}',
      array['Сен кандайсың']::text[],
      'Сен кандайсың — «Как дела?».',
      null::text
    ),
    (
      17,
      'sentence_builder',
      'Соберите предложение',
      '{"translation":"Хорошо, спасибо","tokens":["Жакшы","рахмат"],"distractors":["салам","сен"]}',
      array['Жакшы рахмат']::text[],
      'Жакшы, рахмат — «Хорошо, спасибо».',
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

update public.user_progress as progress
set
  status = 'in_progress',
  current_exercise_index = 7,
  completed_at = null,
  total_exercises = (
    select count(*)::integer
    from public.exercises
    where exercises.lesson_id = progress.lesson_id
  )
where progress.lesson_id = (
  select lessons.id
  from public.lessons
  join public.courses on courses.id = lessons.course_id
  where courses.title = 'Знакомство'
    and lessons.title = 'Приветствие'
)
and progress.status = 'completed'
and progress.current_exercise_index <= 7;
