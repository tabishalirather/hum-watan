"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/validators/auth-schema";
import { resetPassword } from "@/features/auth/actions/reset-password";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null);
    const result = await resetPassword(data);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Button onClick={() => router.push("/login")} className="w-full">
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("token")} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      {serverError && (
        <p className="text-sm text-destructive">
          {serverError}{" "}
          <Link href="/forgot-password" className="underline underline-offset-4">
            Request a new link
          </Link>
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}
