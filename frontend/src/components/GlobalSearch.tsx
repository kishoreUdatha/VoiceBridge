/**
 * Global Search Component
 * Provides search across leads, calls, raw imports, campaigns, users, bulk imports, and voice agents
 * Features: Mobile support, keyboard navigation, recent searches, custom field search
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { UserIcon, PhoneIcon, DocumentTextIcon, MegaphoneIcon, UsersIcon, FolderIcon, CpuChipIcon } from '@heroicons/react/24/solid';
import api from '../services/api';

interface SearchResult {
  id: string;
  type: 'lead' | 'call' | 'raw-import' | 'campaign' | 'user' | 'bulk-import' | 'agent';
  title: string;
  subtitle: string;
  icon: 'user' | 'phone' | 'document' | 'campaign' | 'users' | 'folder' | 'agent';
}

interface SearchResults {
  leads: SearchResult[];
  calls: SearchResult[];
  rawImports: SearchResult[];
  campaigns: SearchResult[];
  users: SearchResult[];
  bulkImports: SearchResult[];
  agents: SearchResult[];
}

const RECENT_SEARCHES_KEY = 'globalSearchHistory';
const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_MS = 400;

// Get recent searches from localStorage
const getRecentSearches = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save search to recent searches
const saveRecentSearch = (query: string) => {
  if (!query.trim()) return;
  const recent = getRecentSearches().filter(s => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)));
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>({
    leads: [],
    calls: [],
    rawImports: [],
    campaigns: [],
    users: [],
    bulkImports: [],
    agents: []
  });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten results for keyboard navigation
  const flatResults = [
    ...results.leads,
    ...results.calls,
    ...results.rawImports,
    ...results.campaigns,
    ...results.users,
    ...results.bulkImports,
    ...results.agents
  ];

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K) and navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Global shortcut to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 100);
        } else {
          inputRef.current?.focus();
          setIsOpen(true);
        }
      }

      // Escape to close
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsMobileOpen(false);
        inputRef.current?.blur();
        mobileInputRef.current?.blur();
        setSelectedIndex(-1);
      }

      // Keyboard navigation when dropdown is open
      if (isOpen && flatResults.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : 0));
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : flatResults.length - 1));
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
          event.preventDefault();
          handleResultClick(flatResults[selectedIndex]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Search function - single API call to search across all data types
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults({ leads: [], calls: [], rawImports: [], campaigns: [], users: [], bulkImports: [], agents: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Single API call to search all data types
      const response = await api.get(`/global-search?q=${encodeURIComponent(searchQuery)}&limit=5`);

      if (response.data?.data) {
        const data = response.data.data;
        setResults({
          leads: data.leads || [],
          calls: data.calls || [],
          rawImports: data.rawImports || [],
          campaigns: data.campaigns || [],
          users: data.users || [],
          bulkImports: data.bulkImports || [],
          agents: data.agents || [],
        });

        // Save to recent searches
        saveRecentSearch(searchQuery);
        setRecentSearches(getRecentSearches());
      }
    } catch (error) {
      console.error('[GlobalSearch] Search error:', error);
      // Reset results on error
      setResults({ leads: [], calls: [], rawImports: [], campaigns: [], users: [], bulkImports: [], agents: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, DEBOUNCE_MS);
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setIsMobileOpen(false);
    setQuery('');
    setSelectedIndex(-1);

    switch (result.type) {
      case 'lead':
        navigate(`/leads/${result.id}`);
        break;
      case 'call':
        navigate(`/outbound-calls?callId=${result.id}`);
        break;
      case 'raw-import':
        navigate(`/raw-imports?recordId=${result.id}`);
        break;
      case 'campaign':
        navigate(`/outbound-calls/campaigns/${result.id}`);
        break;
      case 'user':
        navigate(`/team/users/${result.id}`);
        break;
      case 'bulk-import':
        navigate(`/raw-imports/${result.id}`);
        break;
      case 'agent':
        navigate(`/voice-ai/agents/${result.id}`);
        break;
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    performSearch(search);
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setResults({ leads: [], calls: [], rawImports: [], campaigns: [], users: [], bulkImports: [], agents: [] });
    setSelectedIndex(-1);
    inputRef.current?.focus();
    mobileInputRef.current?.focus();
  };

  const hasResults = results.leads.length > 0 || results.calls.length > 0 || results.rawImports.length > 0 ||
    results.campaigns.length > 0 || results.users.length > 0 || results.bulkImports.length > 0 || results.agents.length > 0;
  const showDropdown = isOpen && (query.length >= 1 || recentSearches.length > 0);
  const showResults = query.length >= 2;

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'user':
        return <UserIcon className="h-4 w-4 text-blue-500" />;
      case 'phone':
        return <PhoneIcon className="h-4 w-4 text-green-500" />;
      case 'document':
        return <DocumentTextIcon className="h-4 w-4 text-purple-500" />;
      case 'campaign':
        return <MegaphoneIcon className="h-4 w-4 text-orange-500" />;
      case 'users':
        return <UsersIcon className="h-4 w-4 text-indigo-500" />;
      case 'folder':
        return <FolderIcon className="h-4 w-4 text-amber-500" />;
      case 'agent':
        return <CpuChipIcon className="h-4 w-4 text-cyan-500" />;
      default:
        return null;
    }
  };

  // Get flat index for a result
  const getFlatIndex = (type: string, localIndex: number): number => {
    let offset = 0;
    const order = ['leads', 'calls', 'rawImports', 'campaigns', 'users', 'bulkImports', 'agents'];
    for (const key of order) {
      if (key === type) break;
      offset += results[key as keyof SearchResults].length;
    }
    return offset + localIndex;
  };

  const renderResultSection = (title: string, items: SearchResult[], bgColor: string, typeKey: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
          {title}
        </div>
        {items.map((result, localIndex) => {
          const flatIndex = getFlatIndex(typeKey, localIndex);
          return (
            <button
              key={result.id}
              data-index={flatIndex}
              onClick={() => handleResultClick(result)}
              className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left ${
                selectedIndex === flatIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 ${bgColor} rounded-full flex items-center justify-center`}>
                {renderIcon(result.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{result.title}</div>
                <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSearchContent = () => (
    <>
      {/* Recent Searches (when no query) */}
      {!showResults && recentSearches.length > 0 && (
        <div>
          <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              Recent Searches
            </span>
            <button
              onClick={clearRecentSearches}
              className="text-slate-400 hover:text-slate-600 text-xs font-normal"
            >
              Clear
            </button>
          </div>
          {recentSearches.map((search, index) => (
            <button
              key={index}
              onClick={() => handleRecentSearchClick(search)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
            >
              <ClockIcon className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-700">{search}</span>
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && showResults && (
        <div className="p-4 text-center text-slate-500 text-sm">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-blue-500 mr-2" />
          Searching...
        </div>
      )}

      {/* No Results */}
      {!isLoading && !hasResults && showResults && (
        <div className="p-4 text-center text-slate-500 text-sm">
          No results found for "{query}"
        </div>
      )}

      {/* Search Results */}
      {!isLoading && showResults && hasResults && (
        <div ref={resultsRef}>
          {renderResultSection('Leads', results.leads, 'bg-blue-50', 'leads')}
          {renderResultSection('Calls', results.calls, 'bg-green-50', 'calls')}
          {renderResultSection('Raw Data', results.rawImports, 'bg-purple-50', 'rawImports')}
          {renderResultSection('Campaigns', results.campaigns, 'bg-orange-50', 'campaigns')}
          {renderResultSection('Team Members', results.users, 'bg-indigo-50', 'users')}
          {renderResultSection('Bulk Imports', results.bulkImports, 'bg-amber-50', 'bulkImports')}
          {renderResultSection('Voice Agents', results.agents, 'bg-cyan-50', 'agents')}

          {/* Footer tip */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
            <span className="hidden sm:inline">Use ↑↓ to navigate, Enter to select • </span>
            Click a result to view details
          </div>
        </div>
      )}

      {/* Empty state when focused but no query and no recent */}
      {!showResults && recentSearches.length === 0 && (
        <div className="p-4 text-center text-slate-400 text-sm">
          Type to search leads, calls, users, agents, and more...
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Search */}
      <div ref={containerRef} className="relative hidden md:block">
        {/* Search Input */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder="Search leads, calls... (Ctrl+K)"
            className="w-64 lg:w-80 pl-9 pr-8 py-1.5 text-sm bg-slate-100 border border-transparent rounded-lg
                       focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100
                       placeholder-slate-400 text-slate-700 transition-all"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-[480px] overflow-y-auto z-50">
            {renderSearchContent()}
          </div>
        )}
      </div>

      {/* Mobile Search Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
      >
        <MagnifyingGlassIcon className="h-5 w-5" />
      </button>

      {/* Mobile Search Modal */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Search Panel */}
          <div className="absolute top-0 left-0 right-0 bg-white shadow-xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  autoFocus
                  placeholder="Search leads, calls, agents..."
                  className="w-full pl-10 pr-10 py-2.5 text-base bg-slate-100 border border-transparent rounded-lg
                             focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100
                             placeholder-slate-400 text-slate-700"
                />
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {renderSearchContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
