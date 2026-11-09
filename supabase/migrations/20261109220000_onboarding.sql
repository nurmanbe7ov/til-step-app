-- Один раз в SQL Editor.
-- Добавляет отметку, что сотрудник уже закрыл вводный экран.
-- Старые миграции повторно не запускать.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;
