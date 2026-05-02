/**
 * Preferences Page - Language, timezone, date format settings
 * Connected to real API for persistent storage
 */
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  GlobeAltIcon,
  ClockIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  ArrowLeftIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { userPreferencesService, DisplaySettings } from '../../services/user-preferences.service';

interface Preferences extends DisplaySettings {
  startOfWeek: string;
  numberFormat: string;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
];

const timezones = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const dateFormats = [
  { value: 'DD/MM/YYYY', example: '25/12/2024' },
  { value: 'MM/DD/YYYY', example: '12/25/2024' },
  { value: 'YYYY-MM-DD', example: '2024-12-25' },
  { value: 'DD-MMM-YYYY', example: '25-Dec-2024' },
  { value: 'MMM DD, YYYY', example: 'Dec 25, 2024' },
];

const currencies = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

export default function PreferencesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    language: 'en',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currency: 'INR',
    theme: 'light',
    startOfWeek: 'monday',
    numberFormat: 'en-IN',
  });

  // Load preferences from API
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const data = await userPreferencesService.getUserPreferences();
        setPreferences(prev => ({
          ...prev,
          language: data.language || prev.language,
          timezone: data.timezone || prev.timezone,
          dateFormat: data.dateFormat || prev.dateFormat,
          timeFormat: data.timeFormat || prev.timeFormat,
          currency: data.currency || prev.currency,
          theme: (data.theme as 'light' | 'dark' | 'system') || prev.theme,
        }));
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userPreferencesService.updateUserPreferences({
        language: preferences.language,
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat,
        timeFormat: preferences.timeFormat,
        currency: preferences.currency,
        theme: preferences.theme,
      });
      toast.success('Preferences saved successfully');
    } catch (error) {
      toast.error('Failed to save preferences');
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Preferences</h1>
          <p className="text-sm text-slate-500">Configure your language, timezone, and display settings</p>
        </div>
      </div>

      {/* Language Selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <GlobeAltIcon className="w-5 h-5 text-blue-600" />
          Language
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setPreferences(prev => ({ ...prev, language: lang.code }))}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                preferences.language === lang.code
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="text-sm font-medium text-slate-700">{lang.name}</span>
              {preferences.language === lang.code && (
                <CheckIcon className="w-4 h-4 text-primary-600 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Timezone & Date/Time */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-amber-600" />
          Date & Time
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date Format
            </label>
            <select
              value={preferences.dateFormat}
              onChange={(e) => setPreferences(prev => ({ ...prev, dateFormat: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {dateFormats.map((df) => (
                <option key={df.value} value={df.value}>{df.value} ({df.example})</option>
              ))}
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Time Format
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setPreferences(prev => ({ ...prev, timeFormat: '12h' }))}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  preferences.timeFormat === '12h'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                12 Hour (2:30 PM)
              </button>
              <button
                onClick={() => setPreferences(prev => ({ ...prev, timeFormat: '24h' }))}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                  preferences.timeFormat === '24h'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                24 Hour (14:30)
              </button>
            </div>
          </div>

          {/* Start of Week */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Start of Week
            </label>
            <select
              value={preferences.startOfWeek}
              onChange={(e) => setPreferences(prev => ({ ...prev, startOfWeek: e.target.value }))}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
              <option value="saturday">Saturday</option>
            </select>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-lg">₹</span>
          Currency
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {currencies.map((curr) => (
            <button
              key={curr.code}
              onClick={() => setPreferences(prev => ({ ...prev, currency: curr.code }))}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                preferences.currency === curr.code
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-xl font-semibold text-slate-700">{curr.symbol}</span>
              <span className="text-xs text-slate-500">{curr.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <SunIcon className="w-5 h-5 text-yellow-500" />
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setPreferences(prev => ({ ...prev, theme: 'light' }))}
            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              preferences.theme === 'light'
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <SunIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Light</span>
          </button>
          <button
            onClick={() => setPreferences(prev => ({ ...prev, theme: 'dark' }))}
            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              preferences.theme === 'dark'
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
              <MoonIcon className="w-6 h-6 text-slate-200" />
            </div>
            <span className="text-sm font-medium text-slate-700">Dark</span>
          </button>
          <button
            onClick={() => setPreferences(prev => ({ ...prev, theme: 'system' }))}
            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              preferences.theme === 'system'
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
              <ComputerDesktopIcon className="w-6 h-6 text-slate-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">System</span>
          </button>
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
