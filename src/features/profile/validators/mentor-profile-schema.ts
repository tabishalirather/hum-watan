import { z } from "zod";

export const mentorProfileSchema = z.object({
  subject: z.string().trim().min(2, "Enter your subject or field of study."),
  degreeLevel: z.enum(["bachelors", "masters", "phd", "other"]),
  universityId: z.string().uuid("Select your university."),
  bio: z.string().trim().max(500, "Keep your bio under 500 characters.").optional(),
  scholarshipStatus: z
    .string()
    .trim()
    .max(120, "Keep this under 120 characters.")
    .optional(),
});

export type MentorProfileInput = z.infer<typeof mentorProfileSchema>;
