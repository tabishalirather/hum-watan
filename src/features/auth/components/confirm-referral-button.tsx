"use client";

import { useState } from "react";
import { confirmReferral } from "@/features/auth/actions/confirm-referral";
import { Button } from "@/shared/components/ui/button";

export function ConfirmReferralButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onConfirm = async () => {
    setState("pending");
    const result = await confirmReferral(token);
    if (result.error) {
      setMessage(result.error);
      setState("error");
      return;
    }
    setState("done");
  };

  if (state === "done") {
    return <p className="text-sm text-muted-foreground">Nomination confirmed. Thank you!</p>;
  }

  return (
    <div className="space-y-2">
      <Button onClick={onConfirm} disabled={state === "pending"} className="w-full">
        {state === "pending" ? "Confirming..." : "Confirm nomination"}
      </Button>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </div>
  );
}
