'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';

// Module data
const modules = [
  {
    id: 1,
    code: 'invoicing',
    name: 'Invoice & Milestones',
    tagline: 'From scope to payment, automated',
    description: 'Generate professional scopes of work, track milestones, and create invoices automatically. Connect to Square, Stripe, and other payment processors.',
    icon: '💰',
    features: [
      'AI-powered SOW generator',
      'Automatic milestone tracking',
      'Professional invoice creation',
      'Multi-payment processor integration',
      'Automated payment reminders',
      'Real-time payment dashboard',
    ],
    perfectFor: 'Consultants, agencies, contractors, freelancers',
  },
  {
    id: 2,
    code: 'contracting',
    name: 'Contracting',
    tagline: 'Smart contracts, simplified negotiations',
    description: 'Generate custom contract templates with AI, enable client-side redlining, and manage approval workflows without the back-and-forth chaos.',
    icon: '📝',
    features: [
      'AI contract template generation',
      'Client-friendly redlining interface',
      'Admin approval workflow',
      'Version control and change tracking',
      'E-signature integration',
      'Contract template library',
    ],
    perfectFor: 'Service providers, agencies, B2B businesses',
  },
  {
    id: 3,
    code: 'help_ticket',
    name: 'Help Ticket',
    tagline: 'Support that actually helps',
    description: 'AI-assisted ticketing system that routes issues intelligently, suggests solutions automatically, and keeps customers and admins in sync.',
    icon: '🎫',
    features: [
      'AI-powered ticket categorization',
      'Automated solution suggestions',
      'Customer portal for tracking',
      'Team collaboration tools',
      'Priority and SLA management',
      'Knowledge base integration',
    ],
    perfectFor: 'SaaS companies, service businesses, product companies',
  },
  {
    id: 4,
    code: 'knowledge_base',
    name: 'Knowledge Base',
    tagline: 'Documentation that writes itself',
    description: 'AI generates comprehensive how-to articles based on your activated modules and actual usage patterns. Always up-to-date, always relevant.',
    icon: '📚',
    features: [
      'AI-generated articles',
      'Automatic feature updates',
      'Natural language search',
      'Video and screenshot embeds',
      'Usage analytics',
      'Public or private access',
    ],
    perfectFor: 'Any business using BaseCenter modules',
  },
  {
    id: 5,
    code: 'data_collection',
    name: 'Data Collection',
    tagline: 'Forms that think for themselves',
    description: 'Build beautiful surveys and forms with drag-and-drop simplicity. Add an AI prompt to each form to automatically process, categorize, and act on collected data.',
    icon: '📊',
    features: [
      'Visual form builder',
      'AI-powered data processing',
      'Custom workflows',
      'Embed anywhere or share via link',
      'Response analytics',
      'Module integrations',
    ],
    perfectFor: 'Market researchers, HR teams, sales teams',
  },
  {
    id: 6,
    code: 'project_mgmt',
    name: 'Project Management',
    tagline: 'Projects that manage themselves',
    description: 'Kanban boards inspired by Trello, Monday.com, and Jira—powered by AI that keeps teams on track, anticipates blockers, and optimizes workflows automatically.',
    icon: '📋',
    features: [
      'Flexible Kanban/Scrum boards',
      'AI-powered task prioritization',
      'Automated status updates',
      'Team workload balancing',
      'Time tracking and estimates',
      'Full module integration',
    ],
    perfectFor: 'Agencies, development teams, marketing teams',
  },
  {
    id: 7,
    code: 'file_mgmt',
    name: 'File Management',
    tagline: 'Google Docs meets Dropbox, with AI',
    description: 'Create, edit, and collaborate on documents with a Google Docs-style interface. Or connect your existing Google Drive and Dropbox. AI keeps everything organized.',
    icon: '📁',
    features: [
      'Built-in document editor',
      'Google Drive integration',
      'Dropbox sync',
      'AI-powered organization',
      'Version control',
      'Team collaboration',
    ],
    perfectFor: 'Any team that creates or shares documents',
  },
  {
    id: 8,
    code: 'lms',
    name: 'Training LMS',
    tagline: 'Learning programs that build themselves',
    description: 'AI designs course curricula, schedules training sessions, and integrates with your Knowledge Base. Onboard teams faster and keep skills sharp.',
    icon: '🎓',
    features: [
      'AI curriculum generation',
      'Automated session scheduling',
      'Knowledge Base integration',
      'Progress tracking',
      'Certifications',
      'Team and individual paths',
    ],
    perfectFor: 'Growing teams, franchises, professional services',
  },
  {
    id: 9,
    code: 'accounting',
    name: 'Accounting',
    tagline: 'Accounting your way, automated',
    description: 'QuickBooks-level power with AI simplicity. Customize your chart of accounts, automate categorization, and export to any platform. Or make BaseCenter your primary accounting system.',
    icon: '💵',
    features: [
      'Customizable chart of accounts',
      'AI transaction categorization',
      'Invoice module integration',
      'Export to QuickBooks, Xero, etc.',
      'Financial reporting',
      'Multi-currency support',
    ],
    perfectFor: 'Small businesses, contractors, service providers',
  },
  {
    id: 10,
    code: 'crm_plus',
    name: 'CRM Plus',
    tagline: 'Relationships + revenue, automated',
    description: 'Track prospects and customers, score leads automatically, and generate entire marketing campaigns from collected data. It\'s a CRM that actually drives growth.',
    icon: '👥',
    features: [
      'Complete contact management',
      'AI lead scoring',
      'Automated campaign generation',
      'Data Collection integration',
      'Email tracking',
      'Sales pipeline visualization',
    ],
    perfectFor: 'Sales teams, B2B businesses, agencies',
  },
];

