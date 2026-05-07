const crypto = require('node:crypto')

class InMemoryStore {
  constructor() {
    this.users = new Map()
    this.usersByEmail = new Map()
    this.refreshTokens = new Map()
    this.userSeq = 1
  }

  async createUser({ name, email, passwordHash }) {
    const normalizedEmail = email.trim().toLowerCase()
    if (this.usersByEmail.has(normalizedEmail)) {
      return null
    }

    const user = {
      id: String(this.userSeq++),
      name,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
    }

    this.users.set(user.id, user)
    this.usersByEmail.set(normalizedEmail, user.id)
    return user
  }

  async findUserByEmail(email) {
    const userId = this.usersByEmail.get(email.trim().toLowerCase())
    return userId ? this.users.get(userId) : null
  }

  async findUserById(id) {
    return this.users.get(String(id)) ?? null
  }

  async storeRefreshToken({ userId, token }) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    this.refreshTokens.set(tokenHash, {
      tokenHash,
      userId: String(userId),
      revokedAt: null,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  }

  async rotateRefreshToken({ oldToken, newToken, userId }) {
    await this.revokeRefreshToken(oldToken)
    await this.storeRefreshToken({ userId, token: newToken })
  }

  async findValidRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const existing = this.refreshTokens.get(tokenHash)

    if (!existing || existing.revokedAt || existing.expiresAt <= Date.now()) {
      return null
    }

    return existing
  }

  async revokeRefreshToken(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const existing = this.refreshTokens.get(tokenHash)
    if (existing && !existing.revokedAt) {
      existing.revokedAt = new Date().toISOString()
      this.refreshTokens.set(tokenHash, existing)
    }
  }
}

module.exports = {
  InMemoryStore,
}
