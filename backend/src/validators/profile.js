const { z } = require('zod')

// Every field is optional: the profile page saves partial updates, and a
// missing key means "leave unchanged" rather than "clear".
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  displayName: optionalText(100),
  bio: optionalText(500),
  phone: optionalText(32),
  // Uploaded avatars are stored inline as data URIs, so the cap has to fit a
  // compressed image rather than a URL. The client downscales to ~256px before
  // encoding, which lands well under this.
  avatarUrl: z
    .string()
    .trim()
    .max(400_000)
    .refine(
      (value) =>
        value === '' ||
        /^https:\/\//i.test(value) ||
        /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value),
      { message: 'Avatar must be an https URL or a base64 image data URI' },
    )
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  postalCode: optionalText(20),
  country: optionalText(100),
  timezone: optionalText(64),
})

module.exports = { updateProfileSchema }
