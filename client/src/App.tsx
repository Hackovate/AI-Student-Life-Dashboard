import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { AppProvider } from './lib/AppContext';
import { AuthProvider, useAuth } from './lib/useAuth';
import { NotificationProvider } from './lib/NotificationContext';
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
import { LandingPage } from './components/pages/LandingPage';
import { OnboardingPage } from './components/pages/OnboardingPage';
import AuthPage from './components/pages/AuthPage';

// Onboarding Check wrapper
function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isAuthenticated || loading) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const { onboardingAPI } = await import('./lib/api');
        const status = await onboardingAPI.getStatus();
        if (!status.data.completed) {
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [isAuthenticated, loading]);

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Main App layout
function MainLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveSection} />;
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
        return <Dashboard onNavigate={setActiveSection} />;
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

// App content with routing
function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth page */}
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Onboarding page (protected) */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        
        {/* Main dashboard (protected, checks onboarding) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OnboardingCheck>
                <MainLayout />
              </OnboardingCheck>
            </ProtectedRoute>
          }
        />
        
        {/* Redirect to auth by default */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ai-student-theme">
      <AuthProvider>
        <NotificationProvider>
          <AppProvider>
            <AppContent />
            <Toaster />
          </AppProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
