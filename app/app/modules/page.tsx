'use client';

// Intro / Splash screen — a responsive grid of ALL modules. The paid modules
// are $5/mo each; the Website Builder is free/included. Selecting a module
// flows into the existing tenant signup path. The splash-scope theme is applied
// live by ThemeManager. Renders under the root layout (shared header + Login).

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { getPublicModules, type PublicModule } from '@/lib/api';

// Per-slug presentation (emoji + short tagline) layered over catalog data.
const META: Record<string, { icon: string; tagline: string }> = {
  'invoice-milestones': { icon: '💰', tagline: 'From scope to payment, automated' },
  contracting: { icon: '📝', tagline: 'Smart contracts, simplified' },
  'help-ticket': { icon: '🎫', tagline: 'Support that actually helps' },
  'knowledge-base': { icon: '📚', tagline: 'Always-current how-to articles' },
  'data-collection': { icon: '📋', tagline: 'Forms and data, organized' },
  'project-management': { icon: '🗂️', tagline: 'Plans, tasks, and delivery' },
  'file-management': { icon: '📁', tagline: 'Files where your work lives' },
  'training-lms': { icon: '🎓', tagline: 'Onboard and train your team' },
  accounting: { icon: '🧮', tagline: 'Books that keep themselves' },
  'crm-plus': { icon: '🤝', tagline: 'Relationships that convert' },
  'website-builder': { icon: '🌐', tagline: 'Your professional site, free' },
};

const FALLBACK: PublicModule[] = [
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

function priceLabel(m: PublicModule): { text: string; free: boolean } {
  const isWebsite = m.slug === 'website-builder' || m.monthly_price === 0;
  if (isWebsite) return { text: 'Free • Included', free: true };
  return { text: `$${(m.monthly_price / 100).toFixed(0)}/mo`, free: false };
}

export default function ModulesPage() {
  const [modules, setModules] = useState<PublicModule[]>(FALLBACK);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    getPublicModules()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setModules(list);
      })
      .catch(() => {
        /* keep fallback catalog */
      });
  }, []);

  const ordered = useMemo(
    () => [...modules].sort((a, b) => a.display_order - b.display_order),
    [modules]
  );
  const selectedModule = ordered.find((m) => m.slug === selected) || null;

  return (
    <div className="min-h-screen bg-page py-12">
      <div className="max-w-content mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            Choose your modules
          </h1>
          <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
            Start with one core module free for 5 years — add any others for just
            $5/month each. The Website Builder is always free and included.
          </p>
        </div>

        {/* Modules grid — all modules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {ordered.map((m) => {
            const meta = META[m.slug] || { icon: '🧩', tagline: '' };
            const price = priceLabel(m);
            const isSelected = selected === m.slug;
            return (
              <Card
                key={m.id}
                variant={isSelected ? 'outlined' : 'elevated'}
                padding="lg"
                className={`cursor-pointer transition-all hover:shadow-lg flex flex-col ${
                  isSelected ? 'border-2 border-primary ring-4 ring-primary/20' : ''
                }`}
                onClick={() => setSelected(isSelected ? null : m.slug)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="text-4xl mb-3">{meta.icon}</div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        price.free
                          ? 'bg-financial-50 text-financial-500'
                          : 'bg-primary-50 text-primary-700'
                      }`}
                    >
                      {price.text}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{m.name}</CardTitle>
                  {meta.tagline && (
                    <CardDescription className="text-primary font-medium">
                      {meta.tagline}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-foreground/70 flex-1">{m.description}</p>
                  <div className="mt-4">
                    <span
                      className={`inline-flex items-center text-sm font-medium ${
                        isSelected ? 'text-primary-700' : 'text-primary'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Select this module'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom info */}
        <div className="text-center">
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div>
              <div className="text-3xl mb-2">💳</div>
              <p className="text-sm text-foreground/70">
                No card required to start your free module.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm text-foreground/70">
                AI tailors each module to your business.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">🚀</div>
              <p className="text-sm text-foreground/70">
                Be up and running in minutes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky selection CTA → existing signup path */}
      {selectedModule && (
        <div className="sticky bottom-0 bg-background border-t-2 border-primary shadow-lg p-5 rounded-t-card">
          <div className="max-w-content mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{(META[selectedModule.slug] || { icon: '🧩' }).icon}</div>
              <div>
                <h3 className="text-lg font-semibold text-ink">{selectedModule.name}</h3>
                <p className="text-sm text-foreground/70">
                  {priceLabel(selectedModule).free
                    ? 'Free • Included'
                    : 'Free for 5 years as your core module • 10 seats included'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="lg" onClick={() => setSelected(null)}>
                Change
              </Button>
              <Link href={`/register?module=${selectedModule.slug}`}>
                <Button variant="primary" size="lg">
                  Continue to setup →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
