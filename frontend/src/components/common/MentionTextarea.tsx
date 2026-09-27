import React, { useState, useRef, useEffect } from 'react';
import axios from '@/lib/axios';

interface User {
  id: string;
  name: string;
  username: string;
  profilePicture?: string;
  role: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  rows?: number;
  disabled?: boolean;
}

const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  placeholder = 'Write something...',
  className = '',
  maxLength,
  rows = 3,
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search for users when @ is typed
  useEffect(() => {
    const searchUsers = async () => {
      if (mentionSearch.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await axios.get(`/users/search/mentions?q=${mentionSearch}`);
        setSuggestions(response.data.users || []);
        setShowSuggestions(response.data.users.length > 0);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Error searching users:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [mentionSearch]);

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart;

    onChange(newValue);
    setCursorPosition(newCursorPosition);

    // Check if @ was typed
    const textBeforeCursor = newValue.substring(0, newCursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      // Check if there's a space after the @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
      } else {
        setMentionSearch('');
        setShowSuggestions(false);
      }
    } else {
      setMentionSearch('');
      setShowSuggestions(false);
    }
  };

  // Handle mention selection
  const selectMention = (user: User) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const newValue =
        value.substring(0, lastAtIndex) +
        `@${user.username} ` +
        textAfterCursor;

      onChange(newValue);
      setShowSuggestions(false);
      setMentionSearch('');

      // Set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + user.username.length + 2;
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault();
      selectMention(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setMentionSearch('');
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'technician':
        return 'bg-blue-900 text-blue-300';
      case 'customer':
        return 'bg-green-900 text-green-300';
      case 'support':
        return 'bg-purple-900 text-purple-300';
      case 'admin':
        return 'bg-red-900 text-red-300';
      default:
        return 'bg-surface-300 text-ink-muted';
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        maxLength={maxLength}
        rows={rows}
        disabled={disabled}
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full mb-2 w-full max-w-md bg-surface-200 border border-line rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
        >
          <div className="p-2">
            <div className="text-xs font-medium text-ink-muted mb-2 px-2">
              Mention someone
            </div>
            {suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onClick={() => selectMention(user)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-900/20'
                    : 'hover:bg-surface-300/50'
                }`}
              >
                {/* Profile picture */}
                <div className="flex-shrink-0">
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center text-ink font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink dark:text-ink truncate">
                      {user.name}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <span className="text-sm text-ink-muted">
                    @{user.username}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Character count */}
      {maxLength && (
        <div className="absolute bottom-2 right-2 text-xs text-ink-muted">
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
