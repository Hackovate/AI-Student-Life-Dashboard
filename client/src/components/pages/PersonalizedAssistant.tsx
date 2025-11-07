import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Sparkles, CheckCircle2, Calendar, GraduationCap, Wallet, BookOpen, X, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
  linkedItems?: LinkedItem[];
}

interface LinkedItem {
  id: string;
  type: 'task' | 'note' | 'class' | 'expense';
  title: string;
  section: string;
  action: string;
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
            <span className="text-xs font-medium text-gray-600">AI Assistant</span>
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm transition-all ${
            msg.type === 'user'
              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md hover:shadow-md'
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
        <span className={`text-xs text-gray-400 mt-1.5 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
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
  const [showLinkedItems, setShowLinkedItems] = useState(true);
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [loading, setLoading] = useState(false);
  const [contextWindowOpen, setContextWindowOpen] = useState(false);
  const [clearChatDialogOpen, setClearChatDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  const allLinkedItems = messages
    .filter(msg => msg.linkedItems && msg.linkedItems.length > 0)
    .flatMap(msg => msg.linkedItems || []);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'task':
        return CheckCircle2;
      case 'note':
        return BookOpen;
      case 'class':
        return GraduationCap;
      case 'expense':
        return Wallet;
      default:
        return Calendar;
    }
  };

  const getItemColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'from-green-500 to-emerald-500';
      case 'note':
        return 'from-blue-500 to-cyan-500';
      case 'class':
        return 'from-violet-500 to-purple-500';
      case 'expense':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes('added') || action.toLowerCase().includes('scheduled')) {
      return 'bg-green-100 text-green-700';
    } else if (action.toLowerCase().includes('canceled') || action.toLowerCase().includes('removed')) {
      return 'bg-red-100 text-red-700';
    } else if (action.toLowerCase().includes('rescheduled') || action.toLowerCase().includes('updated')) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-gray-900 text-2xl">Personalized Assistant</h1>
          </div>
          <p className="text-gray-600 text-sm">Your AI-powered companion for managing student life</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setContextWindowOpen(true)}
            className="gap-2"
            title="View/Edit AI Context"
          >
            <Settings className="w-4 h-4" />
            Context
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLinkedItems(!showLinkedItems)}
            className="gap-2"
          >
            {showLinkedItems ? 'Hide' : 'Show'} Linked Items
          </Button>
          <Button
            variant="outline"
            onClick={handleClearChat}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className={`grid gap-2 ${showLinkedItems ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
        {/* Chat Area */}
        <Card className={`${showLinkedItems ? 'lg:col-span-2' : ''} p-0 border-gray-200 flex flex-col`} style={{ height: '550px' }}>
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
                        <span className="text-xs font-medium text-gray-600">AI Assistant</span>
                      </div>
                      <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                          <span className="text-sm text-gray-600">Thinking...</span>
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
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="icon"
                className="flex-shrink-0 h-10 w-10 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything... I can help with tasks, schedules, expenses, and more!"
                  className="resize-none min-h-[70px] max-h-[120px] border-gray-300 focus:border-violet-500 focus:ring-violet-500 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1.5 ml-1">
                  Press Enter to send, Shift + Enter for new line
                </p>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={loading || !message.trim()}
                className="flex-shrink-0 h-10 px-6 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all rounded-xl"
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

        {/* Linked Items Panel */}
        {showLinkedItems && (
          <Card className="p-4 border-gray-200 flex flex-col" style={{ height: '550px' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900">Linked Items</h2>
              <Badge variant="secondary">{allLinkedItems.length}</Badge>
            </div>

            {allLinkedItems.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No linked items yet</p>
                  <p className="text-xs mt-1">Items modified by AI will appear here</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pr-3 space-y-2">
                    {allLinkedItems.map((item) => {
                      const Icon = getItemIcon(item.type);
                      const gradient = getItemColor(item.type);
                      const actionColor = getActionColor(item.action);

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition-all"
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 mb-1 text-sm truncate">{item.title}</p>
                              <p className="text-gray-500 text-xs mb-2">{item.section}</p>
                              <Badge variant="secondary" className={`text-xs ${actionColor}`}>
                                {item.action}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex-shrink-0">
              <p className="text-xs text-gray-600 mb-2">Quick Actions</p>
              <div className="space-y-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300"
                >
                  Generate daily plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                >
                  Review my week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                >
                  Optimize schedule
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Capabilities Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3 border-gray-200 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-1">Smart Planning</h3>
              <p className="text-gray-600 text-sm">
                I can create, adjust, and optimize your daily schedule based on your priorities and habits.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 border-gray-200 bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-1">Academic Support</h3>
              <p className="text-gray-600 text-sm">
                Track assignments, manage study sessions, and get personalized academic insights.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 mb-1">Holistic Management</h3>
              <p className="text-gray-600 text-sm">
                Connect all aspects of student life - from finances to habits, all in one conversation.
              </p>
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
