import { z } from "zod";

export const sendMessageSchema = z.object({
  chatRequestId: z.string().uuid(),
  body: z.string().trim().min(1, "Message can't be empty.").max(2000, "Keep messages under 2000 characters."),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
