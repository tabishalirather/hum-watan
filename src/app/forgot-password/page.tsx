import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the email on your account and we&apos;ll send you a link to reset your password.
          </p>
          <ForgotPasswordForm />
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
