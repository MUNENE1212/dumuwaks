import React, { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import ConversationList from '@/components/messaging/ConversationList';
import ChatWindow from '@/components/messaging/ChatWindow';
import { Conversation } from '@/types';

const Messages: React.FC = () => {
  const { currentConversation, unreadCount } = useAppSelector((state) => state.messaging);
  const [showMobileList, setShowMobileList] = useState(true);

  const handleSelectConversation = (conversation: Conversation) => {
    setShowMobileList(false);
  };

  const handleBackToList = () => {
    setShowMobileList(true);
  };

  return (
    <div className="w-full h-[100vh] md:h-screen flex flex-col">
      {/* Page Header */}
      <div className="bg-surface-200 border-b border-line px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-ink">Messages</h1>
            <p className="text-xs md:text-sm text-ink-muted">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>

          {/* Mobile back button */}
          {!showMobileList && (
            <button
              onClick={handleBackToList}
              className="md:hidden p-2 text-ink-muted hover:bg-surface-300 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List - Desktop: always visible, Mobile: toggle */}
        <div className={`${showMobileList ? 'block' : 'hidden'} md:block w-full md:w-96 flex-shrink-0`}>
          <ConversationList
            onSelectConversation={handleSelectConversation}
            filterBookingsOnly={false}
          />
        </div>

        {/* Chat Window - Desktop: always visible, Mobile: toggle */}
        <div className={`${!showMobileList ? 'block' : 'hidden'} md:block flex-1`}>
          <ChatWindow conversation={currentConversation} />
        </div>
      </div>
    </div>
  );
};

export default Messages;
