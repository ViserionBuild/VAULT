const { createTagSchema, updateTagSchema } = require('../src/validators/tags')

describe('tag validators', () => {
  it('trims names and rejects blank ones', () => {
    expect(createTagSchema.parse({ name: '  Read later ' }).name).toBe('Read later')
    const blank = createTagSchema.safeParse({ name: '   ' })
    expect(blank.success).toBe(false)
    expect(blank.error.issues[0].message).toBe('Tag name is required')
  })

  it('allows partial updates', () => {
    expect(updateTagSchema.parse({ color: '#ef4444' })).toEqual({ color: '#ef4444' })
  })
})
