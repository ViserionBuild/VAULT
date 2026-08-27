const { z } = require('zod')

// Emails are stored lowercase; normalizing here keeps the signup pre-check,
// the login lookup, and the unique index all comparing the same value.
const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email())

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: normalizedEmail,
  password: z.string().min(8).max(128),
})

const loginSchema = z.object({
  email: normalizedEmail,
  password: z.string().min(8).max(128),
})

module.exports = {
  signupSchema,
  loginSchema,
}
