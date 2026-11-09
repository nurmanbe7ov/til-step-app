# TilStep

Веб-платформа для изучения кыргызского языка сотрудниками компании.

## Запуск

Нужен Node.js 20.9 или новее.

```bash
npm install
npm run dev
```

Сайт откроется на http://localhost:3000.

Пока в `.env.local` нет ключей Supabase, кабинет работает на демонстрационных данных.

## Подключение Supabase

1. Создайте проект в Supabase.
2. Скопируйте `.env.example` в `.env.local` и вставьте URL проекта и anon key.
3. В SQL Editor выполните `supabase/migrations/20261109120000_init.sql`.
4. Зарегистрируйтесь на `/login`.
5. Назначьте первого администратора:

```sql
update public.profiles set role = 'admin' where email = 'you@company.com';
```
