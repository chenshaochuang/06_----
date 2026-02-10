import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { TimeEntry } from '../types'

interface EditEntryDialogProps {
  open: boolean
  entry: TimeEntry | null
  onClose: () => void
  onSave: (updatedEntry: TimeEntry) => Promise<void>
}

export function EditEntryDialog({ open, entry, onClose, onSave }: EditEntryDialogProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)

  // Convert timestamp to input value (YYYY-MM-DDThh:mm)
  const toInputValue = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Convert input value to timestamp
  const toTimestamp = (value: string) => {
    return new Date(value).getTime()
  }

  useEffect(() => {
    if (open && entry) {
      setTitle(entry.title)
      setStartTime(toInputValue(entry.startTime))
      setEndTime(toInputValue(entry.endTime))
    }
  }, [open, entry])

  const handleSave = async () => {
    if (!entry) return
    
    setLoading(true)
    try {
      const updatedEntry: TimeEntry = {
        ...entry,
        title,
        startTime: toTimestamp(startTime),
        endTime: endTime ? toTimestamp(endTime) : undefined
      }
      await onSave(updatedEntry)
      onClose()
    } catch (error) {
      console.error('Failed to update entry:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!open || !entry) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
      <div className="w-full max-w-md p-6 bg-card rounded-xl border border-border shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-foreground">{t('diary.edit_entry')}</h2>
        
        <div className="flex flex-col gap-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('diary.start_time')}</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('diary.end_time')}</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={onClose} className="touch-target">{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={loading} className="touch-target">
              {loading ? 'Saving...' : t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
