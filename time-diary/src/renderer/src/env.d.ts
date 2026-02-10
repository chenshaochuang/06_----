/// <reference types="vite/client" />

interface TimeEntry {
  id: string
  title: string
  startTime: number
  endTime?: number
  mood?: 'focus' | 'neutral' | 'tired'
  description?: string
}

interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
}

interface Window {
  electron: import('@electron-toolkit/preload').ElectronAPI
  api: {
    getEntries: () => Promise<TimeEntry[]>
    addEntry: (entry: TimeEntry) => Promise<boolean>
    updateEntry: (entry: TimeEntry) => Promise<boolean>
    deleteEntry: (id: string) => Promise<boolean>
    getAIConfig: () => Promise<AIConfig>
    saveAIConfig: (config: AIConfig) => Promise<boolean>
    generateDiary: (prompt: string) => Promise<string>
    switchToFloating: () => void
    switchToMain: () => void
    onEntriesUpdated: (callback: () => void) => () => void
  }
}
