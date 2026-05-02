/**
 * Accessibility Page - Font size, contrast, screen reader options
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  EyeIcon,
  SpeakerWaveIcon,
  CursorArrowRaysIcon,
  ArrowLeftIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { userPreferencesService } from '../../services/user-preferences.service';

interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  lineSpacing: 'compact' | 'normal' | 'relaxed';
  keyboardShortcuts: boolean;
}

export default function AccessibilityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 'medium',
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    lineSpacing: 'normal',
    keyboardShortcuts: true,
  });

  // Load settings from API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await userPreferencesService.getAccessibilitySettings();
        setSettings({
          fontSize: (data.fontSize as any) || 'medium',
          highContrast: data.highContrast || false,
          reducedMotion: data.reducedMotion || false,
          screenReader: data.screenReader || false,
          lineSpacing: (data.lineSpacing as any) || 'normal',
          keyboardShortcuts: data.keyboardShortcuts ?? true,
        });
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userPreferencesService.updateAccessibilitySettings(settings);
      toast.success('Accessibility settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Failed to save accessibility settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const fontSizes = [
    { value: 'small', label: 'Small', size: 'text-sm' },
    { value: 'medium', label: 'Medium', size: 'text-base' },
    { value: 'large', label: 'Large', size: 'text-lg' },
    { value: 'extra-large', label: 'Extra Large', size: 'text-xl' },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/settings"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accessibility</h1>
          <p className="text-sm text-slate-500">Configure display and interaction preferences</p>
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Font Size</h2>
        <p className="text-sm text-slate-500 mb-4">Adjust the text size throughout the application</p>
        <div className="grid grid-cols-4 gap-3">
          {fontSizes.map((size) => (
            <button
              key={size.value}
              onClick={() => setSettings(prev => ({ ...prev, fontSize: size.value as any }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.fontSize === size.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className={`block ${size.size} font-medium text-slate-700`}>Aa</span>
              <span className="block text-xs text-slate-500 mt-1">{size.label}</span>
            </button>
          ))}
        </div>
        {/* Preview */}
        <div className="mt-4 p-4 bg-slate-50 rounded-lg">
          <p className="text-slate-600 mb-1 text-xs font-medium uppercase tracking-wider">Preview</p>
          <p className={`text-slate-900 ${fontSizes.find(f => f.value === settings.fontSize)?.size}`}>
            This is how your text will appear in the application.
          </p>
        </div>
      </div>

      {/* Contrast */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Contrast</h2>
        <p className="text-sm text-slate-500 mb-4">Increase contrast for better visibility</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSettings(prev => ({ ...prev, highContrast: false }))}
            className={`p-4 rounded-lg border-2 transition-all ${
              !settings.highContrast
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                <SunIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div className="text-left">
                <span className="block font-medium text-slate-900">Normal</span>
                <span className="block text-xs text-slate-500">Standard contrast</span>
              </div>
            </div>
          </button>
          <button
            onClick={() => setSettings(prev => ({ ...prev, highContrast: true }))}
            className={`p-4 rounded-lg border-2 transition-all ${
              settings.highContrast
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center">
                <MoonIcon className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span className="block font-medium text-slate-900">High Contrast</span>
                <span className="block text-xs text-slate-500">Enhanced visibility</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Line Spacing */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Line Spacing</h2>
        <p className="text-sm text-slate-500 mb-4">Adjust spacing between lines of text</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'compact', label: 'Compact', leading: 'leading-tight' },
            { value: 'normal', label: 'Normal', leading: 'leading-normal' },
            { value: 'relaxed', label: 'Relaxed', leading: 'leading-relaxed' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSettings(prev => ({ ...prev, lineSpacing: option.value as any }))}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                settings.lineSpacing === option.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="block font-medium text-slate-900 mb-2">{option.label}</span>
              <p className={`text-xs text-slate-500 ${option.leading}`}>
                Sample text to show line spacing. This helps visualize the space between lines.
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Options */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Options</h2>
        <div className="space-y-4">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <CursorArrowRaysIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Reduced Motion</p>
                <p className="text-xs text-slate-500">Minimize animations and transitions</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, reducedMotion: !prev.reducedMotion }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.reducedMotion ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                settings.reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Screen Reader Optimized */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <SpeakerWaveIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Screen Reader Optimized</p>
                <p className="text-xs text-slate-500">Enhance compatibility with screen readers</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, screenReader: !prev.screenReader }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.screenReader ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                settings.screenReader ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <ComputerDesktopIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Keyboard Shortcuts</p>
                <p className="text-xs text-slate-500">Enable keyboard navigation shortcuts</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, keyboardShortcuts: !prev.keyboardShortcuts }))}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.keyboardShortcuts ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                settings.keyboardShortcuts ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link
          to="/settings"
          className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