export default function ModulesPage() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [websiteModuleSelected, setWebsiteModuleSelected] = useState(false);

  const handleModuleSelect = (moduleCode: string) => {
    if (selectedModule === moduleCode) {
      setSelectedModule(null);
    } else {
      setSelectedModule(moduleCode);
    }
  };

  const handleContinue = () => {
    if (selectedModule) {
      // In the real app, this would navigate to payment/registration
      alert(`Selected: ${modules.find(m => m.code === selectedModule)?.name}\nWebsite Module: ${websiteModuleSelected ? 'Yes' : 'No'}\n\n(This will route to payment page in production)`);
    }
  };

  const selectedModuleData = modules.find(m => m.code === selectedModule);

  return (
    <div className="min-h-screen bg-primary-50 py-12">
      <div className="max-w-content mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            Choose Your Free Module
          </h1>
          <p className="text-xl text-foreground/80 max-w-3xl mx-auto">
            Select any module to start completely free with 10 seats included. 
            Add more modules anytime for just $5/month each.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-large">
            <span className="text-2xl">✨</span>
            <span className="font-semibold">5-Year Free Guarantee on Your First Module</span>
          </div>
        </div>

        {/* Website Module Toggle */}
        <div className="mb-8 max-w-2xl mx-auto">
          <Card variant="outlined" padding="lg" className="border-financial border-2">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🌐</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-ink">Website Module</h3>
                    <p className="text-foreground/70 mt-1">
                      Professional website builder included free with every account (optional activation)
                    </p>
                  </div>
                  <button
                    onClick={() => setWebsiteModuleSelected(!websiteModuleSelected)}
                    className={`
                      relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                      ${websiteModuleSelected ? 'bg-primary' : 'bg-hairline'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                        ${websiteModuleSelected ? 'translate-x-7' : 'translate-x-1'}
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {modules.map((module) => (
            <Card
              key={module.id}
              variant={selectedModule === module.code ? 'outlined' : 'elevated'}
              padding="lg"
              className={`
                cursor-pointer transition-all hover:shadow-lg
                ${selectedModule === module.code ? 'border-2 border-primary ring-4 ring-primary/20' : ''}
              `}
              onClick={() => handleModuleSelect(module.code)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-5xl mb-4">{module.icon}</div>
                  {selectedModule === module.code && (
                    <div className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                      Selected
                    </div>
                  )}
                </div>
                <CardTitle className="text-xl">{module.name}</CardTitle>
                <CardDescription className="text-primary font-medium">
                  {module.tagline}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/70 mb-4">{module.description}</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-ink">Key Features:</p>
                  <ul className="space-y-1">
                    {module.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-foreground/70">
                        <span className="text-primary mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                    {module.features.length > 3 && (
                      <li className="text-sm text-primary font-medium ml-4">
                        +{module.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>
                <div className="mt-4 pt-4 border-t border-hairline">
                  <p className="text-xs text-foreground/60">
                    <strong>Perfect for:</strong> {module.perfectFor}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Selected Module Summary & CTA */}
        {selectedModule && (
          <div className="sticky bottom-0 bg-white border-t-2 border-primary shadow-lg p-6 rounded-t-card">
            <div className="max-w-content mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{selectedModuleData?.icon}</div>
                <div>
                  <h3 className="text-xl font-semibold text-ink">
                    {selectedModuleData?.name}
                  </h3>
                  <p className="text-sm text-foreground/70">
                    Free forever • 10 seats included
                    {websiteModuleSelected && ' • + Website Module (free)'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setSelectedModule(null)}
                >
                  Change Selection
                </Button>
                <Link href="/register">
                  <Button variant="primary" size="lg" onClick={handleContinue}>
                    Continue to Setup →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Info */}
        <div className="text-center mt-12">
          <p className="text-foreground/60 mb-4">
            <strong>What happens next?</strong>
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl mb-2">💳</div>
              <p className="text-sm text-foreground/70">
                Add payment info (you won't be charged for your free module)
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm text-foreground/70">
                AI customizes your module to fit your specific business needs
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🚀</div>
              <p className="text-sm text-foreground/70">
                Start using your fully customized module in minutes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
