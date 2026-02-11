import { useEffect, useState, Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { Timer } from './components/Timer'
import { HistoryList } from './components/HistoryList'
import { DiaryGenerator } from './components/DiaryGenerator'
import { FloatingWindow } from './components/FloatingWindow'
import { TimeEntry } from './types'
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './components/ui/button'

// Lazy load dialogs for performance
const SettingsDialog = lazy(() => import('./components/SettingsDialog').then(module => ({ default: module.SettingsDialog })))
const EditEntryDialog = lazy(() => import('./components/EditEntryDialog').then(module => ({ default: module.EditEntryDialog })))

function App() {
  const { t, i18n } = useTranslation()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mode, setMode] = useState<'main' | 'floating'>('main')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'floating') {
      setMode('floating')
    }
  }, [])

  const loadEntries = async () => {
    try {
      if (window.api) {
        const data = await window.api.getEntries()
        // Sort by start time descending
        const sorted = (data || []).sort((a, b) => b.startTime - a.startTime)
        setEntries(sorted)
        
        // Check for unfinished entry
        const running = sorted.find(e => !e.endTime)
        setActiveEntry(running || null)
      }
    } catch (error) {
      console.error("Failed to load entries:", error)
    }
  }

  useEffect(() => {
    loadEntries()
    if (window.api?.onEntriesUpdated) {
      return window.api.onEntriesUpdated(loadEntries)
    }
    return
  }, [])

  useEffect(() => {
    if (i18n) {
      document.documentElement.lang = i18n.language
    }
  }, [i18n?.language])

  const handleStart = async (title: string) => {
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      title,
      startTime: Date.now()
    }
    await window.api.addEntry(newEntry)
    setActiveEntry(newEntry)
    loadEntries() // Refresh list
  }

  const handleStop = async (mood: TimeEntry['mood'], newTitle?: string) => {
    if (!activeEntry) return

    const updatedEntry: TimeEntry = {
      ...activeEntry,
      endTime: Date.now(),
      mood,
      title: newTitle ? newTitle : activeEntry.title
    }
    await window.api.updateEntry(updatedEntry)
    setActiveEntry(null)
    loadEntries()
  }

  const handleUpdateEntry = async (updatedEntry: TimeEntry) => {
    await window.api.updateEntry(updatedEntry)
    loadEntries()
  }

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + days)
    setCurrentDate(newDate)
  }

  // Filter entries by selected date
  // Also filter out active entry from history list to avoid duplication if we want Timer to show it exclusively
  const historyEntries = entries.filter(e => {
    const isSameDate = new Date(e.startTime).toDateString() === currentDate.toDateString()
    const isNotActive = e.id !== activeEntry?.id
    return isSameDate && isNotActive
  })

  const suggestions = Array.from(new Set(entries.map(e => e.title))).filter(Boolean).sort()

  const isToday = new Date().toDateString() === currentDate.toDateString()

  if (!t) return <div>Loading resources...</div>

  if (mode === 'floating') {
    return <FloatingWindow />
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 transition-colors duration-300">
      <div className="container mx-auto px-4 py-6 md:px-8 md:py-8 max-w-7xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 pb-6 border-b border-border">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => changeDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground min-w-[140px] text-center select-none">
                {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => changeDate(1)} disabled={isToday}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSettingsOpen(true)}
            className="text-muted-foreground hover:text-primary touch-target rounded-full hover:bg-muted"
            aria-label={t('common.settings')}
          >
            <Settings className="w-6 h-6" />
          </Button>
        </header>

        {/* Main Content Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Timer & Generator (Sticky on Desktop) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-8">
            <section className="sticky top-8 space-y-8">
              <div className="relative z-10">
                <Timer 
                  onStart={handleStart} 
                  onStop={handleStop} 
                  activeEntry={activeEntry} 
                  suggestions={suggestions}
                />
              </div>
              
              <div className="hidden lg:block animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <DiaryGenerator entries={historyEntries} date={currentDate} />
              </div>
            </section>
          </div>

          {/* Right Column: History List */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
               <HistoryList entries={historyEntries} onEdit={setEditingEntry} date={currentDate} />
            </section>

            {/* Mobile Only: Generator at bottom */}
            <div className="lg:hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
               <DiaryGenerator entries={historyEntries} date={currentDate} />
            </div>
          </div>
        </main>
      </div>

      <Suspense fallback={null}>
        <SettingsDialog open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <EditEntryDialog 
          open={!!editingEntry} 
          entry={editingEntry} 
          onClose={() => setEditingEntry(null)} 
          onSave={handleUpdateEntry} 
        />
      </Suspense>
    </div>
  )
}

export default App
