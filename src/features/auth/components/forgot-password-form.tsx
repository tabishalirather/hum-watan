"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  requestPasswordResetSchema,
  type RequestPasswordResetInput,
} from "@/features/auth/validators/auth-schema";
import { requestPasswordReset } from "@/features/auth/actions/request-password-reset";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestPasswordResetInput>({ resolver: zodResolver(requestPasswordResetSchema) });

  const onSubmit = async (data: RequestPasswordResetInput) => {
    setMessage(null);
    const result = await requestPasswordReset(data);
    setMessage(
      "message" in result
        ? result.message
        : "If an account exists for that email, we've sent a link to reset the password.",
    );
  };

  if (message) {
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
