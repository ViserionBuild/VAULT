const { createItemSchema, updateItemSchema } = require('../src/validators/items')

describe('item validators', () => {
  it('adds https:// to a URL typed without a scheme', () => {
    const item = createItemSchema.parse({ type: 'url', url: 'github.com', workspaceId: 'w' })
    expect(item.url).toBe('https://github.com')
    expect(updateItemSchema.parse({ url: 'example.org/a' }).url).toBe('https://example.org/a')
  })

  it('keeps an explicit scheme', () => {
    expect(createItemSchema.parse({ type: 'url', url: 'http://a.dev', workspaceId: 'w' }).url).toBe('http://a.dev')
  })

  it('lets links omit the title so the page title can fill it in', () => {
    const item = createItemSchema.parse({ type: 'url', url: 'https://a.dev', workspaceId: 'w' })
    expect(item.title).toBeUndefined()
  })

  it('still requires a folder name', () => {
    expect(createItemSchema.safeParse({ type: 'folder', workspaceId: 'w' }).success).toBe(false)
    expect(createItemSchema.safeParse({ type: 'folder', title: '   ', workspaceId: 'w' }).success).toBe(false)
  })

  it('rejects text that is not a URL', () => {
    expect(createItemSchema.safeParse({ type: 'url', url: 'not a url', workspaceId: 'w' }).success).toBe(false)
  })
})
