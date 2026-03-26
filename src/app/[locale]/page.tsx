"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { 
  Bitcoin, 
  TrendingUp, 
  Shield, 
  Clock, 
  Users, 
  Zap, 
  ChevronRight,
  Menu,
  X,
  Globe,
  Check,
  ArrowRight,
  Play,
  Star,
  Award,
  Lock,
  Wallet,
  Server,
  HeadphonesIcon,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Target,
  PieChart,
  RefreshCw,
  Gift,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Language Selector Component
function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = [
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];
  
  const currentLang = languages.find(l => l.code === locale) || languages[0];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm hidden sm:inline">{currentLang.name}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute right-0 top-full mt-2 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-xl min-w-[150px]"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    router.replace('/', { locale: lang.code as 'pt' | 'en' | 'es' });
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors",
                    locale === lang.code && "bg-amber-500/10 text-amber-500"
                  )}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                  {locale === lang.code && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Navigation Component
function Navigation() {
  const t = useTranslations('nav');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const navLinks = [
    { href: '#how-it-works', label: t('howItWorks') },
    { href: '#benefits', label: t('benefits') },
    { href: '#pricing', label: t('pricing') },
    { href: '#faq', label: t('faq') },
  ];
  
  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled ? "bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <Bitcoin className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg text-white">Mining Protocol</h1>
              <p className="text-[10px] text-gray-500">Real Hashpower</p>
            </div>
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-300 hover:text-amber-500 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          {/* Right Side */}
          <div className="flex items-center gap-3">
            <LanguageSelector />
            
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" className="text-gray-300 hover:text-white">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-semibold">
                  {t('register')}
                </Button>
              </Link>
            </div>
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-white/5 touch-manipulation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#0a0a0a]/98 backdrop-blur-xl border-b border-white/5"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-lg text-gray-300 hover:text-amber-500 py-2"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <Link href="/dashboard" className="block">
                  <Button variant="outline" className="w-full">
                    {t('login')}
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold">
                    {t('register')}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// Hero Section
function HeroSection() {
  const t = useTranslations('hero');
  const tNav = useTranslations('nav');
  
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 lg:pt-0 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-amber-500/5 to-orange-500/5 rounded-full blur-3xl" />
      </div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-6 bg-amber-500/10 text-amber-500 border-amber-500/30 px-4 py-1.5 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('badge')}
            </Badge>
          </motion.div>
          
          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            <span className="text-white">{t('title')}</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              {t('titleHighlight')}
            </span>
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-8"
          >
            {t('subtitle')}
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-semibold text-lg px-8 py-6 h-auto rounded-xl shadow-lg shadow-amber-500/25 group">
                {t('cta.primary')}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/5 text-lg px-8 py-6 h-auto rounded-xl">
                <Play className="w-5 h-5 mr-2" />
                {t('cta.secondary')}
              </Button>
            </a>
          </motion.div>
          
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto"
          >
            {[
              { value: '2,500+', label: t('stats.clients'), icon: Users },
              { value: '150+', label: t('stats.miners'), icon: Server },
              { value: '99.9%', label: t('stats.uptime'), icon: Zap },
              { value: '8-15%', label: t('stats.returns'), icon: TrendingUp },
            ].map((stat, index) => (
              <div
                key={index}
                className="relative p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <stat.icon className="w-5 h-5 text-amber-500 mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-xs md:text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// Social Proof Section
function SocialProofSection() {
  const t = useTranslations('socialProof');
  
  return (
    <section className="py-12 border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-gray-400 mb-2">{t('title')}</p>
          <p className="text-amber-500 font-semibold">{t('subtitle')}</p>
        </motion.div>
        
        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
          {[
            { icon: Shield, text: 'Segurança SSL' },
            { icon: Award, text: 'Auditoria Trimestral' },
            { icon: BadgeCheck, text: 'Empresa Registrada' },
            { icon: Lock, text: 'Cold Storage' },
          ].map((badge, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5"
            >
              <badge.icon className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-400">{badge.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection() {
  const t = useTranslations('features');
  
  const features = [
    { key: 'transparency', icon: PieChart, color: 'from-blue-500 to-cyan-500' },
    { key: 'security', icon: Shield, color: 'from-green-500 to-emerald-500' },
    { key: 'returns', icon: TrendingUp, color: 'from-amber-500 to-orange-500' },
    { key: 'support', icon: HeadphonesIcon, color: 'from-purple-500 to-pink-500' },
    { key: 'technology', icon: Server, color: 'from-red-500 to-rose-500' },
    { key: 'flexibility', icon: RefreshCw, color: 'from-teal-500 to-cyan-500' },
  ];
  
  return (
    <section id="benefits" className="py-20 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
            {t('title')}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('subtitle')}
          </h2>
        </motion.div>
        
        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Card className="h-full bg-white/5 border-white/10 hover:border-amber-500/30 transition-all duration-300 hover:bg-white/[0.07] overflow-hidden">
                <CardContent className="p-6">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-r flex items-center justify-center mb-4",
                    feature.color
                  )}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-amber-500 transition-colors">
                    {t(`items.${feature.key}.title`)}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {t(`items.${feature.key}.description`)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// How It Works Section
function HowItWorksSection() {
  const t = useTranslations('howItWorks');
  
  const steps = [
    { key: 'register', icon: Users, number: '01' },
    { key: 'deposit', icon: Wallet, number: '02' },
    { key: 'earn', icon: Bitcoin, number: '03' },
  ];
  
  return (
    <section id="how-it-works" className="py-20 lg:py-32 relative bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
            {t('title')}
          </Badge>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>
        
        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 text-center hover:border-amber-500/30 transition-colors group">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-black font-bold text-sm">
                      {step.number}
                    </div>
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <step.icon className="w-8 h-8 text-amber-500" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {t(`steps.${step.key}.title`)}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {t(`steps.${step.key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  
  const plans = [
    { key: 'starter', popular: false },
    { key: 'pro', popular: true },
    { key: 'enterprise', popular: false },
  ];
  
  return (
    <section id="pricing" className="py-20 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
            {t('title')}
          </Badge>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>
        
        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative",
                plan.popular && "md:-mt-4 md:mb-4"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-black font-semibold">
                    {t(`plans.${plan.key}.popular`)}
                  </Badge>
                </div>
              )}
              
              <Card className={cn(
                "h-full bg-white/5 border-white/10 transition-all duration-300 overflow-hidden",
                plan.popular 
                  ? "border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-transparent" 
                  : "hover:border-white/20"
              )}>
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {t(`plans.${plan.key}.name`)}
                  </h3>
                  <p className="text-gray-400 text-sm mb-6">
                    {t(`plans.${plan.key}.description`)}
                  </p>
                  
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-white">
                      {t(`plans.${plan.key}.price`)}
                    </span>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const feature = t(`plans.${plan.key}.features.${i}`);
                      if (!feature || feature.includes(`plans.${plan.key}.features.${i}`)) return null;
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                  
                  <Link href="/dashboard">
                    <Button className={cn(
                      "w-full",
                      plan.popular 
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-semibold"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    )}>
                      {locale === 'pt' ? 'Começar Agora' : locale === 'es' ? 'Comenzar Ahora' : 'Get Started'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Affiliate Section
function AffiliateSection() {
  const t = useTranslations('affiliate');
  
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
              <Gift className="w-4 h-4 mr-1" />
              Programa de Afiliados
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('title')}
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              {t('subtitle')}
            </p>
            
            {/* Commission Levels */}
            <div className="grid grid-cols-5 gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className="text-center p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="text-xs text-gray-500 mb-1">N{level}</div>
                  <div className="text-lg font-bold text-amber-500">
                    {level === 1 ? '10%' : level === 2 ? '5%' : level === 3 ? '3%' : level === 4 ? '2%' : '1%'}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Benefits */}
            <ul className="space-y-3 mb-8">
              {t.raw('benefits').map((benefit: string, index: number) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-gray-300">{benefit}</span>
                </li>
              ))}
            </ul>
            
            <Link href="/dashboard">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-semibold">
                {t('cta')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
          
          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-md mx-auto">
              {/* Central Icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
                <Users className="w-12 h-12 text-white" />
              </div>
              
              {/* Orbiting Levels */}
              {[1, 2, 3, 4, 5].map((level, i) => (
                <motion.div
                  key={level}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20 + i * 5, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0"
                  style={{
                    transform: `scale(${0.4 + i * 0.15})`,
                  }}
                >
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/10 border border-amber-500/30 flex items-center justify-center"
                  >
                    <span className="text-xs text-amber-500 font-bold">{level}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const t = useTranslations('faq');
  
  const items = t.raw('items') as Array<{ question: string; answer: string }>;
  
  return (
    <section id="faq" className="py-20 lg:py-32 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
            {t('title')}
          </Badge>
          <p className="text-gray-400 text-lg">
            {t('subtitle')}
          </p>
        </motion.div>
        
        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {items.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/5 border border-white/10 rounded-xl px-6 data-[state=open]:border-amber-500/30"
              >
                <AccordionTrigger className="text-left text-white hover:text-amber-500 hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  const t = useTranslations('cta');
  
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-[150px]" />
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            {t('subtitle')}
          </p>
          
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-semibold text-lg px-12 py-6 h-auto rounded-xl shadow-lg shadow-amber-500/25 group">
              {t('button')}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <p className="mt-6 text-sm text-gray-500">
            {t('guarantee')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-white/5 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <Bitcoin className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-lg text-white">{t('company')}</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              {t('description')}
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {['twitter', 'instagram', 'telegram', 'youtube'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-white/5 hover:bg-amber-500/20 flex items-center justify-center transition-colors"
                >
                  <Globe className="w-5 h-5 text-gray-400 hover:text-amber-500" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Platform Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('links.platform')}</h4>
            <ul className="space-y-2">
              {['about', 'miners', 'pricing', 'affiliate'].map((link) => (
                <li key={link}>
                  <a href={`#${link}`} className="text-gray-400 hover:text-amber-500 text-sm transition-colors">
                    {t(`links.${link}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Support Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('links.support')}</h4>
            <ul className="space-y-2">
              {['faq', 'contact'].map((link) => (
                <li key={link}>
                  <a href={`#${link}`} className="text-gray-400 hover:text-amber-500 text-sm transition-colors">
                    {t(`links.${link}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t('links.legal')}</h4>
            <ul className="space-y-2">
              {['terms', 'privacy', 'cookies'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-gray-400 hover:text-amber-500 text-sm transition-colors">
                    {t(`links.${link}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm text-center md:text-left">
              {t('copyright', { year: currentYear })}
            </p>
            <p className="text-gray-600 text-xs text-center md:text-right max-w-md">
              {t('disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page Component
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navigation />
      <main>
        <HeroSection />
        <SocialProofSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <AffiliateSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
