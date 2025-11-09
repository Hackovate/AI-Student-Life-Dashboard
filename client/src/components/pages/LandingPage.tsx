import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Calendar, 
  Wallet, 
  Brain, 
  CheckCircle2,
  Star,
  ArrowRight,
  Users,
  Zap,
  Shield,
  BarChart3,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'forever',
      features: [
        'Basic task management',
        'Academic tracking',
        'Basic analytics',
        'Community support'
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: 'month',
      features: [
        'Everything in Starter',
        'AI-powered recommendations',
        'Advanced analytics',
        'Skill development tracking',
        'Finance management',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Advanced',
      price: '$19.99',
      period: 'month',
      features: [
        'Everything in Pro',
        'Unlimited AI consultations',
        'Custom integrations',
        'Export & API access',
        'Dedicated support',
        'Early feature access'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Computer Science Student',
      rating: 5,
      text: 'Momentum has completely transformed how I manage my studies. The AI recommendations are spot-on and help me stay organized.'
    },
    {
      name: 'Michael Rodriguez',
      role: 'Business Major',
      rating: 5,
      text: 'The finance tracking feature is a game-changer. I\'ve saved more money in 3 months than I did all last year!'
    },
    {
      name: 'Emily Johnson',
      role: 'Engineering Student',
      rating: 5,
      text: 'Best student productivity app I\'ve used. The analytics help me understand my patterns and improve every day.'
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
              <img src="/Full Logo.svg" alt="Momentum Logo" className="h-16 w-auto" />
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
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
                onClick={() => scrollToSection('testimonials')}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Testimonials
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

            {/* CTA Button */}
            <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Area */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div>
              {/* Social Proof */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  1200+ active students using Momentum
                </span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
                Your Personal
                <span className="block text-primary mt-2">
                  AI Student Assistant
                </span>
              </h1>

              {/* Description */}
              <p className="text-lg text-muted-foreground mb-8 max-w-xl">
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

            {/* Right Side - Product Screenshot/Video Placeholder */}
            <div className="relative">
              <div className="rounded-lg border border-border bg-card p-8 shadow-xl">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Product Screenshot</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="container mx-auto px-4 py-12 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground text-center mb-6">
            Trusted by students at:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {['Harvard', 'MIT', 'Stanford', 'UC Berkeley', 'NYU', 'Columbia', 'Yale', 'Princeton'].map((uni, i) => (
              <div key={i} className="text-sm font-semibold text-muted-foreground">
                {uni}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Focus on how it helps you instead of what features it has
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
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
      <section id="how-it-works" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How it works?
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started with Momentum in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
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
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pricing - Why to buy / How it helps
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that works best for you. All plans include our core features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index}
                className={`p-8 border-border bg-card relative ${
                  plan.popular ? 'border-2 border-primary shadow-lg' : ''
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
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period !== 'forever' && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                  <Button 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                    onClick={() => navigate('/auth')}
                  >
                    {plan.cta}
                  </Button>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Loved by students worldwide
            </h2>
            <p className="text-lg text-muted-foreground">
              See what students are saying about Momentum
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 border-border bg-card">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 italic">
                  "{testimonial.text}"
                </p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
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
      <section className="container mx-auto px-4 py-20">
        <Card className="p-12 md:p-16 text-center border-border bg-primary/5 border-2 border-primary/20">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Transform Your Student Life?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
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
      <footer className="container mx-auto px-4 py-12 border-t border-border">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
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
              <li>
                <button 
                  onClick={() => scrollToSection('testimonials')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Testimonials
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
    </div>
  );
}
