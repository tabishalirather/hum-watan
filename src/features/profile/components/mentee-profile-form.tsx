"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { updateMenteeProfile } from "@/features/profile/actions/update-mentee-profile";
import {
	menteeProfileSchema,
	type MenteeProfileInput,
} from "@/features/profile/validators/mentee-profile-schema";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

export function MenteeProfileForm({ initialValues }: { initialValues: MenteeProfileInput }) {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<MenteeProfileInput>({
		resolver: zodResolver(menteeProfileSchema),
		defaultValues: initialValues,
	});

	const onSubmit = async (values: MenteeProfileInput) => {
		setServerError(null);
		setSaved(false);
		const result = await updateMenteeProfile(values);
		if (result.error) {
			setServerError(result.error);
			return;
		}
		setSaved(true);
		router.refresh();
	};

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
			<div className="space-y-2">
				<Label htmlFor="targetPrograms">Programs you&apos;re planning to apply for</Label>
				<Textarea
					id="targetPrograms"
					{...register("targetPrograms")}
					placeholder="e.g. MS Computer Science at TU Munich, ETH Zurich, DAAD-funded programs in Germany"
				/>
				{errors.targetPrograms && (
					<p className="text-sm text-destructive">{errors.targetPrograms.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="background">What you&apos;ve done so far</Label>
				<Textarea
					id="background"
					{...register("background")}
					placeholder="e.g. BSc in Computer Science from University of Kashmir, one research internship, IELTS 7.5"
				/>
				{errors.background && (
					<p className="text-sm text-destructive">{errors.background.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="helpNeeded">What specific help you&apos;re looking for</Label>
				<Textarea
					id="helpNeeded"
					{...register("helpNeeded")}
					placeholder="e.g. advice on SOP, GRE waiver options, scholarship deadlines, what a specific program is actually like"
				/>
				{errors.helpNeeded && (
					<p className="text-sm text-destructive">{errors.helpNeeded.message}</p>
				)}
			</div>

			{serverError && <p className="text-sm text-destructive">{serverError}</p>}
			{saved && <p className="text-sm text-muted-foreground">Profile saved.</p>}
			<Button type="submit" disabled={isSubmitting} className="w-full">
				{isSubmitting ? "Saving..." : "Save profile"}
			</Button>
		</form>
	);
}
