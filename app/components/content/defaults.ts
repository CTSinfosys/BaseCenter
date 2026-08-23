// Phase 2B — client-side fallback content for the public pages.
// Mirrors the backend seed (content_service._WEBSITE_SEED / _SPLASH_SEED) so
// the pages are never blank if the content API is unreachable or empty.

import type { RenderSection } from './SectionRenderer';

export const WEBSITE_FALLBACK: RenderSection[] = [
  {
    id: -1,
    type: 'hero',
    content: {
      headline: 'Run your entire business from one intelligent platform',
      subheadline:
        'BaseCenter.ai combines 10 powerful business tools with AI customization. Start with one module free forever, add what you need for just $5/month each.',
      background_image: '',
      primary_cta_text: 'Get Started Free',
      primary_cta_link: '/modules',
      secondary_cta_text: 'Explore Modules',
      secondary_cta_link: '#modules',
      note: 'No credit card required • Cancel anytime • 5-year free module guarantee',
    },
  },
  {
    id: -2,
    type: 'rich_text',
    content: {
      heading: 'Tired of juggling multiple subscriptions and disconnected tools?',
      body: 'Most businesses waste hours switching between invoicing software, project managers, CRMs, and accounting tools—each with its own login, its own way of working, and its own monthly fee. BaseCenter.ai brings it all together in one intelligent platform that actually talks to itself.',
      align: 'center',
    },
  },
  {
    id: -3,
    type: 'feature_grid',
    content: {
      heading: 'One platform. Ten powerful modules. Infinite possibilities.',
      intro:
        'From invoicing to project management, from customer relationships to team training—BaseCenter.ai has everything you need to run and grow your business. And with our AI customization engine, every tool adapts to your unique workflow.',
      columns: 3,
      items: [
        { icon: '🎯', title: '10 Full-Featured Modules', text: 'Everything from invoicing to project management, all seamlessly integrated', link: '' },
        { icon: '🤖', title: 'AI Customization', text: 'Each module adapts to your specific business needs automatically', link: '' },
        { icon: '✨', title: 'One Free Forever', text: 'Choose any module, 100% free for 5 years with 10 seats included', link: '' },
      ],
    },
  },
  {
    id: -4,
    type: 'steps',
    content: {
      heading: 'How It Works',
      intro: 'Get started in three simple steps',
      steps: [
        { title: 'Choose Your Free Module', text: 'Pick any of our 10 business modules to start completely free (10 seats included)' },
        { title: 'Let AI Customize It', text: 'Our intelligent assistant adapts the module to your specific industry and workflow' },
        { title: 'Add More As You Grow', text: 'Activate additional modules for just $5/month each, all seamlessly connected' },
      ],
    },
  },
  {
    id: -5,
    type: 'modules_grid',
    content: {
      heading: 'Choose Your Free Module',
      intro: 'Start with any module free forever, add more for just $5/month',
    },
  },
  {
    id: -6,
    type: 'pricing',
    content: {
      heading: 'Simple, honest pricing. No surprises.',
      intro: 'Transparent pricing that scales with your business',
      tiers: [
        { name: 'First Module', price: '$0', period: '/forever', highlight: false, features: ['Your choice of any module', '10 seats included', 'Full feature access', '5-year guarantee'] },
        { name: 'Additional Modules', price: '$5', period: '/month each', highlight: true, features: ['10 seats per module', 'Full feature access', 'Seamless integration', 'Cancel anytime'] },
        { name: 'Extra Seats', price: '$5', period: '/month', highlight: false, features: ['Per 10 additional seats', 'Any module', 'Same features', 'Scale as needed'] },
      ],
      note: 'Bonus: Website builder included free with every account • One-time free module switch available',
    },
  },
  {
    id: -7,
    type: 'feature_grid',
    content: {
      heading: 'Loved by teams that ship',
      intro: '',
      columns: 2,
      items: [
        { icon: '★★★★★', title: 'Sarah Chen — Creative Director, Bright Studios', text: '"BaseCenter.ai replaced 6 different subscriptions for our agency. The best part? Everything just works together."', link: '' },
        { icon: '★★★★★', title: 'Marcus Johnson — Contractor', text: '"I was up and running in under 10 minutes. The AI setup wizard knew exactly what I needed."', link: '' },
      ],
    },
  },
  {
    id: -8,
    type: 'cta_banner',
    content: {
      heading: 'Ready to transform how you run your business?',
      text: "Join thousands of entrepreneurs who've simplified their business operations with BaseCenter.ai. Start with any module free, forever.",
      cta_text: 'Start Your Free Module',
      cta_link: '/modules',
      note: 'No credit card required • 10 seats included • 5-year free guarantee',
    },
  },
];

export const SPLASH_FALLBACK: RenderSection[] = [
  {
    id: -101,
    type: 'rich_text',
    content: {
      heading: 'Choose your modules',
      body: 'Start with one core module free for 5 years — add any others for just $5/month each. The Website Builder is always free and included.',
      align: 'center',
    },
  },
  {
    id: -102,
    type: 'modules_grid',
    content: { heading: '', intro: '' },
  },
  {
    id: -103,
    type: 'feature_grid',
    content: {
      heading: '',
      intro: '',
      columns: 3,
      items: [
        { icon: '💳', title: '', text: 'No card required to start your free module.', link: '' },
        { icon: '🤖', title: '', text: 'AI tailors each module to your business.', link: '' },
        { icon: '🚀', title: '', text: 'Be up and running in minutes.', link: '' },
      ],
    },
  },
];

export const MODULE_FALLBACK = [
  { id: 1, name: 'Invoice & Milestones', slug: 'invoice-milestones', description: 'Generate scopes, track milestones, invoice automatically.', icon: 'receipt', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 1 },
  { id: 2, name: 'Contracting', slug: 'contracting', description: 'Create, send, and e-sign contracts with reminders.', icon: 'file-signature', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 2 },
  { id: 3, name: 'Help Ticket', slug: 'help-ticket', description: 'A support desk with smart routing and SLA tracking.', icon: 'life-buoy', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 3 },
  { id: 4, name: 'Knowledge Base', slug: 'knowledge-base', description: 'AI-generated how-to articles based on your usage.', icon: 'book-open', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 4 },
  { id: 5, name: 'Data Collection', slug: 'data-collection', description: 'Build forms and collect structured data.', icon: 'clipboard-list', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 5 },
  { id: 6, name: 'Project Management', slug: 'project-management', description: 'Plan projects, assign tasks, ship on time.', icon: 'kanban', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 6 },
  { id: 7, name: 'File Management', slug: 'file-management', description: 'Organize and share files across your workspace.', icon: 'folder', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 7 },
  { id: 8, name: 'Training / LMS', slug: 'training-lms', description: 'Create courses and onboard your team.', icon: 'graduation-cap', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 8 },
  { id: 9, name: 'Accounting', slug: 'accounting', description: 'Track income, expenses, and reporting.', icon: 'calculator', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 9 },
  { id: 10, name: 'CRM+', slug: 'crm-plus', description: 'Manage contacts, deals, and pipeline.', icon: 'users', monthly_price: 500, is_active: true, is_free_eligible: true, display_order: 10 },
  { id: 11, name: 'Website Builder', slug: 'website-builder', description: 'Launch a professional website — free with every account.', icon: 'globe', monthly_price: 0, is_active: true, is_free_eligible: true, display_order: 11 },
];
