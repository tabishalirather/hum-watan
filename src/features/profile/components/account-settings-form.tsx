"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { updateAccount } from "@/features/profile/actions/update-account";
import { accountSchema, type AccountInput } from "@/features/profile/validators/account-schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

export function AccountSettingsForm({
	username,
	initialValues,
}: {
	username: string | null;
	initialValues: AccountInput;
}) {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<AccountInput>({
		resolver: zodResolver(accountSchema),
		defaultValues: initialValues,
	});

	const onSubmit = async (values: AccountInput) => {
		setServerError(null);
		setSaved(false);
		const result = await updateAccount(values);
		if (result.error) {
			setServerError(result.error);
			return;
		}
		setSaved(true);
		router.refresh();
	};

	return (
		<section className="mb-6 rounded-xl border border-border/80 bg-card px-4 py-5">
			<h2 className="mb-1 font-semibold">Account</h2>
			<p className="mb-4 text-sm text-muted-foreground">
				Your login details. Changing your email changes what you sign in with.
			</p>
			{username && (
				<div className="mb-4 space-y-1.5">
					<Label>Username</Label>
					<p className="rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-sm text-muted-foreground">
						{username}
					</p>
				</div>
			)}
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<div className="space-y-1.5">
					<Label htmlFor="name">Name</Label>
					<Input id="name" {...register("name")} />
					{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="email">Email</Label>
					<Input id="email" type="email" {...register("email")} />
					{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
				</div>
				{serverError && <p className="text-sm text-destructive">{serverError}</p>}
				{saved && <p className="text-sm text-muted-foreground">Account saved.</p>}
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Save account"}
				</Button>
			</form>
		</section>
	);
}
