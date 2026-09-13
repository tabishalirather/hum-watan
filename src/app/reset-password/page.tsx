import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-sm text-destructive">Missing or invalid reset link.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
