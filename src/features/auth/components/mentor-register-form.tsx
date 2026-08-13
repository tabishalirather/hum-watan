"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  mentorRegisterSchema,
  type MentorRegisterInput,
} from "@/features/auth/validators/auth-schema";
import { registerMentor } from "@/features/auth/actions/register-mentor";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function MentorRegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MentorRegisterInput>({ resolver: zodResolver(mentorRegisterSchema) });

  const onSubmit = async (data: MentorRegisterInput) => {
    setServerError(null);
    const result = await registerMentor(data);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <p className="text-sm text-muted-foreground">
        Account created. Your referee has been emailed to confirm the nomination — you can sign
        in once they&apos;ve confirmed.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="refereeEmail">Referee&apos;s email (must already be a mentor)</Label>
        <Input id="refereeEmail" type="email" {...register("refereeEmail")} />
        {errors.refereeEmail && (
          <p className="text-sm text-destructive">{errors.refereeEmail.message}</p>
        )}
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Submitting..." : "Sign up as a mentor"}
      </Button>
    </form>
  );
}
