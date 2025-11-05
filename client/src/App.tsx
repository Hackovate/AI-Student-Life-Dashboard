import { useState } from 'react';
import { ThemeProvider } from './components/theme-provider';
import { AppProvider } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/useAuth';
import { Toaster } from './components/ui/sonner';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { Dashboard } from './components/pages/Dashboard';
import { PersonalizedAssistant } from './components/pages/PersonalizedAssistant';
import { DailyPlanner } from './components/pages/DailyPlanner';
import { Academics } from './components/pages/Academics';
import { Skills } from './components/pages/Skills';
import { Finances } from './components/pages/Finances';
import { Lifestyle } from './components/pages/Lifestyle';
import { Journal } from './components/pages/Journal';
import { Analytics } from './components/pages/Analytics';
import AuthPage from './components/pages/AuthPage';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'assistant':
        return <PersonalizedAssistant />;
      case 'planner':
        return <DailyPlanner />;
      case 'academics':
        return <Academics />;
      case 'skills':
        return <Skills />;
      case 'finances':
        return <Finances />;
      case 'lifestyle':
        return <Lifestyle />;
      case 'journal':
        return <Journal />;
      case 'analytics':
        return <Analytics />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Navbar */}
        <TopNavbar onNavigateToAssistant={() => setActiveSection('assistant')} />
        
        {/* Page Content */}
        <main className="p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ai-student-theme">
      <AuthProvider>
        <AppProvider>
          <AppContent />
          <Toaster />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
