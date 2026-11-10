export function firstName(fullName: string): string {
  const name = fullName.trim().split(/\s+/)[0];
  return name || "коллега";
}

function russianPlural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;

  if (abs > 10 && abs < 20) {
    return many;
  }

  if (last === 1) {
    return one;
  }

  if (last >= 2 && last <= 4) {
    return few;
  }

  return many;
}

export function pluralDays(count: number): string {
  return russianPlural(count, "день", "дня", "дней");
}

export function pluralTasks(count: number): string {
  return russianPlural(count, "задание", "задания", "заданий");
}

export function pluralLessons(count: number): string {
  return russianPlural(count, "урок", "урока", "уроков");
}

export function pluralWords(count: number): string {
  return russianPlural(count, "слово", "слова", "слов");
}

export function xpGoalFor(xp: number): number {
  if (xp <= 0) {
    return 100;
  }

  return Math.ceil(xp / 100) * 100;
}
