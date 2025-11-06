import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Target, TrendingUp, Calendar, Wallet, Brain, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Planning',
      description: 'Get personalized daily schedules and recommendations powered by advanced AI'
    },
    {
      icon: BookOpen,
      title: 'Academic Tracking',
      description: 'Manage courses, assignments, exams, and track your academic progress'
    },
    {
      icon: Target,
      title: 'Skill Development',
      description: 'Set goals, track milestones, and build new skills with structured learning paths'
    },
    {
      icon: Wallet,
      title: 'Finance Management',
      description: 'Track expenses, set budgets, and achieve your savings goals'
    },
    {
      icon: Calendar,
      title: 'Daily Planner',
      description: 'Organize your day with smart task management and time tracking'
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Insights',
      description: 'Get comprehensive insights into your productivity and performance'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Momentum</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 dark:bg-violet-900/30 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
              AI-Powered Student Productivity Platform
            </span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Your Personal
            <span className="block bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              AI Student Assistant
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Organize your academics, develop skills, manage finances, and boost productivity with 
            intelligent AI-powered insights and personalized recommendations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform designed to help students excel in academics, skills, and life
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-6 border-border bg-card hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 border-border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
              Why Choose Momentum?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Smart AI Recommendations</h3>
                  <p className="text-sm text-muted-foreground">
                    Get personalized suggestions based on your learning patterns and goals
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">All-in-One Platform</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage academics, skills, finances, and lifestyle in one place
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Real-Time Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    Track your progress with comprehensive insights and visualizations
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Secure & Private</h3>
                  <p className="text-sm text-muted-foreground">
                    Your data is encrypted and secure. Privacy is our priority
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="p-8 md:p-12 text-center border-border bg-card">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Student Life?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already using Momentum to achieve their goals
          </p>
          <Button size="lg" className="text-lg px-8" onClick={() => navigate('/auth')}>
            Start Your Journey Today
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">Momentum</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Momentum. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

