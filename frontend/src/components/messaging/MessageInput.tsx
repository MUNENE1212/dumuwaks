import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import { socketService } from '@/services/socket';

interface MessageInputProps {
  onSend: (message: { text?: string; type: 'text' | 'audio' | 'image' | 'location'; audioBlob?: Blob; duration?: number }) => void;
  disabled?: boolean;
  placeholder?: string;
  conversationId?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  conversationId,
}) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle typing indicator with debounce
  const handleTypingIndicator = (isTyping: boolean) => {
    if (conversationId) {
      if (isTyping) {
        socketService.emitTypingStart(conversationId);
      } else {
        socketService.emitTypingStop(conversationId);
      }
    }
  };

  // Debounce typing stop
  const debouncedStopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingIndicator(false);
      setIsTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSend({
      text: trimmedMessage,
      type: 'text',
    });

    setMessage('');
    setIsTyping(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }

    // Typing indicator
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      handleTypingIndicator(true);
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
      handleTypingIndicator(false);
    } else if (isTyping && e.target.value.length > 0) {
      // Debounce typing stop
      debouncedStopTyping();
    }
  };

  // Handle voice note send
  const handleVoiceSend = (audioBlob: Blob, duration: number) => {
    onSend({
      type: 'audio',
      audioBlob,
      duration,
    });
    setShowVoiceRecorder(false);
  };

  // Handle voice note cancel
  const handleVoiceCancel = () => {
    setShowVoiceRecorder(false);
  };

  return (
    <div className="border-t border-line bg-surface-200 p-4">
      {/* Voice recorder modal */}
      {showVoiceRecorder && (
        <div className="mb-4">
          <VoiceNoteRecorder
            onSend={handleVoiceSend}
            onCancel={handleVoiceCancel}
            maxDuration={60}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji/Attachment buttons */}
        <div className="flex gap-1">
          <button
            type="button"
            disabled={disabled}
            className="p-2 text-ink-muted hover:bg-surface-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add emoji"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          <button
            type="button"
            disabled={disabled}
            className="p-2 text-ink-muted hover:bg-surface-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          </button>

          {/* Voice note button - crucial for Kenyan market */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              showVoiceRecorder
                ? 'bg-red-900/30 text-red-500'
                : 'text-ink-muted hover:bg-surface-300'
            }`}
            title={showVoiceRecorder ? 'Close voice recorder' : 'Record voice message'}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
        </div>

        {/* Message textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 border border-line-strong bg-surface-300 text-ink placeholder-ink-faint rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none max-h-[150px] disabled:bg-surface-200 disabled:cursor-not-allowed"
            style={{
              minHeight: '42px',
              overflowY: 'auto',
            }}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="p-2 bg-primary text-on-lumen rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="Send message (Enter)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-ink-muted">
        Press Enter to send, Shift + Enter for new line. Voice messages up to 60 seconds.
      </div>
    </div>
  );
};

export default MessageInput;
