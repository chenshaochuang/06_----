import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TimeEntry } from '../types'
import { Pencil, Clock, List, PieChart } from 'lucide-react'
import { Button } from './ui/button'

interface HistoryListProps {
  entries: TimeEntry[]
  onEdit: (entry: TimeEntry) => void
  date: Date
}

export function HistoryList({ entries, onEdit, date }: HistoryListProps) {
  const { t } = useTranslation()
  const [isGrouped, setIsGrouped] = useState(false)

  const isToday = new Date().toDateString() === date.toDateString()
  const title = isToday ? "Today's Journey" : `${date.toLocaleDateString()} Journey`

  const formatTime = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor((ms / (1000 * 60 * 60)))
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
    if (minutes > 0) return `${minutes}m ${seconds}s`
    return `${seconds}s`
  }

  const formatTimeRange = (start: number, end?: number) => {
    const s = new Date(start)
    const e = end ? new Date(end) : null
    return `${s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} - ${e ? e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now'}`
  }

  const sortedEntries = [...entries].sort((a, b) => b.startTime - a.startTime)

  const groupedEntries = Object.values(entries.reduce((acc, entry) => {
    if (!acc[entry.title]) {
      acc[entry.title] = {
        title: entry.title,
        duration: 0,
        count: 0,
        mood: entry.mood
      }
    }
    acc[entry.title].duration += (entry.endTime ? entry.endTime - entry.startTime : 0)
    acc[entry.title].count += 1
    // Keep the most recent mood if available
    if (entry.mood) acc[entry.title].mood = entry.mood
    return acc
  }, {} as Record<string, { title: string, duration: number, count: number, mood?: string }>))
  .sort((a, b) => b.duration - a.duration)

  const totalDuration = entries.reduce((acc, entry) => {
    return acc + (entry.endTime ? entry.endTime - entry.startTime : 0)
  }, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground tracking-tight">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsGrouped(!isGrouped)}
            className="text-muted-foreground hover:text-primary"
            title={isGrouped ? t('diary.list_view') : t('diary.group_by_task')}
          >
            {isGrouped ? <List className="w-4 h-4" /> : <PieChart className="w-4 h-4" />}
          </Button>
          {totalDuration > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1 rounded-full border border-border/50">
              <Clock className="w-4 h-4" />
              <span>{t('diary.total_time')}: {formatTime(totalDuration)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {entries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm bg-card/50 rounded-xl border border-dashed border-border">
            {t('diary.no_entries')}
          </div>
        )}
        
        {isGrouped ? (
          groupedEntries.map((group) => (
            <div key={group.title} className="group flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-foreground text-base">{group.title}</span>
                <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded w-fit">
                  {group.count} {t('diary.count_suffix')}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {group.mood && (
                  <span title={`Mood: ${group.mood}`} className="text-xl cursor-help select-none grayscale hover:grayscale-0 transition-all">
                    {group.mood === 'focus' ? '🔥' : group.mood === 'neutral' ? '😐' : '😫'}
                  </span>
                )}
                <span className="text-sm font-mono text-foreground/80 font-medium">
                  {formatTime(group.duration)}
                </span>
              </div>
            </div>
          ))
        ) : (
          sortedEntries.map((entry) => (
            <div key={entry.id} className="group flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-foreground text-base">{entry.title}</span>
                <span className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded w-fit">
                  {formatTimeRange(entry.startTime, entry.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                 {entry.mood && (
                  <span title={`Mood: ${entry.mood}`} className="text-xl cursor-help select-none grayscale hover:grayscale-0 transition-all">
                    {entry.mood === 'focus' ? '🔥' : entry.mood === 'neutral' ? '😐' : '😫'}
                  </span>
                )}
                <span className="text-sm font-mono text-foreground/80 font-medium">
                  {entry.endTime ? formatTime(entry.endTime - entry.startTime) : '...'}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onEdit(entry)}
                  aria-label={t('common.edit')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
