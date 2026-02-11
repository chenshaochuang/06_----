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
  const [isHovered, setIsHovered] = useState(false)

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
    // Make body transparent for floating window
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.backgroundColor = 'transparent'
    
    loadActiveEntry()
    const cleanup = window.api.onEntriesUpdated(loadActiveEntry)
    return () => {
      cleanup()
      document.body.style.backgroundColor = ''
      document.documentElement.style.backgroundColor = ''
    }
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
      className="h-screen w-screen flex items-center justify-center bg-transparent select-none overflow-hidden p-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="relative w-full h-full max-h-[120px] bg-background/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl flex flex-col items-center justify-center overflow-hidden transition-all duration-300 hover:bg-background/70 group"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Background Gradient Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />

        {/* Expand Button (Hidden by default, visible on hover) */}
        <div 
          className={`absolute top-2 right-3 z-50 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} 
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-6 w-6 hover:bg-primary/10 rounded-full text-muted-foreground hover:text-primary transition-colors"
             onClick={() => window.api.switchToMain()}
             title="Expand to main window"
           >
             <Maximize2 className="h-3.5 w-3.5" />
           </Button>
        </div>

        <div className="flex flex-col items-center justify-center w-full px-6 z-10" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {activeEntry ? (
            isStopping ? (
              <div className="flex flex-col items-center gap-3 w-full animate-in fade-in zoom-in-95 duration-200">
                {!activeEntry.title && (
                  <input
                    type="text"
                    value={pendingTitle}
                    onChange={(e) => setPendingTitle(e.target.value)}
                    placeholder={t('diary.content_placeholder')}
                    className="w-full h-8 text-sm bg-transparent border-b border-primary/20 focus:border-primary outline-none text-center placeholder:text-muted-foreground/50 font-medium"
                    autoFocus
                  />
                )}
                <div className="flex gap-3 justify-center items-center">
                  <Button 
                    onClick={() => handleFinalStop('focus')} 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 text-xl rounded-full hover:scale-110 transition-all duration-200 bg-background/50 hover:bg-green-500/20 hover:border-green-500 border-dashed" 
                    disabled={!activeEntry.title && !pendingTitle.trim()}
                    title="Focused"
                  >
                    🔥
                  </Button>
                  <Button 
                    onClick={() => handleFinalStop('neutral')} 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 text-xl rounded-full hover:scale-110 transition-all duration-200 bg-background/50 hover:bg-yellow-500/20 hover:border-yellow-500 border-dashed"
                    disabled={!activeEntry.title && !pendingTitle.trim()}
                    title="Neutral"
                  >
                    😐
                  </Button>
                  <Button 
                    onClick={() => handleFinalStop('tired')} 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 text-xl rounded-full hover:scale-110 transition-all duration-200 bg-background/50 hover:bg-red-500/20 hover:border-red-500 border-dashed"
                    disabled={!activeEntry.title && !pendingTitle.trim()}
                    title="Tired"
                  >
                    😫
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsStopping(false)}
                  className="h-6 text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 -mt-1 rounded-full px-3 hover:bg-primary/5"
                >
                  <ArrowLeft className="h-3 w-3" /> Resume
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full gap-1">
                <h3 className="text-xs font-medium text-muted-foreground/80 truncate max-w-[200px] text-center tracking-wide uppercase">
                  {activeEntry.title || <span className="italic opacity-50">No Title</span>}
                </h3>
                
                <div className="relative group/timer">
                  <div className="text-4xl font-mono font-bold tracking-tighter text-foreground tabular-nums drop-shadow-sm select-text">
                    {formatTime(elapsed)}
                  </div>
                </div>

                <div className={`transition-all duration-300 overflow-hidden ${isHovered ? 'h-8 opacity-100 mt-1' : 'h-0 opacity-0 mt-0'}`}>
                   <Button 
                    onClick={handleStopClick} 
                    size="sm" 
                    variant="destructive" 
                    className="h-7 px-4 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 text-xs font-medium bg-red-500/90 hover:bg-red-600"
                    title="Stop timer"
                  >
                    <Square className="h-3 w-3 fill-current mr-1.5" /> Stop
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="flex w-full items-center gap-3 px-2">
               <div className="flex-1 relative group">
                 <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary/50 group-focus-within:bg-primary transition-colors" />
                 </div>
                 <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  placeholder={t('diary.content_placeholder')}
                  className="w-full h-10 pl-5 pr-2 text-sm bg-muted/30 hover:bg-muted/50 focus:bg-muted/50 rounded-xl border-none focus:ring-1 focus:ring-primary/20 outline-none placeholder:text-muted-foreground/40 transition-all"
                  autoFocus
                />
               </div>
              <Button 
                onClick={handleStart} 
                size="icon" 
                className="h-10 w-10 shrink-0 rounded-full shadow-lg hover:shadow-primary/25 bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                title="Start timer"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
