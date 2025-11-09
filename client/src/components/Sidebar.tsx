import { 
  LayoutDashboard, 
  Calendar, 
  GraduationCap, 
  Lightbulb, 
  Wallet, 
  Heart, 
  BookOpen, 
  BarChart3,
  Sparkles,
  User,
  LogOut
} from 'lucide-react';
import { cn } from './ui/utils';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assistant', label: 'Assistant', icon: Sparkles },
    { id: 'planner', label: 'Daily Planner', icon: Calendar },
    { id: 'academics', label: 'Academics', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Lightbulb },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'lifestyle', label: 'Habit', icon: Heart },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const footerItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border bg-card/50 flex items-center justify-center">
        <img src="/Full Logo.svg" alt="Momentum Logo" className="h-20 w-auto object-contain" />
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  isActive ? "text-primary-foreground" : "text-sidebar-foreground group-hover:text-sidebar-primary"
                )} />
                <span className={cn(
                  "font-medium",
                  isActive ? "text-primary-foreground" : "text-sidebar-foreground group-hover:text-sidebar-primary"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-primary-foreground animate-pulse"></div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border bg-card/50">
        <div className="space-y-2">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-all duration-200 group"
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span className="text-sm font-medium group-hover:text-sidebar-primary">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
