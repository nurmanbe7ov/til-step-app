import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Введите корректный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .max(72, "Слишком длинный пароль"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Введите имя")
      .max(80, "Слишком длинное имя"),
    email: z.email("Введите корректный email"),
    password: z
      .string()
      .min(8, "Минимум 8 символов")
      .max(72, "Слишком длинный пароль"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли не совпадают",
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Введите корректный email"),
});

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Минимум 8 символов")
      .max(72, "Слишком длинный пароль"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли не совпадают",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
