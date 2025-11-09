import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import React from 'react';

interface NotificationSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  loading: boolean;
}

// Function to parse markdown and convert to JSX
function parseMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add bold text
    parts.push(
      <strong key={key++} className="font-semibold text-foreground">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function NotificationSummaryModal({
  isOpen,
  onClose,
  summary,
  loading,
}: NotificationSummaryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header with gradient background */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Notification Summary
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                AI-generated summary of your recent notifications
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
              </div>
              <p className="mt-6 text-base font-medium text-foreground">Generating your summary...</p>
              <p className="mt-2 text-sm text-muted-foreground">This may take a few moments</p>
            </div>
          ) : summary ? (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Summary Content */}
                <div className="rounded-lg bg-muted/30 p-6 border border-border/50">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-foreground leading-relaxed text-base">
                      {parseMarkdown(summary)}
                    </div>
                  </div>
                </div>
                
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-medium text-foreground">No summary available</p>
              <p className="text-sm text-muted-foreground mt-2">There were no notifications to summarize</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <div className="flex justify-end gap-3">
            <Button 
              onClick={onClose} 
              variant="outline"
              className="min-w-[100px]"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

