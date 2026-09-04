import "server-only"
import { z } from "zod"

const environmentSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must contain at least 16 characters"),
})
export type Environment = z.infer<typeof environmentSchema>
export function validateEnv(): Environment {
  const parsed = environmentSchema.safeParse({ DATABASE_URL: process.env.DATABASE_URL, DIRECT_URL: process.env.DIRECT_URL, AUTH_SECRET: process.env.AUTH_SECRET })
  if (!parsed.success) throw new Error(`Invalid server environment: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`)
  return parsed.data
}
