import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, Loader2, Trash2, AlertTriangle, Settings } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { aiChatAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useNotifications } from '@/lib/NotificationContext';
import { ContextWindow } from '../modals/ContextWindow';
import { useAuth } from '@/lib/useAuth';

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
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
      <strong key={key++} className="font-semibold">
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

// Message Bubble Component
function MessageBubble({ msg }: { msg: Message }) {
  const isLongMessage = msg.content.length > 300;
  const [isExpanded, setIsExpanded] = useState(!isLongMessage);
  
  const displayContent = isLongMessage && !isExpanded 
    ? `${msg.content.substring(0, 300)}...` 
    : msg.content;
  
  return (
    <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${msg.type === 'user' ? 'flex flex-col items-end' : ''}`}>
        {msg.type === 'ai' && (
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-medium text-foreground">AI Assistant</span>
          </div>
        )}
        <div
          className={`rounded-lg px-4 py-3 transition-all ${
            msg.type === 'user'
              ? 'bg-primary text-primary-foreground rounded-br-md shadow-md'
              : 'bg-card border border-border text-foreground rounded-bl-md shadow-sm hover:shadow-md'
          }`}
        >
          <div className="prose prose-sm max-w-none">
            <p className={`text-sm leading-relaxed ${msg.type === 'user' ? 'text-primary-foreground' : 'text-foreground'} whitespace-pre-wrap break-words`}>
              {parseMarkdown(displayContent)}
            </p>
            {isLongMessage && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`mt-2 text-xs font-medium underline hover:no-underline transition-all ${
                  msg.type === 'user' ? 'text-primary-foreground/80 hover:text-primary-foreground' : 'text-primary hover:text-primary/80'
                }`}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
        <span className={`text-xs text-muted-foreground mt-1.5 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
          {msg.timestamp}
        </span>
      </div>
    </div>
  );
}

const getChatStorageKey = (userId: string | undefined): string | null => {
  if (!userId) return null;
  return `momentum_ai_chat_history_${userId}`;
};

const getInitialMessages = (userId: string | undefined): Message[] => {
  if (!userId) {
    return [
      {
        id: 1,
        type: 'ai',
        content: "Hello! I'm your AI Student Life Assistant. I can help you manage tasks, plan your day, track expenses, and much more. How can I assist you today?",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }
    ];
  }

  const storageKey = getChatStorageKey(userId);
  if (!storageKey) {
    return [
      {
        id: 1,
        type: 'ai',
        content: "Hello! I'm your AI Student Life Assistant. I can help you manage tasks, plan your day, track expenses, and much more. How can I assist you today?",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      }
    ];
  }

  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error loading chat history:', e);
    }
  }
  return [
    {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Student Life Assistant. I can help you manage tasks, plan your day, track expenses, and much more. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
  ];
};

