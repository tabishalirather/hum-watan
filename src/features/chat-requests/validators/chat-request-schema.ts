import { z } from "zod";

export const sendChatRequestSchema = z.object({
  mentorUserId: z.string().uuid(),
  message: z.string().trim().max(500).optional(),
});
