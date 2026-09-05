import { z } from "zod";

export const menteeProfileSchema = z.object({
  targetPrograms: z
    .string()
    .trim()
    .min(2, "Tell us which programs or universities you're aiming for.")
    .max(500, "Keep this under 500 characters."),
  background: z
    .string()
    .trim()
    .min(2, "Tell us a bit about what you've done so far.")
    .max(500, "Keep this under 500 characters."),
  helpNeeded: z
    .string()
    .trim()
    .min(2, "Tell us what specific help you're looking for.")
    .max(500, "Keep this under 500 characters."),
});

export type MenteeProfileInput = z.infer<typeof menteeProfileSchema>;
