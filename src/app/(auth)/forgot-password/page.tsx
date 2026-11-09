import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = {
  title: "Восстановление пароля",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm configured={isSupabaseConfigured()} />;
}
