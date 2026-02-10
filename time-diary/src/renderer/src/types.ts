export interface TimeEntry {
  id: string
  title: string
  startTime: number
  endTime?: number
  mood?: 'focus' | 'neutral' | 'tired'
  description?: string
}

export interface AIConfig {
  apiKey: string
  baseURL: string
  model: string
}
