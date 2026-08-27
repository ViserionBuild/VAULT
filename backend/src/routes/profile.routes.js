const express = require('express')
const { z } = require('zod')
const { updateProfileSchema } = require('../validators/profile')
const { responseEnvelope } = require('../utils/response')
const { invalidateCachedUser } = require('../middleware/auth')

function createProfileRouter({ store, authMiddleware, protectedLimiter }) {
  const router = express.Router()

  const buildResponse = (user, profile) => ({
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    profile: profile ?? {},
  })

  router.get('/', protectedLimiter, authMiddleware, async (req, res) => {
    try {
      const profile = await store.getUserProfile(req.user.id)
      return res.json(responseEnvelope(buildResponse(req.user, profile)))
    } catch {
      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Unable to load profile' }),
      )
    }
  })

  router.put('/', protectedLimiter, authMiddleware, async (req, res) => {
    try {
      const payload = updateProfileSchema.parse(req.body)
      const { name, ...profileFields } = payload

      // Name lives on users; everything else on user_profiles.
      let user = req.user
      if (name !== undefined) {
        user = await store.updateUserName(req.user.id, name)
        // The auth middleware caches users; drop the stale copy.
        invalidateCachedUser(req.user.id)
      }

      const hasProfileEdits = Object.keys(profileFields).length > 0
      const profile = hasProfileEdits
        ? await store.upsertUserProfile(req.user.id, profileFields)
        : await store.getUserProfile(req.user.id)

      return res.json(responseEnvelope(buildResponse(user, profile)))
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(
          responseEnvelope(null, {
            code: 'VALIDATION_ERROR',
            message: 'Invalid profile payload',
            details: error.issues,
          }),
        )
      }

      return res.status(500).json(
        responseEnvelope(null, { code: 'INTERNAL_ERROR', message: 'Unable to save profile' }),
      )
    }
  })

  return router
}

module.exports = { createProfileRouter }