export function PersonalizedAssistant() {
  const { addNotification, fetchNotifications, refreshUnreadCount } = useNotifications();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => getInitialMessages(user?.id));
  const [loading, setLoading] = useState(false);
  const [contextWindowOpen, setContextWindowOpen] = useState(false);
  const [clearChatDialogOpen, setClearChatDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle user changes - load their chat history or reset
  useEffect(() => {
    if (user?.id) {
      const userMessages = getInitialMessages(user.id);
      setMessages(userMessages);
    } else {
      // User logged out - reset to initial message
      const initialMessage: Message = {
        id: 1,
        type: 'ai',
        content: "Hello! I'm your AI Student Life Assistant. I can help you manage tasks, plan your day, track expenses, and much more. How can I assist you today?",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      };
      setMessages([initialMessage]);
    }
  }, [user?.id]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const storageKey = getChatStorageKey(user.id);
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    }
  }, [messages, user?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = () => {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleClearChat = () => {
    setClearChatDialogOpen(true);
  };

  const confirmClearChat = () => {
    const initialMessage: Message = {
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI Student Life Assistant. I can help you manage tasks, plan your day, track expenses, and much more. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };
    setMessages([initialMessage]);
    const storageKey = getChatStorageKey(user?.id);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setClearChatDialogOpen(false);
    toast.success('Chat history cleared');
  };

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: formatTime()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage('');
    setLoading(true);

    try {
      // Build conversation history for context (include all previous messages)
      const conversationHistory = messages
        .filter(m => m.type === 'ai' || m.type === 'user')
        .map(m => ({
          role: m.type === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content
        }));

      // Call API (current message is sent separately, history is for context)
      const response = await aiChatAPI.chat(currentMessage, conversationHistory);

      if (response.success && response.data) {
        const aiMessage: Message = {
          id: Date.now() + 1,
          type: 'ai',
          content: response.data.response,
          timestamp: formatTime()
        };
        setMessages(prev => [...prev, aiMessage]);

        // Check action results from backend (more reliable than checking actions)
        if (response.data.actionResults && response.data.actionResults.length > 0) {
          // Process skill results
          const skillResults = response.data.actionResults.filter((result: any) => result.type === 'add_skill' || result.type === 'update_skill');
          if (skillResults.length > 0) {
            const successfulSkills = skillResults.filter((r: any) => r.success);
            const failedSkills = skillResults.filter((r: any) => !r.success);
            if (successfulSkills.length > 0) {
              window.dispatchEvent(new CustomEvent('skillCreated', { 
                detail: { skills: successfulSkills.map((r: any) => r.data?.skillName || 'skill') } 
              }));
              successfulSkills.forEach((result: any) => {
                const skillName = result.data?.skillName || 'skill';
                const actionVerb = result.type === 'update_skill' ? 'updated' : 'created';
                toast.success(`Skill '${skillName}' ${actionVerb} successfully!`);
                
                // Create detailed notification
                const notificationMessage = `Skill "${skillName}" ${actionVerb} with milestones and resources`;
                addNotification('success', notificationMessage, 'AI Assistant', result.type);
              });
            }
            failedSkills.forEach((result: any) => {
              const errorMessage = `Failed to ${result.type === 'update_skill' ? 'update' : 'create'} skill: ${result.error || 'Unknown error'}`;
              toast.error(errorMessage);
              addNotification('error', errorMessage, 'AI Assistant', 'skill_process_failed');
            });
          }

          // Process finance results
          const financeResults = response.data.actionResults.filter((result: any) => 
            ['add_expense', 'add_income', 'add_savings_goal', 'update_savings_goal', 'delete_finance'].includes(result.type)
          );
          if (financeResults.length > 0) {
            const successful = financeResults.filter((r: any) => r.success);
            const failed = financeResults.filter((r: any) => !r.success);
            if (successful.length > 0) {
              window.dispatchEvent(new CustomEvent('financeCreated', { 
                detail: { actions: successful.map((r: any) => r.type) } 
              }));
              successful.forEach((result: any) => {
                const actionLabels: Record<string, string> = {
                  'add_expense': 'Expense',
                  'add_income': 'Income',
                  'add_savings_goal': 'Savings goal',
                  'update_savings_goal': 'Savings goal',
                  'delete_finance': 'Transaction'
                };
                const actionLabel = actionLabels[result.type] || 'Finance';
                const actionVerb = result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added';
                toast.success(`${actionLabel} ${actionVerb} successfully!`);
                
                // Create detailed notification
                let notificationMessage = '';
                if (result.type === 'add_expense' || result.type === 'update_expense') {
                  const amount = result.data?.amount || 'N/A';
                  const category = result.data?.category || 'Unknown';
                  const description = result.data?.description ? ` for ${result.data.description}` : '';
                  notificationMessage = `Expense of ${amount} ${result.type === 'update_expense' ? 'updated' : 'added'}${description} (${category})`;
                } else if (result.type === 'add_income' || result.type === 'update_income') {
                  const amount = result.data?.amount || 'N/A';
                  const category = result.data?.category || 'Unknown';
                  const description = result.data?.description ? ` for ${result.data.description}` : '';
                  notificationMessage = `Income of ${amount} ${result.type === 'update_income' ? 'updated' : 'recorded'}${description} (${category})`;
                } else if (result.type === 'add_savings_goal' || result.type === 'update_savings_goal') {
                  const title = result.data?.goalTitle || 'Savings goal';
                  const amount = result.data?.targetAmount || 'N/A';
                  notificationMessage = `Savings goal "${title}" ${result.type === 'update_savings_goal' ? 'updated' : 'added'} with target of ${amount}`;
                } else if (result.type === 'delete_finance') {
                  const amount = result.data?.amount || 'N/A';
                  const category = result.data?.category || 'Unknown';
                  const description = result.data?.description ? ` for ${result.data.description}` : '';
                  notificationMessage = `Transaction of ${amount}${description} (${category}) deleted`;
                } else {
                  notificationMessage = `${actionLabel} ${actionVerb} successfully`;
                }
                
                addNotification('success', notificationMessage, 'AI Assistant', result.type);
              });
            }
            failed.forEach((result: any) => {
              toast.error(`Failed to process finance action: ${result.error || 'Unknown error'}`);
            });
          }

          // Process journal results
          const journalResults = response.data.actionResults.filter((result: any) => 
            ['add_journal', 'update_journal', 'delete_journal'].includes(result.type)
          );
          if (journalResults.length > 0) {
            const successful = journalResults.filter((r: any) => r.success);
            const failed = journalResults.filter((r: any) => !r.success);
            if (successful.length > 0) {
              window.dispatchEvent(new CustomEvent('journalCreated', { 
                detail: { actions: successful.map((r: any) => r.type) } 
              }));
              successful.forEach((result: any) => {
                const actionVerb = result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added';
                toast.success(`Journal entry ${actionVerb} successfully!`);
                
                // Create detailed notification
                let notificationMessage = '';
                const title = result.data?.title || 'Journal entry';
                if (result.type === 'add_journal' || result.type === 'update_journal') {
                  const mood = result.data?.mood ? ` (${result.data.mood} mood)` : '';
                  notificationMessage = `Journal entry "${title}" ${result.type === 'update_journal' ? 'updated' : 'added'}${mood}`;
                } else if (result.type === 'delete_journal') {
                  notificationMessage = `Journal entry "${title}" deleted`;
                } else {
                  notificationMessage = `Journal entry ${actionVerb} successfully`;
                }
                
                addNotification('success', notificationMessage, 'AI Assistant', result.type);
              });
            }
            failed.forEach((result: any) => {
              toast.error(`Failed to process journal action: ${result.error || 'Unknown error'}`);
            });
          }

          // Process assignment results
          const assignmentResults = response.data.actionResults.filter((result: any) => 
            ['add_assignment', 'update_assignment', 'delete_assignment'].includes(result.type)
          );
          if (assignmentResults.length > 0) {
            const successful = assignmentResults.filter((r: any) => r.success);
            const failed = assignmentResults.filter((r: any) => !r.success);
            if (successful.length > 0) {
              window.dispatchEvent(new CustomEvent('assignmentCreated', { 
                detail: { assignments: successful.map((r: any) => r.data) } 
              }));
              successful.forEach((result: any) => {
                const actionVerb = result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added';
                toast.success(`Assignment ${actionVerb} successfully!`);
                
                // Create detailed notification
                let notificationMessage = '';
                if (result.type === 'add_assignment' || result.type === 'update_assignment') {
                  const title = result.data?.title || 'Assignment';
                  const courseName = result.data?.course?.courseName || result.data?.courseName || '';
                  const courseInfo = courseName ? ` for ${courseName}` : '';
                  notificationMessage = `Assignment "${title}" ${result.type === 'update_assignment' ? 'updated' : 'added'}${courseInfo}`;
                } else if (result.type === 'delete_assignment') {
                  const title = result.data?.title || 'Assignment';
                  const courseName = result.data?.courseName || '';
                  const courseInfo = courseName ? ` for ${courseName}` : '';
                  notificationMessage = `Assignment "${title}" deleted${courseInfo}`;
                } else {
                  notificationMessage = `Assignment ${actionVerb} successfully`;
                }
                
                addNotification('success', notificationMessage, 'AI Assistant', result.type);
              });
            }
            failed.forEach((result: any) => {
              const errorMessage = `Failed to process assignment: ${result.error || 'Unknown error'}`;
              toast.error(errorMessage);
              addNotification('error', errorMessage, 'AI Assistant', 'assignment_process_failed');
            });
          }

          // Process lifestyle results
          const lifestyleResults = response.data.actionResults.filter((result: any) => 
            ['add_lifestyle', 'update_lifestyle', 'delete_lifestyle'].includes(result.type)
          );
          if (lifestyleResults.length > 0) {
            const successful = lifestyleResults.filter((r: any) => r.success);
            const failed = lifestyleResults.filter((r: any) => !r.success);
            if (successful.length > 0) {
              window.dispatchEvent(new CustomEvent('lifestyleCreated', { 
                detail: { actions: successful.map((r: any) => r.type) } 
              }));
              successful.forEach((result: any) => {
                const actionVerb = result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added';
                toast.success(`Lifestyle record ${actionVerb} successfully!`);
                
                // Create detailed notification
                let notificationMessage = '';
                if (result.type === 'add_lifestyle' || result.type === 'update_lifestyle') {
                  const sleep = result.data?.sleepHours ? `${result.data.sleepHours}h sleep` : '';
                  const exercise = result.data?.exerciseMinutes ? `${result.data.exerciseMinutes}min exercise` : '';
                  const meal = result.data?.mealQuality || '';
                  const parts = [sleep, exercise, meal].filter(Boolean);
                  const details = parts.length > 0 ? `: ${parts.join(', ')}` : '';
                  notificationMessage = `Lifestyle record ${result.type === 'update_lifestyle' ? 'updated' : 'added'}${details}`;
                } else if (result.type === 'delete_lifestyle') {
                  notificationMessage = 'Lifestyle record deleted';
                } else {
                  notificationMessage = `Lifestyle record ${actionVerb} successfully`;
                }
                
                addNotification('success', notificationMessage, 'AI Assistant', result.type);
              });
            }
            failed.forEach((result: any) => {
              toast.error(`Failed to process lifestyle action: ${result.error || 'Unknown error'}`);
            });
          }

          // Process habit results
          const habitResults = response.data.actionResults.filter((result: any) => 
            ['add_habit', 'update_habit', 'delete_habit', 'toggle_habit'].includes(result.type)
          );
          if (habitResults.length > 0) {
            const successful = habitResults.filter((r: any) => r.success);
            const failed = habitResults.filter((r: any) => !r.success);
            if (successful.length > 0) {
              window.dispatchEvent(new CustomEvent('habitCreated', { 
                detail: { actions: successful.map((r: any) => r.type) } 
              }));
              successful.forEach((result: any) => {
                if (result.type === 'toggle_habit') {
                  toast.success(`Habit marked as ${result.data?.completed ? 'completed' : 'incomplete'}!`);
                } else {
                  const actionVerb = result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added';
                  toast.success(`Habit ${actionVerb} successfully!`);
                }
                
                // Create detailed notification
                let notificationMessage = '';
                const habitName = result.data?.habitName || 'Habit';
                if (result.type === 'toggle_habit') {
                  notificationMessage = `Habit "${habitName}" marked as ${result.data?.completed ? 'completed' : 'incomplete'}`;
                } else if (result.type === 'add_habit' || result.type === 'update_habit') {
                  notificationMessage = `Habit "${habitName}" ${result.type === 'update_habit' ? 'updated' : 'added'}`;
                } else if (result.type === 'delete_habit') {
                  notificationMessage = `Habit "${habitName}" deleted`;
                } else {
                  notificationMessage = `Habit ${result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added'} successfully`;
                }
                
                addNotification('success', notificationMessage, 'AI Assistant', result.type);
              });
            }
            failed.forEach((result: any) => {
              toast.error(`Failed to process habit action: ${result.error || 'Unknown error'}`);
            });
          }
        } else if (response.data.actions && response.data.actions.length > 0) {
          // Fallback: check actions if actionResults not available
          const skillActions = response.data.actions.filter((action: any) => action.type === 'add_skill');
          if (skillActions.length > 0) {
            window.dispatchEvent(new CustomEvent('skillCreated', { 
              detail: { skills: skillActions.map((a: any) => a.data.name) } 
            }));
            skillActions.forEach((action: any) => {
              toast.success(`Skill '${action.data.name}' created successfully!`);
            });
          }
        }
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error.message || 'Failed to send message. Please try again.';
      toast.error(errorMessage);
      
      // Only remove user message on network/timeout errors, not on other errors
      // This way the user can see what they sent even if there was an error
      if (errorMessage.includes('timeout') || errorMessage.includes('Network')) {
        // Keep the user message but add an error message
        const errorMsg: Message = {
          id: Date.now() + 2,
          type: 'ai',
          content: `⚠️ Error: ${errorMessage}. The skill creation may still be processing. Please check the Skills section.`,
          timestamp: formatTime()
        };
        setMessages(prev => [...prev, errorMsg]);
      } else {
        // For other errors, remove user message
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-foreground text-3xl md:text-4xl font-bold">AI Assistant</h1>
          </div>
          <p className="text-muted-foreground text-base ml-0">Intelligent support for managing your academic and personal tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setContextWindowOpen(true)}
            className="gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all"
            title="View/Edit AI Context"
          >
            <Settings className="w-4 h-4" />
            Context
          </Button>
          <Button
            variant="outline"
            onClick={handleClearChat}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div>
        {/* Chat Area */}
        <Card className="p-0 border border-border shadow-md flex flex-col" style={{ height: '600px' }}>
          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] sm:max-w-[75%]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-foreground">AI Assistant</span>
                      </div>
                      <div className="rounded-lg rounded-bl-md px-4 py-3 bg-card border border-border shadow-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-foreground">Processing...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="resize-none min-h-[70px] max-h-[120px] border-border focus:border-primary focus:ring-primary/20 bg-background rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={loading || !message.trim()}
                className="flex-shrink-0 h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>


      {/* Context Window Modal */}
      <ContextWindow
        open={contextWindowOpen}
        onOpenChange={setContextWindowOpen}
      />

      {/* Clear Chat Alert Dialog */}
      <AlertDialog open={clearChatDialogOpen} onOpenChange={setClearChatDialogOpen}>
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Clear Chat History?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Are you sure you want to clear all chat messages? This action cannot be undone and you will lose all conversation history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted/50 rounded-lg p-4 mt-4 border border-destructive/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> This will only clear your local chat history. Your AI context and saved data will remain intact.
            </p>
          </div>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
