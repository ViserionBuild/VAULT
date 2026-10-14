import '@testing-library/jest-dom/vitest'

// Node 22+ defines its own global localStorage, which is undefined unless
// Node runs with --localstorage-file, and it shadows jsdom's. Provide a
// simple in-memory Storage so tests (and code under test) can use it.
if (typeof globalThis.localStorage === 'undefined' || globalThis.localStorage === null) {
  const store = new Map()
  const storage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true })
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
})
