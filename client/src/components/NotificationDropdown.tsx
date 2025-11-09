import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { useNotifications, Notification } from '../lib/NotificationContext';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { NotificationSummaryModal } from './modals/NotificationSummaryModal';
import { NotificationDetailModal } from './modals/NotificationDetailModal';
import { notificationsAPI } from '../lib/api';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <Info className="w-4 h-4" />;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const truncateMessage = (message: string, maxLength: number = 120): string => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength).trim() + '...';
};

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteNotification,
    summarizeNotifications,
    refreshUnreadCount,
    fetchNotifications,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryNotificationIds, setSummaryNotificationIds] = useState<string[]>([]);

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteNotification(id);
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailModalOpen(true);
    // Mark as read when clicked
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleSummarize = async () => {
    try {
      setSummaryLoading(true);
      const result = await summarizeNotifications();
      setSummary(result.summary);
      setSummaryNotificationIds(result.notificationIds);
      
      // Delete notifications immediately after getting summary
      if (result.notificationIds && result.notificationIds.length > 0) {
        try {
          console.log('Deleting notifications:', result.notificationIds);
          const deleteResult = await notificationsAPI.bulkDelete(result.notificationIds);
          console.log('Delete result:', deleteResult);
          
          // Force refresh notifications and unread count
          await fetchNotifications();
          await refreshUnreadCount();
          
          // Also close dropdown to show updated state
          setIsOpen(false);
        } catch (error: any) {
          console.error('Error deleting summarized notifications:', error);
          // Still show summary even if deletion fails
        }
      } else {
        console.warn('No notification IDs to delete');
      }
      
      setIsSummaryModalOpen(true);
    } catch (error: any) {
      console.error('Error summarizing notifications:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSummaryModalClose = () => {
    setIsSummaryModalOpen(false);
    // Notifications are already deleted, just close the dropdown
    setIsOpen(false);
  };

  // Mark all as read when dropdown opens
  useEffect(() => {
    if (isOpen) {
      notifications
        .filter(n => !n.read)
        .forEach(n => markAsRead(n.id));
    }
  }, [isOpen, notifications, markAsRead]);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="relative p-2.5 hover:bg-muted rounded-lg transition-all hover:scale-105"
            aria-label="View notifications"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card"></span>
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-96 p-0">
          <div className="flex flex-col max-h-[600px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              {notifications.length > 0 && (
                <Button
                  onClick={handleSummarize}
                  disabled={summaryLoading}
                  size="sm"
                  variant="ghost"
                  className="gap-2 h-8"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {summaryLoading ? '...' : 'Summarize'}
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div 
              className="overflow-y-auto overflow-x-hidden"
              style={{ 
                height: '280px',
                maxHeight: '280px'
              }}
            >
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-muted/50 transition-colors group cursor-pointer ${
                        !notification.read ? 'bg-muted/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          {notification.title && (
                            <h4 className="font-medium text-sm text-foreground mb-1 line-clamp-1">
                              {notification.title}
                            </h4>
                          )}
                          <p className="text-sm text-muted-foreground mb-1 line-clamp-3">
                            {truncateMessage(notification.message, 120)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatTimestamp(notification.createdAt)}</span>
                            {notification.source && (
                              <>
                                <span>•</span>
                                <span>{notification.source}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDismiss(notification.id, e)}
                          className="p-1 hover:bg-muted rounded transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                          aria-label="Dismiss notification"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <NotificationSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={handleSummaryModalClose}
        summary={summary}
        loading={summaryLoading}
      />

      <NotificationDetailModal
        open={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedNotification(null);
        }}
        notification={selectedNotification}
      />
    </>
  );
}

