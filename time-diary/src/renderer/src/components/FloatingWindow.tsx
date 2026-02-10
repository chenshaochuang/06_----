import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TimeEntry } from '../types'
import { Maximize2, Play, Square, ArrowLeft } from 'lucide-react'
import { Button } from './ui/button'

export function FloatingWindow() {
  const { t } = useTranslation()
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [isStopping, setIsStopping] = useState(false)
  const [pendingTitle, setPendingTitle] = useState('')

  const loadActiveEntry = async () => {
    try {
      const entries = await window.api.getEntries()
      const running = entries.find(e => !e.endTime)
      setActiveEntry(running || null)
      if (!running) {
        setIsStopping(false)
        setPendingTitle('')
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadActiveEntry()
    const cleanup = window.api.onEntriesUpdated(loadActiveEntry)
    return cleanup
  }, [])

  useEffect(() => {
    if (!activeEntry) {
      setElapsed(0)
      return
    }

    const tick = () => {
      setElapsed(Date.now() - activeEntry.startTime)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeEntry])

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      title: inputValue.trim(),
      startTime: Date.now()
    }
    await window.api.addEntry(newEntry)
    setInputValue('')
    loadActiveEntry()
  }

  const handleStopClick = () => {
    if (!activeEntry) return
    if (!activeEntry.title) {
      setPendingTitle('')
    }
    setIsStopping(true)
  }

  const handleFinalStop = async (mood: TimeEntry['mood']) => {
    if (!activeEntry) return
    
    // If we needed a title but didn't get one
    if (!activeEntry.title && !pendingTitle.trim()) {
      return
    }

    const updatedEntry: TimeEntry = {
      ...activeEntry,
      endTime: Date.now(),
      mood,
      title: (!activeEntry.title && pendingTitle) ? pendingTitle : activeEntry.title
    }
    
    await window.api.updateEntry(updatedEntry)
    setIsStopping(false)
    setPendingTitle('')
    loadActiveEntry()
  }

  return (
    <div 
      className="h-screen w-screen flex flex-col items-center justify-center bg-background/95 border-2 border-primary/20 select-none overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="absolute top-1 right-1 flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
         <Button 
           variant="ghost" 
           size="icon" 
           className="h-6 w-6 hover:bg-primary/10 rounded-full"
           onClick={() => window.api.switchToMain()}
           title="Expand to main window"
         >
           <Maximize2 className="h-3 w-3" />
         </Button>
      </div>

      <div className="flex flex-col items-center gap-0.5 w-full px-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {activeEntry ? (
          isStopping ? (
            <div className="flex flex-col items-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
              {!activeEntry.title && (
                <input
                  type="text"
                  value={pendingTitle}
                  onChange={(e) => setPendingTitle(e.target.value)}
                  placeholder={t('diary.content_placeholder')}
                  className="w-full h-6 text-xs bg-transparent border-b border-primary/20 focus:border-primary outline-none text-center mb-1"
                  autoFocus
                />
              )}
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => handleFinalStop('focus')} 
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 text-lg hover:scale-110 transition-transform hover:bg-green-500/10 hover:border-green-500" 
                  disabled={!activeEntry.title && !pendingTitle.trim()}
                >
                  🔥
                </Button>
                <Button 
                  onClick={() => handleFinalStop('neutral')} 
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 text-lg hover:scale-110 transition-transform hover:bg-yellow-500/10 hover:border-yellow-500"
                  disabled={!activeEntry.title && !pendingTitle.trim()}
                >
                  😐
                </Button>
                <Button 
                  onClick={() => handleFinalStop('tired')} 
                  variant="outline" 
                  size="icon"
                  className="h-8 w-8 text-lg hover:scale-110 transition-transform hover:bg-red-500/10 hover:border-red-500"
                  disabled={!activeEntry.title && !pendingTitle.trim()}
                >
                  😫
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsStopping(false)}
                className="h-6 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
              >
                <ArrowLeft className="h-3 w-3" /> Resume
              </Button>
            </div>
          ) : (
            <>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Focusing
              </span>
              <h3 className="text-sm font-bold truncate max-w-full text-center leading-tight">
                {activeEntry.title || <span className="italic text-muted-foreground">No Title</span>}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="text-2xl font-mono font-medium tracking-tight text-primary tabular-nums">
                  {formatTime(elapsed)}
                </div>
                <Button 
                  onClick={handleStopClick} 
                  size="icon" 
                  variant="destructive" 
                  className="h-6 w-6 rounded-md shadow-sm"
                  title="Stop timer"
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              </div>
            </>
          )
        ) : (
          <div className="flex w-full items-center gap-2 mt-1">
             <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder={t('diary.content_placeholder')}
              className="flex-1 h-6 text-xs bg-transparent border-b border-primary/20 focus:border-primary outline-none placeholder:text-muted-foreground/50 text-center transition-colors"
              autoFocus
            />
            <Button 
              onClick={handleStart} 
              size="icon" 
              className="h-6 w-6 shrink-0 rounded-full"
              title="Start timer"
            >
              <Play className="h-3 w-3 fill-current ml-0.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
