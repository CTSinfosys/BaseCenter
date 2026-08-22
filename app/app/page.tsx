import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

// Module data based on marketing copy
const modules = [
  {
    id: 1,
    code: 'invoicing',
    name: 'Invoice & Milestones',
    tagline: 'From scope to payment, automated',
    description: 'Generate professional scopes of work, track milestones, and create invoices automatically.',
    icon: '💰',
    features: ['AI-powered SOW generator', 'Automatic milestone tracking', 'Multi-payment processor integration'],
  },
  {
    id: 2,
    code: 'contracting',
    name: 'Contracting',
    tagline: 'Smart contracts, simplified negotiations',
    description: 'Generate custom contract templates with AI, enable client-side redlining, and manage approval workflows.',
    icon: '📝',
    features: ['AI contract templates', 'Client-friendly redlining', 'E-signature integration'],
  },
  {
    id: 3,
    code: 'help_ticket',
    name: 'Help Ticket',
    tagline: 'Support that actually helps',
    description: 'AI-assisted ticketing system that routes issues intelligently and suggests solutions automatically.',
    icon: '🎫',
    features: ['AI-powered routing', 'Automated solutions', 'SLA management'],
  },
  {
    id: 4,
    code: 'knowledge_base',
    name: 'Knowledge Base',
    tagline: 'Documentation that writes itself',
    description: 'AI generates comprehensive how-to articles based on your activated modules and usage patterns.',
    icon: '📚',
    features: ['AI-generated articles', 'Automatic updates', 'Natural language search'],
  },
  {
    id: 5,
    code: 'data_collection',
    name: 'Data Collection',
    tagline: 'Forms that think for themselves',
    description: 'Build beautiful surveys and forms with AI that automatically processes and acts on collected data.',
    icon: '📊',
    features: ['Visual form builder', 'AI data processing', 'Custom workflows'],
  },
  {
    id: 6,
    code: 'project_mgmt',
    name: 'Project Management',
    tagline: 'Projects that manage themselves',
    description: 'Kanban boards powered by AI that keeps teams on track and optimizes workflows automatically.',
    icon: '📋',
    features: ['Flexible Kanban boards', 'AI prioritization', 'Workload balancing'],
  },
  {
    id: 7,
    code: 'file_mgmt',
    name: 'File Management',
    tagline: 'Google Docs meets Dropbox, with AI',
    description: 'Create, edit, and collaborate on documents. Or connect your existing Google Drive and Dropbox.',
    icon: '📁',
    features: ['Built-in document editor', 'Google Drive sync', 'AI organization'],
  },
  {
    id: 8,
    code: 'lms',
    name: 'Training LMS',
    tagline: 'Learning programs that build themselves',
    description: 'AI designs course curricula, schedules training sessions, and integrates with your Knowledge Base.',
    icon: '🎓',
    features: ['AI curriculum generation', 'Auto scheduling', 'Progress tracking'],
  },
  {
    id: 9,
    code: 'accounting',
    name: 'Accounting',
    tagline: 'Accounting your way, automated',
    description: 'QuickBooks-level power with AI simplicity. Customize your chart of accounts and automate categorization.',
    icon: '💵',
    features: ['Customizable accounts', 'AI categorization', 'Export anywhere'],
  },
  {
    id: 10,
    code: 'crm_plus',
    name: 'CRM Plus',
    tagline: 'Relationships + revenue, automated',
    description: 'Track prospects and customers, score leads automatically, and generate entire marketing campaigns.',
    icon: '👥',
    features: ['Contact management', 'AI lead scoring', 'Automated campaigns'],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-50 to-background pt-20 pb-32">
        <div className="max-w-content mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-ink mb-6 leading-tight">
            Run your entire business<br />from one intelligent platform
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80 mb-8 max-w-3xl mx-auto">
            BaseCenter.ai combines 10 powerful business tools with AI customization. 
            Start with one module free forever, add what you need for just $5/month each.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/modules">
              <Button variant="primary" size="lg" className="text-lg px-8 py-4">
                Get Started Free
              </Button>
            </Link>
            <Link href="#modules">
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                Explore Modules
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-foreground/60">
            No credit card required • Cancel anytime • 5-year free module guarantee
          </p>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 bg-background">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
              Tired of juggling multiple subscriptions and disconnected tools?
            </h2>
            <p className="text-lg text-foreground/80 leading-relaxed">
              Most businesses waste hours switching between invoicing software, project managers, CRMs, and 
              accounting tools—each with its own login, its own way of working, and its own monthly fee. 
              BaseCenter.ai brings it all together in one intelligent platform that actually talks to itself.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Overview */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
              One platform. Ten powerful modules. Infinite possibilities.
            </h2>
            <p className="text-lg text-foreground/80">
              From invoicing to project management, from customer relationships to team training—BaseCenter.ai 
              has everything you need to run and grow your business. And with our AI customization engine, 
              every tool adapts to your unique workflow.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="elevated" padding="lg">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-ink mb-3">10 Full-Featured Modules</h3>
                <p className="text-foreground/70">
                  Everything from invoicing to project management, all seamlessly integrated
                </p>
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <div className="text-center">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-semibold text-ink mb-3">AI Customization</h3>
                <p className="text-foreground/70">
                  Each module adapts to your specific business needs automatically
                </p>
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <div className="text-center">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="text-xl font-semibold text-ink mb-3">One Free Forever</h3>
                <p className="text-foreground/70">
                  Choose any module, 100% free for 5 years with 10 seats included
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">How It Works</h2>
            <p className="text-lg text-foreground/70">Get started in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Choose Your Free Module</h3>
              <p className="text-foreground/70">
                Pick any of our 10 business modules to start completely free (10 seats included)
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Let AI Customize It</h3>
              <p className="text-foreground/70">
                Our intelligent assistant adapts the module to your specific industry and workflow
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-ink mb-3">Add More As You Grow</h3>
              <p className="text-foreground/70">
                Activate additional modules for just $5/month each, all seamlessly connected
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section id="modules" className="py-20 bg-primary-50">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Choose Your Free Module</h2>
            <p className="text-lg text-foreground/70">
              Start with any module free forever, add more for just $5/month
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Card key={module.id} variant="elevated" padding="lg" className="hover:shadow-lg transition-all cursor-pointer">
                <CardHeader>
                  <div className="text-5xl mb-4">{module.icon}</div>
                  <CardTitle className="text-xl">{module.name}</CardTitle>
                  <CardDescription className="text-primary font-medium">{module.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/70 mb-4">{module.description}</p>
                  <ul className="space-y-2">
                    {module.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-foreground/70">
                        <span className="text-primary mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/modules">
              <Button variant="primary" size="lg" className="text-lg px-8 py-4">
                Start Your Free Module
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-background">
        <div className="max-w-content mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">Simple, honest pricing. No surprises.</h2>
            <p className="text-lg text-foreground/70">Transparent pricing that scales with your business</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>First Module</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-ink">$0</span>
                  <span className="text-foreground/70">/forever</span>
                </div>
              </CardHeader>
              <CardContent className="mt-6">
                <ul className="space-y-3 text-foreground/70">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Your choice of any module
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    10 seats included
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Full feature access
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    5-year guarantee
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card variant="outlined" padding="lg" className="border-2 border-primary">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle>Additional Modules</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-ink">$5</span>
                  <span className="text-foreground/70">/month each</span>
                </div>
              </CardHeader>
              <CardContent className="mt-6">
                <ul className="space-y-3 text-foreground/70">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    10 seats per module
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Full feature access
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Seamless integration
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Cancel anytime
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Extra Seats</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-ink">$5</span>
                  <span className="text-foreground/70">/month</span>
                </div>
              </CardHeader>
              <CardContent className="mt-6">
                <ul className="space-y-3 text-foreground/70">
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Per 10 additional seats
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Any module
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Same features
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    Scale as needed
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-foreground/60 mb-6">
              <strong>Bonus:</strong> Website builder included free with every account • One-time free module switch available
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-primary-50">
        <div className="max-w-content mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            <Card variant="elevated" padding="lg">
              <p className="text-lg text-ink mb-4 italic">
                "BaseCenter.ai replaced 6 different subscriptions for our agency. The best part? Everything just works together."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold mr-4">
                  SC
                </div>
                <div>
                  <p className="font-semibold text-ink">Sarah Chen</p>
                  <p className="text-sm text-foreground/60">Creative Director at Bright Studios</p>
                </div>
              </div>
            </Card>

            <Card variant="elevated" padding="lg">
              <p className="text-lg text-ink mb-4 italic">
                "I was up and running in under 10 minutes. The AI setup wizard knew exactly what I needed."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold mr-4">
                  MJ
                </div>
                <div>
                  <p className="font-semibold text-ink">Marcus Johnson</p>
                  <p className="text-sm text-foreground/60">Contractor</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-background">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">
            Ready to transform how you run your business?
          </h2>
          <p className="text-lg text-foreground/80 mb-8">
            Join thousands of entrepreneurs who've simplified their business operations with BaseCenter.ai. 
            Start with any module free, forever.
          </p>
          <Link href="/modules">
            <Button variant="primary" size="lg" className="text-xl px-12 py-5">
              Start Your Free Module
            </Button>
          </Link>
          <p className="mt-6 text-sm text-foreground/60">
            No credit card required • 10 seats included • 5-year free guarantee
          </p>
        </div>
      </section>
    </div>
  );
}
