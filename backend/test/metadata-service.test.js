const { assertPublicUrl, isBlockedAddress } = require('../src/services/metadata-service')

describe('metadata fetcher address guard', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.5.5', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:127.0.0.1',
  ])('blocks %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true)
  })

  it.each(['93.184.215.14', '8.8.8.8', '2606:4700::1111'])('allows public %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false)
  })

  it('rejects private and non-http URLs', async () => {
    await expect(assertPublicUrl('http://127.0.0.1:4000/api')).rejects.toThrow()
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow()
    await expect(assertPublicUrl('http://[::1]/')).rejects.toThrow()
    await expect(assertPublicUrl('http://localhost/')).rejects.toThrow()
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow()
  })
})
