"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { updateMentorProfile } from "@/features/profile/actions/update-mentor-profile";
import {
	mentorProfileSchema,
	type MentorProfileInput,
} from "@/features/profile/validators/mentor-profile-schema";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

type UniversityOption = {
	id: string;
	name: string;
	cityName: string;
	countryName: string;
};

export function MentorProfileForm({
	initialValues,
	universities,
}: {
	initialValues: MentorProfileInput;
	universities: UniversityOption[];
}) {
	const router = useRouter();
	const [serverError, setServerError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<MentorProfileInput>({
		resolver: zodResolver(mentorProfileSchema),
		defaultValues: initialValues,
	});

	const onSubmit = async (values: MentorProfileInput) => {
		setServerError(null);
		setSaved(false);
		const result = await updateMentorProfile(values);
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
				<Label htmlFor="universityId">University</Label>
				<select
					id="universityId"
					{...register("universityId")}
					className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
				>
					<option value="">Select your university</option>
					{universities.map((university) => (
						<option key={university.id} value={university.id}>
							{university.name} - {university.cityName}, {university.countryName}
						</option>
					))}
				</select>
				{errors.universityId && (
					<p className="text-sm text-destructive">{errors.universityId.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="subject">Subject or field of study</Label>
				<Input id="subject" {...register("subject")} />
				{errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
			</div>

			<div className="space-y-2">
				<Label htmlFor="degreeLevel">Degree level</Label>
				<select
					id="degreeLevel"
					{...register("degreeLevel")}
					className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
				>
					<option value="bachelors">Bachelor&apos;s</option>
					<option value="masters">Master&apos;s</option>
					<option value="phd">PhD</option>
					<option value="other">Other</option>
				</select>
				{errors.degreeLevel && (
					<p className="text-sm text-destructive">{errors.degreeLevel.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="scholarshipStatus">Scholarship status (optional)</Label>
				<Input
					id="scholarshipStatus"
					{...register("scholarshipStatus")}
					placeholder="e.g. Erasmus Mundus, Fulbright, self-funded"
				/>
				{errors.scholarshipStatus && (
					<p className="text-sm text-destructive">{errors.scholarshipStatus.message}</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="bio">Short bio (optional)</Label>
				<Textarea id="bio" {...register("bio")} placeholder="Tell the community a little about yourself." />
				{errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
			</div>

			{serverError && <p className="text-sm text-destructive">{serverError}</p>}
			{saved && <p className="text-sm text-muted-foreground">Profile saved.</p>}
			<Button type="submit" disabled={isSubmitting} className="w-full">
				{isSubmitting ? "Saving..." : "Save profile"}
			</Button>
		</form>
	);
}
