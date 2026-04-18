/**
 * Branding Settings Page
 * Allows organization admins to customize branding (logo, colors, name)
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PhotoIcon,
  CheckIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface BrandingConfig {
  brandName: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  favicon: string | null;
  loginBgImage: string | null;
  footerText: string | null;
  hidePoweredBy: boolean;
}

const defaultBranding: BrandingConfig = {
  brandName: '',
  logo: null,
  primaryColor: '#6366f1',
  secondaryColor: '#4f46e5',
  accentColor: '#10b981',
  favicon: null,
  loginBgImage: null,
  footerText: null,
  hidePoweredBy: false,
};

export default function BrandingSettingsPage() {
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadBranding();
  }, []);

  const loadBranding = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/organization/branding');
      if (response.data.success) {
        setBranding(response.data.data);
        if (response.data.data.logo) {
          setLogoPreview(response.data.data.logo);
        }
      }
    } catch (error) {
      console.error('Failed to load branding:', error);
      toast.error('Failed to load branding settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // If there's a new logo, upload it first
      let logoUrl = branding.logo;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('type', 'logo');
        const uploadRes = await api.post('/uploads/branding', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (uploadRes.data.success) {
          logoUrl = uploadRes.data.data.url;
        }
      }

      // Save branding settings
      const response = await api.put('/organization/branding', {
        ...branding,
        logo: logoUrl,
      });

      if (response.data.success) {
        toast.success('Branding updated successfully');
        setBranding(response.data.data);
      }
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/settings"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize your organization's appearance
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
        {/* Brand Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Brand Name
          </label>
          <input
            type="text"
            value={branding.brandName}
            onChange={(e) => setBranding({ ...branding, brandName: e.target.value })}
            placeholder="Your organization name"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-slate-500 mt-1">
            This name will appear in the browser tab and throughout the app
          </p>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Logo
          </label>
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-100 overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  <span className="text-xs mt-1">No Logo</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Upload Logo
              </label>
              <p className="text-xs text-slate-500 mt-2">
                Recommended: 200x200px, PNG or SVG with transparent background
              </p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Secondary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.secondaryColor}
                onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={branding.secondaryColor}
                onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.accentColor}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                className="w-10 h-10 rounded border border-slate-300 cursor-pointer"
              />
              <input
                type="text"
                value={branding.accentColor}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Footer Text
          </label>
          <input
            type="text"
            value={branding.footerText || ''}
            onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
            placeholder="e.g., Your Company - All rights reserved"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Hide Powered By */}
        <div className="flex items-center justify-between py-3 border-t border-slate-200">
          <div>
            <p className="text-sm font-medium text-slate-700">Hide "Powered by MyLeadX"</p>
            <p className="text-xs text-slate-500">Remove branding from the footer</p>
          </div>
          <button
            type="button"
            onClick={() => setBranding({ ...branding, hidePoweredBy: !branding.hidePoweredBy })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              branding.hidePoweredBy ? 'bg-primary-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                branding.hidePoweredBy ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Preview */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: branding.primaryColor + '10' }}
          >
            <div className="flex items-center gap-3 mb-3">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain" />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.brandName?.[0] || 'V'}
                </div>
              )}
              <span className="font-semibold text-slate-900">
                {branding.brandName || 'Your Brand'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: branding.primaryColor }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: branding.secondaryColor }}
              >
                Secondary
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: branding.accentColor }}
              >
                Accent
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
