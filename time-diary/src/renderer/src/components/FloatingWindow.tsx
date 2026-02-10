import { useEffect, useState } from 'react'
import { TimeEntry } from '../types'
import { Maximize2 } from 'lucide-react'
import { Button } from './ui/button'

export function FloatingWindow() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const loadActiveEntry = async () => {
    try {
      const entries = await window.api.getEntries()
      const running = entries.find(e => !e.endTime)
      setActiveEntry(running || null)
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

      <div className="flex flex-col items-center gap-0.5 w-full px-4">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {activeEntry ? 'Focusing' : 'Idle'}
        </span>
        <h3 className="text-sm font-bold truncate max-w-full text-center leading-tight">
          {activeEntry?.title || 'No active task'}
        </h3>
        <div className="text-2xl font-mono font-medium tracking-tight text-primary mt-0.5 tabular-nums">
          {activeEntry ? formatTime(elapsed) : '--:--:--'}
        </div>
      </div>
    </div>
  )
}
