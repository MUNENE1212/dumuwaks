/**
 * Background Sync Utilities for Dumuwaks PWA
 *
 * This module handles background synchronization for critical actions like
 * bookings and messages when the device comes back online.
 */

interface SyncData {
  type: 'booking' | 'message' | 'post' | 'review';
  data: any;
  timestamp: number;
  retryCount?: number;
}

class BackgroundSyncQueue {
  private queue: SyncData[] = [];
  private readonly QUEUE_STORAGE_KEY = 'pwa-sync-queue';
  private readonly MAX_RETRY_COUNT = 3;

  constructor() {
    this.loadQueue();
    this.setupSyncListener();
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Setup sync event listener for when connection is restored
   */
  private setupSyncListener(): void {
    window.addEventListener('online', () => {
      this.processQueue();
    });

    // Also try to process on page load
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Add item to sync queue
   */
  async addBooking(bookingData: any): Promise<void> {
    const syncItem: SyncData = {
      type: 'booking',
      data: bookingData,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(syncItem);
    this.saveQueue();

    // Try to register service worker sync if supported
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-booking');
      } catch (error) {
        console.error('Background sync registration failed:', error);
        // Fallback: process immediately if online
        if (navigator.onLine) {
          this.processQueue();
        }
      }
    }
  }

  /**
   * Add message to sync queue
   */
  async addMessage(messageData: any): Promise<void> {
    const syncItem: SyncData = {
      type: 'message',
      data: messageData,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(syncItem);
    this.saveQueue();

    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-message');
      } catch (error) {
        console.error('Background sync registration failed:', error);
        if (navigator.onLine) {
          this.processQueue();
        }
      }
    }
  }

  /**
   * Add post to sync queue
   */
  async addPost(postData: any): Promise<void> {
    const syncItem: SyncData = {
      type: 'post',
      data: postData,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(syncItem);
    this.saveQueue();

    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-post');
      } catch (error) {
        console.error('Background sync registration failed:', error);
        if (navigator.onLine) {
          this.processQueue();
        }
      }
    }
  }

  /**
   * Process the queue - try to sync all pending items
   */
  private async processQueue(): Promise<void> {
    if (!navigator.onLine || this.queue.length === 0) {
      return;
    }

    const failedItems: SyncData[] = [];

    for (const item of this.queue) {
      try {
        await this.syncItem(item);
      } catch (error) {
        console.error(`Failed to sync ${item.type}:`, error);

        // Increment retry count
        item.retryCount = (item.retryCount || 0) + 1;

        // Keep item if under max retry count
        if (item.retryCount < this.MAX_RETRY_COUNT) {
          failedItems.push(item);
        }
      }
    }

    // Update queue with only failed items
    this.queue = failedItems;
    this.saveQueue();
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncData): Promise<void> {
    const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

    switch (item.type) {
      case 'booking':
        await fetch(`${API_BASE}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${item.data.token}`
          },
          body: JSON.stringify(item.data.payload)
        });
        break;

      case 'message':
        await fetch(`${API_BASE}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${item.data.token}`
          },
          body: JSON.stringify(item.data.payload)
        });
        break;

      case 'post':
        await fetch(`${API_BASE}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${item.data.token}`
          },
          body: JSON.stringify(item.data.payload)
        });
        break;

      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { pending: number; items: SyncData[] } {
    return {
      pending: this.queue.length,
      items: this.queue
    };
  }

  /**
   * Clear queue (useful for logout)
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }
}

// Export singleton instance
export const backgroundSyncQueue = new BackgroundSyncQueue();

/**
 * Helper function to check if online
 */
export const isOnline = (): boolean => navigator.onLine;

/**
 * Helper function to queue action if offline
 */
export const queueIfOffline = async (
  action: () => Promise<void>,
  fallback?: { type: 'booking' | 'message' | 'post'; data: any }
): Promise<void> => {
  if (navigator.onLine) {
    try {
      await action();
    } catch (error) {
      // If action fails and we have fallback, queue it
      if (fallback) {
        if (fallback.type === 'booking') {
          await backgroundSyncQueue.addBooking(fallback.data);
        } else if (fallback.type === 'message') {
          await backgroundSyncQueue.addMessage(fallback.data);
        } else if (fallback.type === 'post') {
          await backgroundSyncQueue.addPost(fallback.data);
        }
      }
      throw error;
    }
  } else if (fallback) {
    // Queue for later sync
    if (fallback.type === 'booking') {
      await backgroundSyncQueue.addBooking(fallback.data);
    } else if (fallback.type === 'message') {
      await backgroundSyncQueue.addMessage(fallback.data);
    } else if (fallback.type === 'post') {
      await backgroundSyncQueue.addPost(fallback.data);
    }
  } else {
    throw new Error('Device is offline and no fallback sync data provided');
  }
};
