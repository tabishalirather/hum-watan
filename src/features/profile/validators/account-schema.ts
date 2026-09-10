import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
});

export type AccountInput = z.infer<typeof accountSchema>;
