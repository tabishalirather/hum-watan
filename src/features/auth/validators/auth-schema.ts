import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const menteeRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

export const mentorRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  refereeEmail: z.string().email("Referee must have a valid email address"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type MenteeRegisterInput = z.infer<typeof menteeRegisterSchema>;
export type MentorRegisterInput = z.infer<typeof mentorRegisterSchema>;
