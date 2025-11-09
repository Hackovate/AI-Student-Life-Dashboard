import { Sparkles, ChevronDown, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/lib/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { NotificationDropdown } from './NotificationDropdown';

interface TopNavbarProps {
  onNavigateToAssistant?: () => void;
}

export function TopNavbar({ onNavigateToAssistant }: TopNavbarProps) {
  const { user, logout } = useAuth();
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="h-16 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      {/* Date Display */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{today}</span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* AI Assistant Button */}
        <Button 
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
          onClick={onNavigateToAssistant}
        >
          <Sparkles className="w-4 h-4" />
          AI Assistant
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <NotificationDropdown />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="flex items-center gap-2 hover:bg-muted rounded-lg p-1.5 transition-all hover:scale-105"
              aria-label="User profile menu"
              title="Profile"
            >
              <Avatar className="w-9 h-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="w-4 h-4 text-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : 'My Account'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
