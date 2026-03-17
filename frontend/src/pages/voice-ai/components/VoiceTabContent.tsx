import React from 'react';
import { Play, Check } from 'lucide-react';
import type { VoiceOption } from '../types/voiceAgent.types';
import { voiceOptions, languageOptions } from '../constants/voiceAgent.constants';

interface VoiceTabContentProps {
  selectedVoiceId: string;
  selectedVoiceName: string;
  selectedLanguage: string;
  onSelectVoice: (voice: VoiceOption, newLanguage?: string) => void;
  onTestVoice: (voiceId: string) => void;
  onOpenVoicePanel: () => void;
}

export const VoiceTabContent: React.FC<VoiceTabContentProps> = ({
  selectedVoiceId,
  selectedVoiceName,
  selectedLanguage,
  onSelectVoice,
  onTestVoice,
  onOpenVoicePanel,
}) => {
  // Filter voices based on selected language
  const filteredVoices = voiceOptions.filter((v) => {
    return (
      v.language === selectedLanguage ||
      v.language === 'en-IN' ||
      v.language === 'en-US' ||
      v.region === 'sarvam'
    );
  });

  const handleVoiceSelect = (voice: VoiceOption) => {
    const newLanguage = voice.language || selectedLanguage;
    const langOption = languageOptions.find((l) => l.id === newLanguage);
    onSelectVoice(voice, langOption?.greetingTemplate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-8">
        <div className="w-48 flex-shrink-0">
          <label className="text-sm font-medium text-gray-900">Select Voice</label>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose a voice for your agent. Click play to preview.
          </p>
          <button
            type="button"
            onClick={onOpenVoicePanel}
            className="mt-2 text-xs text-teal-600 hover:text-teal-700 font-medium"
          >
            Browse all voices →
          </button>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredVoices.slice(0, 12).map((voice) => {
              const isSelected =
                selectedVoiceId === voice.id && selectedVoiceName === voice.name;
              return (
                <button
                  key={`${voice.id}-${voice.name}`}
                  onClick={() => handleVoiceSelect(voice)}
                  className={`relative p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500'
                      : 'border-gray-200 hover:border-teal-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {voice.gender === 'female' ? '👩' : '👨'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{voice.name}</p>
                      <p className="text-xs text-gray-500">{voice.description}</p>
                    </div>
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTestVoice(voice.id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                    >
                      <Play size={16} className="text-teal-600" />
                    </span>
                  </div>
                  {voice.provider === 'sarvam' && (
                    <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                      Native
                    </span>
                  )}
                  {isSelected && (
                    <div className="absolute top-2 left-2">
                      <Check size={16} className="text-teal-600" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTabContent;
