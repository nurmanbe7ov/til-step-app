import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata = {
  title: "Новый пароль",
};

export default function UpdatePasswordPage() {
  return <UpdatePasswordForm configured={isSupabaseConfigured()} />;
}
