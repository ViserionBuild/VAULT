import { create } from 'zustand'

const initialFolders = [
  { id: 'folder-root', name: 'Projects', parentId: null, isFavorite: false, deletedAt: null },
  { id: 'folder-learn', name: 'Learning', parentId: null, isFavorite: false, deletedAt: null },
]

const initialBlocks = [
  {
    id: 'block-1',
    title: 'VAULT Roadmap',
    type: 'note',
    content: 'Plan folder hierarchy, polish UX, and wire Supabase auth.',
    url: '',
    isFavorite: false,
    deletedAt: null,
  },
  {
    id: 'block-2',
    title: 'Supabase Docs',
    type: 'url',
    url: 'https://supabase.com/docs',
    content: 'Auth + Postgres reference',
    isFavorite: true,
    deletedAt: null,
  },
]

export const useWorkspaceStore = create((set, get) => ({
  folders: initialFolders,
  blocks: initialBlocks,
  query: '',
  favorites: ['Supabase Docs'],
  setQuery: (query) => set({ query }),
  createFolder: (name) =>
    set((state) => ({
      folders: [...state.folders, { id: crypto.randomUUID(), name, parentId: null, isFavorite: false, deletedAt: null }],
    })),
  createBlock: ({ title, type }) =>
    set((state) => ({
      blocks: [
        ...state.blocks,
        {
          id: crypto.randomUUID(),
          title,
          type,
          url: '',
          content: '',
          isFavorite: false,
          deletedAt: null,
        },
      ],
    })),
  reorderBlocks: (orderedIds) =>
    set((state) => ({
      blocks: [...state.blocks].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)),
    })),
  toggleFavoriteBlock: (id) =>
    set((state) => {
      const blocks = state.blocks.map((block) =>
        block.id === id ? { ...block, isFavorite: !block.isFavorite } : block,
      )
      const favorites = blocks.filter((block) => block.isFavorite).map((block) => block.title)
      return { blocks, favorites }
    }),
  moveToTrash: (id) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === id ? { ...block, deletedAt: new Date().toISOString() } : block,
      ),
    })),
  restoreFromTrash: (id) =>
    set((state) => ({
      blocks: state.blocks.map((block) => (block.id === id ? { ...block, deletedAt: null } : block)),
    })),
  search: () => {
    const { blocks, folders, query } = get()
    const q = query.toLowerCase()
    return {
      blocks: blocks.filter((b) => [b.title, b.type, b.content, b.url].join(' ').toLowerCase().includes(q)),
      folders: folders.filter((f) => f.name.toLowerCase().includes(q)),
    }
  },
}))
