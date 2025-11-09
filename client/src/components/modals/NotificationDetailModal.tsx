import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Notification } from '@/lib/NotificationContext';

interface NotificationDetailModalProps {
  open: boolean;
  onClose: () => void;
  notification: Notification | null;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
    case 'info':
      return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    default:
      return <Info className="w-5 h-5" />;
  }
};

const formatFullTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export function NotificationDetailModal({
  open,
  onClose,
  notification
}: NotificationDetailModalProps) {
  if (!notification) return null;

  // Check if this is a summary notification (daily or monthly)
  const isSummary = notification.action === 'daily_summary' || 
                    notification.action === 'monthly_summary' ||
                    notification.source === 'Daily Summary' ||
                    notification.source === 'Monthly Summary' ||
                    (notification.message && notification.message.length > 200);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getNotificationIcon(notification.type)}
            <span>Notification Details</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {/* Notification Info */}
          <div className="space-y-3 mb-4 pb-4 border-b border-border">
            {notification.title && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Title</h3>
                <p className="text-base font-medium text-foreground">{notification.title}</p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Source</h3>
              <p className="text-sm text-foreground">{notification.source || 'System'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Time</h3>
              <p className="text-sm text-foreground">{formatFullTimestamp(notification.createdAt)}</p>
            </div>
            
            {notification.action && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-1">Action</h3>
                <p className="text-sm text-foreground font-mono">{notification.action}</p>
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-h-0 flex flex-col">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              {isSummary ? (notification.source || 'Summary') : 'Message'}
            </h3>
            <ScrollArea className="flex-1 pr-4">
              <div className={`text-foreground ${isSummary ? 'prose prose-sm dark:prose-invert max-w-none' : ''}`}>
                {isSummary ? (
                  <div className="whitespace-pre-wrap">
                    {notification.message}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{notification.message}</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


