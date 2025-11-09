import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Calendar, 
  Wallet, 
  Brain, 
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Menu,
  X,
  Check,
  ArrowUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '../ui/accordion';
import { Input } from '../ui/input';

export function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [currency, setCurrency] = useState<'USD' | 'BDT'>('USD');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const benefits = [
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

  const howItWorks = [
    {
      step: '1',
      title: 'Sign Up Free',
      description: 'Create your account in seconds. No credit card required.'
    },
    {
      step: '2',
      title: 'Complete Onboarding',
      description: 'Tell us about your goals and preferences through our AI-powered chat.'
    },
    {
      step: '3',
      title: 'Start Achieving',
      description: 'Get personalized recommendations and start tracking your progress.'
    }
  ];

  // Feature comparison data based on the feature gating table
  const features = [
    {
      name: 'AI Daily Planner',
      free: 'Limited (3/day)',
      pro: 'Unlimited',
      campus: 'Shared planning templates'
    },
    {
      name: 'Academic Tracker',
      free: 'Manual',
      pro: 'Auto-schedule + reminders',
      campus: 'Shared class tracking'
    },
    {
      name: 'Academic Syllabus & Study Plan Generation',
      free: 'Limited (1 time per account)',
      pro: 'Unlimited',
      campus: 'Shared templates'
    },
    {
      name: 'AI Chat Assistant',
      free: '10 messages/day',
      pro: '100 messages/day (10x)',
      campus: 'Unlimited + team chat'
    },
    {
      name: 'Skill Development',
      free: 'Limited (1 generation per account)',
      pro: 'Unlimited AI generation',
      campus: 'Group skill goals'
    },
    {
      name: 'Expense Tracker',
      free: 'Manual only',
      pro: 'Auto-category',
      campus: 'Shared budgets'
    },
    {
      name: 'Habit Tracker',
      free: '3 habits',
      pro: 'Unlimited',
      campus: 'Team wellness tracking'
    },
    {
      name: 'Journal & Reflection',
      free: 'Manual',
      pro: 'AI summaries',
      campus: 'Anonymous sentiment reports'
    },
    {
      name: 'AI Summary Dashboard',
      free: 'Daily summary only',
      pro: 'Daily + Monthly summaries',
      campus: 'Department-level insights'
    },
    {
      name: 'Notification Summary',
      free: null,
      pro: 'Available',
      campus: 'Team notifications'
    },
    {
      name: 'Embeddings Personalization',
      free: null,
      pro: 'Basic',
      campus: 'Shared embeddings for tutoring'
    },
    {
      name: 'Integrations (Calendar, Notion, Google)',
      free: null,
      pro: 'Available',
      campus: 'Org-level API'
    },
    {
      name: 'PWA Support',
      free: 'Available',
      pro: 'Available',
      campus: 'Available'
    }
  ];

  // Calculate pricing
  const getProPrice = () => {
    if (currency === 'BDT') {
      // Bangladesh pricing: 500 taka monthly, 300 taka first month, 15% annual discount
      if (billingPeriod === 'annual') {
        const monthlyPrice = 500;
        const annualPrice = monthlyPrice * 12;
        const discount = annualPrice * 0.15;
        return {
          monthly: (annualPrice - discount) / 12,
          annual: annualPrice - discount,
          originalAnnual: annualPrice,
          discountPercent: 15
        };
      } else {
        return {
          monthly: 500,
          firstMonth: 300,
          annual: null,
          originalAnnual: null,
          discountPercent: null
        };
      }
    } else {
      // USD pricing: $12 monthly, $6 first month, annual discounted to $10/month
      if (billingPeriod === 'annual') {
        const monthlyPrice = 12;
        const annualPrice = monthlyPrice * 12; // $144/year
        const discountedMonthly = 10;
        const discountedAnnual = discountedMonthly * 12; // $120/year
        const discount = annualPrice - discountedAnnual; // $24
        // Calculate discount percentage: (discount / original) * 100
        const discountPercent = Math.round((discount / annualPrice) * 100); // 24/144 = 16.67% ≈ 17%
        return {
          monthly: discountedMonthly,
          annual: discountedAnnual,
          originalAnnual: annualPrice,
          discountPercent: discountPercent
        };
      } else {
        return {
          monthly: 12,
          firstMonth: 6,
          annual: null,
          originalAnnual: null,
          discountPercent: null
        };
      }
    }
  };

  const proPricing = getProPrice();

  const pricingPlans = [
    {
      name: 'Free',
      price: 'Free',
      period: 'forever',
      monthlyPrice: 0,
      annualPrice: 0,
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: 'Pro',
      period: billingPeriod === 'monthly' ? 'month' : 'year',
      monthlyPrice: proPricing.monthly,
      annualPrice: proPricing.annual,
      originalAnnual: proPricing.originalAnnual,
      firstMonth: proPricing.firstMonth,
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Campus',
      price: 'Custom',
      period: 'contact',
      monthlyPrice: null,
      annualPrice: null,
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const faqs = [
    {
      question: 'Is Momentum really free?',
      answer: 'Yes! Our Starter plan is completely free forever. You get access to basic task management, academic tracking, and basic analytics. No credit card required.'
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Absolutely! You can cancel your subscription at any time from your account settings. There are no cancellation fees, and you\'ll continue to have access until the end of your billing period.'
    },
    {
      question: 'How does the AI assistant work?',
      answer: 'Our AI assistant learns from your usage patterns, goals, and preferences. It provides personalized recommendations for your daily schedule, study habits, and productivity improvements. The more you use Momentum, the better it gets at understanding your needs.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, security is our top priority. All your data is encrypted in transit and at rest. We never share your personal information with third parties, and you can export or delete your data at any time.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Yes, we offer a 30-day money-back guarantee for all paid plans. If you\'re not satisfied with Momentum, contact us within 30 days of your purchase for a full refund.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/Full Logo.svg" alt="Momentum Logo" className="h-12 md:h-16 w-auto" />
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <button 
                onClick={() => scrollToSection('benefits')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                How it works
              </button>
              <button 
                onClick={() => scrollToSection('pricing')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                FAQ
              </button>
            </div>

            {/* Desktop CTA Button */}
            <div className="hidden md:flex items-center gap-3">
              <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <Button 
                onClick={() => navigate('/auth')} 
                size="sm"
                className="bg-primary hover:bg-primary/90 text-xs px-3"
              >
                Get Started
              </Button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-foreground" />
                ) : (
                  <Menu className="w-5 h-5 text-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border bg-background">
              <div className="flex flex-col py-2">
                <button 
                  onClick={() => scrollToSection('benefits')}
                  className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                >
                  Services
                </button>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                >
                  How it works
                </button>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                >
                  Pricing
                </button>
                <button 
                  onClick={() => scrollToSection('faq')}
                  className="px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                >
                  FAQ
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Area */}
      <section className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-center">
            {/* Left Side - Content */}
            <div>
              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 md:mb-6 leading-tight">
                Your Personal
                <span className="block text-primary mt-2">
                  AI Student Assistant
                </span>
              </h1>

              {/* Description */}
              <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-xl">
                Organize your academics, develop skills, manage finances, and boost productivity with 
                intelligent AI-powered insights and personalized recommendations.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="text-lg px-8 bg-primary hover:bg-primary/90"
                  onClick={() => navigate('/auth')}
                >
                  Get Started Free
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8"
                  onClick={() => navigate('/auth')}
                >
                  Sign In
                </Button>
              </div>
            </div>

            {/* Right Side - Product Screenshot */}
            <div className="relative">
              <div className="rounded-lg border border-border bg-card p-4 md:p-8 shadow-xl overflow-hidden">
                <div className="rounded-lg overflow-hidden">
                  <img 
                    src="/dashbaordpng.png" 
                    alt="Momentum Dashboard Screenshot" 
                    className="w-full h-auto object-contain rounded-lg shadow-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Focus on how it helps you instead of what features it has
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const isLarge = index === 0 || index === 3;
            return (
              <Card 
                key={index} 
                className={`p-6 border-border bg-card hover:shadow-lg transition-all ${
                  isLarge ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground">
                  {benefit.description}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-8 md:py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              How it works?
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              Get started with Momentum in 3 simple steps
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {howItWorks.map((step, index) => (
              <Card key={index} className="p-6 border-border bg-card text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Pricing - Why to buy / How it helps
            </h2>
            <p className="text-base md:text-lg text-muted-foreground px-4">
              Choose the plan that works best for you. All plans include our core features.
            </p>
          </div>

          {/* Currency Toggle */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm font-medium ${currency === 'USD' ? 'text-foreground' : 'text-muted-foreground'}`}>
                USD
              </span>
              <button
                onClick={() => setCurrency(currency === 'USD' ? 'BDT' : 'USD')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                role="switch"
                aria-checked={currency === 'BDT'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currency === 'BDT' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${currency === 'BDT' ? 'text-foreground' : 'text-muted-foreground'}`}>
                BDT (Bangladesh)
              </span>
            </div>
            {currency === 'BDT' && (
              <p className="text-sm text-primary font-semibold text-center max-w-md">
                BDT pricing is exclusively available for students currently enrolled in educational institutions in Bangladesh. Verification may be required.
              </p>
            )}
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              role="switch"
              aria-checked={billingPeriod === 'annual'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingPeriod === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
              {billingPeriod === 'annual' && proPricing.discountPercent && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {proPricing.discountPercent}% OFF
                </span>
              )}
            </span>
          </div>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index}
                className={`p-6 md:p-8 border-border bg-card relative transition-all hover:shadow-lg ${
                  plan.popular ? 'border-2 border-primary shadow-lg scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    {plan.price === 'Free' ? (
                      <span className="text-4xl font-bold text-foreground">Free</span>
                    ) : plan.price === 'Custom' ? (
                      <span className="text-4xl font-bold text-foreground">Custom</span>
                    ) : (
                      <div>
                        {billingPeriod === 'monthly' ? (
                          <div>
                            <div className="flex items-baseline gap-2 justify-center flex-wrap">
                              <span className="text-2xl font-bold text-foreground">
                                {currency === 'BDT' ? '৳' : '$'}{plan.firstMonth}
                              </span>
                              <span className="text-xl font-bold text-muted-foreground line-through">
                                {currency === 'BDT' ? '৳' : '$'}{plan.monthlyPrice}
                              </span>
                              <span className="text-lg text-muted-foreground">first month</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Then {currency === 'BDT' ? '৳' : '$'}{plan.monthlyPrice}/mo
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-2 justify-center flex-wrap">
                              <span className="text-4xl font-bold text-foreground">
                                {currency === 'BDT' ? '৳' : '$'}{plan.monthlyPrice.toFixed(2)}
                              </span>
                              <span className="text-2xl font-bold text-muted-foreground line-through">
                                {currency === 'BDT' ? '৳' : '$'}{(plan.originalAnnual! / 12).toFixed(2)}
                              </span>
                              <span className="text-lg text-muted-foreground">/mo</span>
                            </div>
                            <div className="text-sm text-primary font-medium mt-1">
                              {currency === 'BDT' ? '৳' : '$'}{plan.annualPrice?.toFixed(2)}/year billed annually
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button 
                    className={`w-full mt-4 ${
                      plan.popular 
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                        : plan.name === 'Free'
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                    onClick={() => navigate('/auth')}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Feature Comparison Table */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
              Feature Comparison
            </h3>
            <Card className="overflow-hidden border-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 font-semibold text-foreground">Module</th>
                      <th className="text-center p-4 font-semibold text-foreground">Free</th>
                      <th className="text-center p-4 font-semibold text-foreground bg-primary/5">
                        Pro
                      </th>
                      <th className="text-center p-4 font-semibold text-foreground">Campus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-border hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4 font-medium text-foreground">{feature.name}</td>
                        <td className="p-4 text-center">
                          {feature.free ? (
                            <div className="flex items-center justify-center gap-2">
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                              <span className="text-sm text-muted-foreground">{feature.free}</span>
                            </div>
                          ) : (
                            <X className="w-5 h-5 text-destructive mx-auto" />
                          )}
                        </td>
                        <td className="p-4 text-center bg-primary/5">
                          <div className="flex items-center justify-center gap-2">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm text-muted-foreground">{feature.pro}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm text-muted-foreground">{feature.campus}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-base md:text-lg text-muted-foreground px-4">
              Address some major questions to help people make the final call
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <Card className="p-6 md:p-8 lg:p-10 text-center border-border bg-primary/5 border-2 border-primary/20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            Ready to Transform Your Student Life?
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Join thousands of students who are already using Momentum to achieve their goals
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 bg-primary hover:bg-primary/90"
            onClick={() => navigate('/auth')}
          >
            Start Your Journey Today
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 md:py-12 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* Logo and Description */}
          <div className="md:col-span-1">
            <img src="/Full Logo.svg" alt="Momentum Logo" className="h-16 w-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Your personal AI student assistant for academics, skills, and productivity.
            </p>
          </div>

          {/* Menu Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Menu</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => scrollToSection('benefits')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Services
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  How it works
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection('pricing')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Pricing
                </button>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Newsletter</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Stay updated with the latest features and tips.
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button size="icon" className="bg-primary hover:bg-primary/90">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Social Media and Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            © 2025 Momentum. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
