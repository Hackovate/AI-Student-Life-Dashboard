import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Sparkles, X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { aiChatAPI } from '@/lib/api';
import { toast } from 'sonner';
import { ContextWindow } from '../modals/ContextWindow';
import { Settings } from 'lucide-react';

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
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-medium text-violet-700 dark:text-violet-300">AI Assistant</span>
          </div>
        )}
        <div
          className={`rounded-lg px-4 py-3 transition-all ${
            msg.type === 'user'
              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-br-md shadow-sm'
              : 'bg-white border border-violet-200 text-gray-900 rounded-bl-md hover:shadow-md'
          }`}
        >
          <div className="prose prose-sm max-w-none">
            <p className={`text-sm leading-relaxed ${msg.type === 'user' ? 'text-white' : 'text-gray-800'} whitespace-pre-wrap break-words`}>
              {parseMarkdown(displayContent)}
            </p>
            {isLongMessage && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`mt-2 text-xs font-medium underline hover:no-underline transition-all ${
                  msg.type === 'user' ? 'text-violet-100 hover:text-white' : 'text-violet-600 hover:text-violet-700'
                }`}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </div>
        <span className={`text-xs text-gray-500 mt-1.5 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
          {msg.timestamp}
        </span>
      </div>
    </div>
  );
}

const CHAT_STORAGE_KEY = 'momentum_ai_chat_history';

const getInitialMessages = (): Message[] => {
  const saved = localStorage.getItem(CHAT_STORAGE_KEY);
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
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [loading, setLoading] = useState(false);
  const [contextWindowOpen, setContextWindowOpen] = useState(false);
  const [clearChatDialogOpen, setClearChatDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

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
    localStorage.removeItem(CHAT_STORAGE_KEY);
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
                toast.success(`Skill '${result.data?.skillName || 'skill'}' ${result.type === 'update_skill' ? 'updated' : 'created'} successfully!`);
              });
            }
            failedSkills.forEach((result: any) => {
              toast.error(`Failed to ${result.type === 'update_skill' ? 'update' : 'create'} skill: ${result.error || 'Unknown error'}`);
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
                toast.success(`${actionLabels[result.type] || 'Finance'} ${result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added'} successfully!`);
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
                toast.success(`Journal entry ${result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added'} successfully!`);
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
                const actionLabels: Record<string, string> = {
                  'add_assignment': 'Assignment',
                  'update_assignment': 'Assignment',
                  'delete_assignment': 'Assignment'
                };
                toast.success(`${actionLabels[result.type] || 'Assignment'} ${result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added'} successfully!`);
              });
            }
            failed.forEach((result: any) => {
              toast.error(`Failed to process assignment: ${result.error || 'Unknown error'}`);
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
                toast.success(`Lifestyle record ${result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added'} successfully!`);
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
                  toast.success(`Habit ${result.type.includes('delete') ? 'deleted' : result.type.includes('update') ? 'updated' : 'added'} successfully!`);
                }
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
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-violet-200">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-gray-900 text-2xl font-semibold">AI Assistant</h1>
          </div>
          <p className="text-gray-600 text-sm ml-12">Intelligent support for managing your academic and personal tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setContextWindowOpen(true)}
            className="gap-2 border-violet-300 hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700"
            title="View/Edit AI Context"
          >
            <Settings className="w-4 h-4" />
            Context
          </Button>
          <Button
            variant="outline"
            onClick={handleClearChat}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-violet-300"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="mt-4">
        {/* Chat Area */}
        <Card className="p-0 border border-violet-200 shadow-sm flex flex-col" style={{ height: '600px' }}>
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
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-sm">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-violet-700 dark:text-violet-300">AI Assistant</span>
                      </div>
                      <div className="rounded-lg rounded-bl-md px-4 py-3 bg-white border border-violet-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                          <span className="text-sm text-gray-700">Processing...</span>
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
          <div className="p-4 border-t border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950">
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-10 w-10 border-violet-300 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-700 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="resize-none min-h-[70px] max-h-[120px] border-violet-300 focus:border-violet-500 focus:ring-violet-500 bg-white rounded-lg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1.5 ml-1">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={loading || !message.trim()}
                className="flex-shrink-0 h-10 px-6 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg shadow-sm"
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
