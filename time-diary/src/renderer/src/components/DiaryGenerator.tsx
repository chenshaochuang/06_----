import { useState } from 'react'
// import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { TimeEntry } from '../types'
import { Sparkles } from 'lucide-react'

interface DiaryGeneratorProps {
  entries: TimeEntry[]
  date: Date
}

export function DiaryGenerator({ entries, date }: DiaryGeneratorProps) {
  // const { t } = useTranslation()
  const [diary, setDiary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generatePrompt = (entries: TimeEntry[]) => {
    const dateStr = date.toLocaleDateString()
    const logs = entries.map(e => {
      const duration = e.endTime ? Math.round((e.endTime - e.startTime) / 1000 / 60) : 'ongoing'
      const mood = e.mood ? `(Mood: ${e.mood})` : ''
      return `- ${e.title}: ${duration} mins ${mood}`
    }).join('\n')

    return `Here are my activities for ${dateStr}:\n${logs}\n\nPlease write a short, reflective diary entry about my day based on these logs. Highlight my productivity and energy levels. Keep it encouraging but realistic.`
  }

  const handleGenerate = async () => {
    if (entries.length === 0) {
      setError('No entries to generate diary from.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const prompt = generatePrompt(entries)
      const result = await window.api.generateDiary(prompt)
      setDiary(result)
    } catch (err: any) {
      console.error(err)
      if (err.message.includes('API Key is missing')) {
        setError('Please configure your AI API Key in settings first.')
      } else {
        setError('Failed to generate diary. Please check your network or API key.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-card rounded-xl border border-border shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Smart Diary
        </h3>
        <Button 
          onClick={handleGenerate} 
          disabled={loading || entries.length === 0}
          variant="secondary"
          className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent hover:border-primary/20 transition-all touch-target"
        >
          {loading ? 'Generating...' : 'Generate Reflection'}
        </Button>
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 animate-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {diary && (
        <div className="mt-2 p-6 bg-muted/30 rounded-lg border border-border font-serif text-foreground/90 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2 shadow-inner">
          {diary}
        </div>
      )}
      
      {!diary && !loading && !error && (
        <div className="text-center py-8 text-muted-foreground text-sm italic">
          Turn your time logs into a story.
        </div>
      )}
    </div>
  )
}
