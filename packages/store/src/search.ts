/**
 * Store para busca global
 */

import { create } from 'zustand'

export interface SearchResult {
  id: string
  type: 'task' | 'habit' | 'project' | 'event'
  title: string
  description?: string
  url: string
  metadata?: Record<string, any>
}

interface SearchState {
  query: string
  results: SearchResult[]
  isSearching: boolean
  recentSearches: string[]

  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setIsSearching: (isSearching: boolean) => void
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  clearResults: () => void
}

const MAX_RECENT_SEARCHES = 10

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  isSearching: false,
  recentSearches: [],

  setQuery: (query) => set({ query }),

  setResults: (results) => set({ results, isSearching: false }),

  setIsSearching: (isSearching) => set({ isSearching }),

  addRecentSearch: (query) => {
    if (!query.trim()) return

    const recent = get().recentSearches.filter((q) => q !== query)
    recent.unshift(query)

    set({
      recentSearches: recent.slice(0, MAX_RECENT_SEARCHES),
    })
  },

  clearRecentSearches: () => set({ recentSearches: [] }),

  clearResults: () => set({ results: [], query: '' }),
}))
