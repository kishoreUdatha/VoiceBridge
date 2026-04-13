/**
 * Tag Selector Component
 * Allows selecting and assigning tags to leads
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon, XMarkIcon, CheckIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import leadTagsService, { LeadTag } from '../../services/lead-tags.service';
import api from '../../services/api';

interface TagSelectorProps {
  leadId: string;
  onTagsChange?: (tags: LeadTag[]) => void;
  compact?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
}

// Follow Up tag names to check
const FOLLOW_UP_TAG_NAMES = ['Follow Up', 'follow up', 'Follow-Up', 'FollowUp', 'FOLLOW UP'];

const TagSelector: React.FC<TagSelectorProps> = ({ leadId, onTagsChange, compact = false }) => {
  const [allTags, setAllTags] = useState<LeadTag[]>([]);
  const [leadTags, setLeadTags] = useState<LeadTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Follow-up date modal state
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [pendingFollowUpTag, setPendingFollowUpTag] = useState<LeadTag | null>(null);
  const [followUpError, setFollowUpError] = useState('');

  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [leadId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

      if (isOutsideContainer && isOutsideDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showDropdown, updateDropdownPosition]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tagsData, leadTagsData] = await Promise.all([
        leadTagsService.getTags(false),
        leadTagsService.getLeadTags(leadId).catch((err) => {
          // 404 means lead doesn't belong to user's organization
          if (err.response?.status === 404) {
            console.warn('Lead not accessible - may belong to different organization');
          }
          return [];
        }),
      ]);
      setAllTags(tagsData.tags || []);
      // Ensure leadTagsData is always an array
      const tagsArray = Array.isArray(leadTagsData) ? leadTagsData :
                        (leadTagsData?.tags ? leadTagsData.tags : []);
      setLeadTags(tagsArray);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setAllTags([]);
      setLeadTags([]);
    } finally {
      setLoading(false);
    }
  };

  // Check if a tag is a "Follow Up" tag
  const isFollowUpTag = (tag: LeadTag) => {
    return FOLLOW_UP_TAG_NAMES.some(name =>
      tag.name.toLowerCase() === name.toLowerCase()
    );
  };

  const handleToggleTag = async (tag: LeadTag) => {
    const isAssigned = leadTags.some((t) => t.id === tag.id);

    // If assigning "Follow Up" tag, check for existing follow-up first
    if (!isAssigned && isFollowUpTag(tag)) {
      try {
        setSaving(true);
        // Check if there's already an upcoming follow-up
        const response = await api.get(`/lead-details/${leadId}/follow-ups`);
        const existingFollowUps = response.data?.data || [];
        const upcomingFollowUp = existingFollowUps.find((f: any) => f.status === 'UPCOMING');

        if (upcomingFollowUp) {
          const scheduledDate = new Date(upcomingFollowUp.scheduledAt).toLocaleDateString();
          alert(`This lead already has a scheduled follow-up on ${scheduledDate}. Please reschedule the existing one instead of adding a new tag.`);
          setShowDropdown(false);
          return;
        }
      } catch (err) {
        console.error('Failed to check existing follow-ups:', err);
      } finally {
        setSaving(false);
      }

      setPendingFollowUpTag(tag);
      setFollowUpDate('');
      setFollowUpTime('10:00');
      setFollowUpError('');
      setShowFollowUpModal(true);
      setShowDropdown(false);
      return;
    }

    try {
      setSaving(true);
      if (isAssigned) {
        await leadTagsService.removeTagsFromLead(leadId, [tag.id]);
        const newTags = leadTags.filter((t) => t.id !== tag.id);
        setLeadTags(newTags);
        onTagsChange?.(newTags);
      } else {
        await leadTagsService.assignTagsToLead(leadId, [tag.id]);
        const newTags = [...leadTags, tag];
        setLeadTags(newTags);
        onTagsChange?.(newTags);
      }
      setShowDropdown(false);
    } catch (err: any) {
      console.error('Failed to toggle tag:', err);
      // Handle 401 - session expired
      if (err.response?.status === 401) {
        alert('Session expired. Please refresh the page and login again.');
        return;
      }
      // Handle 404 - lead not in user's organization
      if (err.response?.status === 404) {
        alert('This lead belongs to a different organization. You cannot modify its tags.');
        return;
      }
      const errorMsg = err.response?.data?.message || 'Failed to update tag';
      alert(errorMsg);
      // Refresh data to sync state
      await fetchData();
    } finally {
      setSaving(false);
    }
  };

  // Handle follow-up tag assignment with date
  const handleFollowUpConfirm = async () => {
    if (!followUpDate) {
      setFollowUpError('Please select a follow-up date');
      return;
    }

    if (!pendingFollowUpTag) return;

    try {
      setSaving(true);
      setFollowUpError('');

      // Create the follow-up schedule
      const scheduledAt = new Date(`${followUpDate}T${followUpTime}:00`);

      // Schedule the follow-up
      await api.post(`/lead-details/${leadId}/follow-ups`, {
        scheduledAt: scheduledAt.toISOString(),
        followUpType: 'MANUAL',
        message: 'Follow-up scheduled via tag assignment',
      });

      // Assign the tag
      await leadTagsService.assignTagsToLead(leadId, [pendingFollowUpTag.id]);
      const newTags = [...leadTags, pendingFollowUpTag];
      setLeadTags(newTags);
      onTagsChange?.(newTags);

      setShowFollowUpModal(false);
      setPendingFollowUpTag(null);
    } catch (err: any) {
      console.error('Failed to assign follow-up tag:', err);
      const errorMsg = err.response?.data?.message || 'Failed to schedule follow-up';
      setFollowUpError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleFollowUpCancel = () => {
    setShowFollowUpModal(false);
    setPendingFollowUpTag(null);
    setFollowUpDate('');
    setFollowUpError('');
  };

  const handleRemoveTag = async (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tag = leadTags.find((t) => t.id === tagId);
    if (tag) {
      await handleToggleTag(tag);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-4 h-4 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <span className="text-xs text-gray-400">Loading tags...</span>
      </div>
    );
  }

  if (allTags.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        No tags available.{' '}
        <a href="/settings/tags" className="text-indigo-600 hover:text-indigo-700">
          Create tags
        </a>
      </div>
    );
  }

  const handleToggleDropdown = () => {
    if (!showDropdown) {
      updateDropdownPosition();
    }
    setShowDropdown(!showDropdown);
  };

  const dropdownContent = showDropdown && (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 max-h-64 overflow-y-auto"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}
    >
      {allTags.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">No tags available</div>
      ) : (
        allTags.map((tag) => {
          const isAssigned = leadTags.some((t) => t.id === tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => handleToggleTag(tag)}
              disabled={saving}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 ${
                isAssigned ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className={isAssigned ? 'text-indigo-700 font-medium' : 'text-gray-700'}>
                  {tag.name}
                </span>
              </div>
              {isAssigned && <CheckIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap items-center gap-1.5">
        {leadTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={(e) => handleRemoveTag(tag.id, e)}
              className="hover:bg-white/20 rounded-full p-0.5"
              disabled={saving}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          ref={buttonRef}
          onClick={handleToggleDropdown}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors ${
            compact ? '' : 'py-1'
          }`}
        >
          <PlusIcon className="w-3 h-3" />
          {!compact && 'Add Tag'}
        </button>
      </div>

      {/* Dropdown rendered via portal to escape overflow:hidden containers */}
      {createPortal(dropdownContent, document.body)}

      {/* Follow-up Date Modal */}
      {showFollowUpModal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleFollowUpCancel}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Schedule Follow-up</h3>
                <p className="text-sm text-gray-500">Select a date and time for the follow-up</p>
              </div>
            </div>

            {followUpError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {followUpError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Time
                </label>
                <input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleFollowUpCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleFollowUpConfirm}
                disabled={saving || !followUpDate}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Scheduling...' : 'Schedule Follow-up'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TagSelector;
