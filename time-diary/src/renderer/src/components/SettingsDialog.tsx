import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'
import { AIConfig } from '../types'
import { Globe } from 'lucide-react'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t, i18n } = useTranslation()
  const [config, setConfig] = useState<AIConfig>({
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadConfig()
    }
  }, [open])

  const loadConfig = async () => {
    try {
      const savedConfig = await window.api.getAIConfig()
      if (savedConfig) {
        setConfig(savedConfig)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await window.api.saveAIConfig(config)
      onClose()
    } catch (error) {
      console.error('Failed to save config:', error)
    } finally {
      setLoading(false)
    }
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in" role="dialog" aria-modal="true">
      <div className="w-full max-w-md p-6 bg-card rounded-xl border border-border shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-foreground">{t('common.settings')}</h2>
        
        <div className="flex flex-col gap-6">
          {/* Language Settings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t('common.language')}
            </h3>
            <div className="flex gap-2">
              <Button 
                variant={i18n.language === 'en' ? 'default' : 'outline'} 
                onClick={() => changeLanguage('en')}
                className="flex-1"
              >
                English
              </Button>
              <Button 
                variant={i18n.language === 'zh' ? 'default' : 'outline'} 
                onClick={() => changeLanguage('zh')}
                className="flex-1"
              >
                中文
              </Button>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* AI Settings */}
          <div className="space-y-4">
             <h3 className="text-sm font-medium text-muted-foreground">AI Configuration</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">API Base URL</label>
              <input
                type="text"
                value={config.baseURL}
                onChange={(e) => setConfig({ ...config, baseURL: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">API Key</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Model Name</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder="gpt-3.5-turbo"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
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
