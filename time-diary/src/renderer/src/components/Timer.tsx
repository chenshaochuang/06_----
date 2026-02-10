import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { TimeEntry } from '../types'
import { Minimize2 } from 'lucide-react'

interface TimerProps {
  onStart: (title: string) => void
  onStop: (mood: TimeEntry['mood'], newTitle?: string) => void
  activeEntry: TimeEntry | null
  suggestions?: string[]
}

export function Timer({ onStart, onStop, activeEntry, suggestions = [] }: TimerProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [showMoodSelection, setShowMoodSelection] = useState(false)
  const [pendingTitle, setPendingTitle] = useState('')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    if (activeEntry && !showMoodSelection) {
      const startTime = activeEntry.startTime
      
      const tick = () => {
        const now = Date.now()
        const currentElapsed = now - startTime
        setElapsed(currentElapsed)
        
        const timeToNextSecond = 1000 - (currentElapsed % 1000)
        timeoutId = setTimeout(tick, timeToNextSecond)
      }

      tick()
    } else {
      setElapsed(0)
    }
    
    return () => clearTimeout(timeoutId)
  }, [activeEntry, showMoodSelection])

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    onStart(title)
    setTitle('')
  }

  const handleStopClick = () => {
    if (activeEntry && !activeEntry.title) {
      setPendingTitle('')
    }
    setShowMoodSelection(true)
  }

  const handleMoodSelect = (mood: TimeEntry['mood']) => {
    if (activeEntry && !activeEntry.title && !pendingTitle.trim()) {
      return
    }
    const finalTitle = (activeEntry && !activeEntry.title) ? pendingTitle : undefined
    onStop(mood, finalTitle)
    setShowMoodSelection(false)
  }

  if (showMoodSelection) {
    const needsTitle = activeEntry && !activeEntry.title
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-card rounded-xl border border-border shadow-sm">
        <h3 className="text-xl font-semibold text-foreground">
          {needsTitle ? t('diary.content_placeholder') : "How was your focus?"}
        </h3>
        
        {needsTitle && (
          <div className="w-full relative">
            <input
              type="text"
              list="stop-suggestions"
              value={pendingTitle}
              onChange={(e) => setPendingTitle(e.target.value)}
              placeholder={t('diary.content_placeholder')}
              className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all"
              autoFocus
            />
            <datalist id="stop-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        )}

        <div className="flex gap-4">
          <Button disabled={needsTitle && !pendingTitle.trim()} onClick={() => handleMoodSelect('focus')} variant="outline" className="text-4xl h-24 w-24 p-0 hover:bg-green-500/10 hover:border-green-500 hover:text-green-600 transition-all scale-100 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Good Focus">🔥</Button>
          <Button disabled={needsTitle && !pendingTitle.trim()} onClick={() => handleMoodSelect('neutral')} variant="outline" className="text-4xl h-24 w-24 p-0 hover:bg-yellow-500/10 hover:border-yellow-500 hover:text-yellow-600 transition-all scale-100 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Neutral Focus">😐</Button>
          <Button disabled={needsTitle && !pendingTitle.trim()} onClick={() => handleMoodSelect('tired')} variant="outline" className="text-4xl h-24 w-24 p-0 hover:bg-red-500/10 hover:border-red-500 hover:text-red-600 transition-all scale-100 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Tired Focus">😫</Button>
        </div>
      </div>
    )
  }

  if (activeEntry) {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-card rounded-xl border border-border shadow-sm animate-in fade-in border-l-4 border-l-primary relative">
        <div className="absolute top-4 right-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.api.switchToFloating()}
            className="text-muted-foreground hover:text-primary rounded-full"
            title="Switch to floating window"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">Focusing on</div>
        <h2 className="text-3xl font-bold text-primary text-center break-words w-full">
            {activeEntry.title || <span className="text-muted-foreground italic">No task name</span>}
        </h2>
        <div className="text-7xl font-mono font-light tracking-tighter tabular-nums text-foreground my-4">
          {formatTime(elapsed)}
        </div>
        <Button onClick={handleStopClick} variant="destructive" size="lg" className="w-full h-14 text-lg font-medium shadow-lg hover:shadow-xl transition-all">
          {t('timer.stop')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <label className="text-sm font-medium leading-none text-foreground">
        {t('diary.content_placeholder')}
      </label>
      <div className="relative">
        <input
          type="text"
          list="task-suggestions"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          placeholder={t('diary.content_placeholder')}
          className="flex h-14 w-full rounded-lg border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent transition-all"
          autoFocus
        />
        <datalist id="task-suggestions">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <Button onClick={handleStart} size="lg" className="w-full h-12 text-base font-medium">
        {t('timer.start')}
      </Button>
    </div>
  )
}
