import { ConfirmReferralButton } from "@/features/auth/components/confirm-referral-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

export default async function ConfirmReferralPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Confirm mentor nomination</CardTitle>
        </CardHeader>
        <CardContent>
          {token ? (
            <ConfirmReferralButton token={token} />
          ) : (
            <p className="text-sm text-destructive">Missing confirmation token.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
