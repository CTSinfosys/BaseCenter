'use client';

// Phase 2B — presentational renderers for CMS page sections.
// Each section type maps to one component. Content is a flexible JSON blob
// (shape depends on `type`). Styling uses the Batch-1 theme CSS variables via
// Tailwind classes (bg-primary, text-ink, etc.), so themes apply automatically.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import type { PublicModule } from '@/lib/api';

type Content = Record<string, any>;

// ---------------------------------------------------------------------------
// Per-slug presentation for modules (emoji + tagline) layered over catalog data.
// ---------------------------------------------------------------------------
const MODULE_META: Record<string, { icon: string; tagline: string }> = {
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

function moduleIsFree(m: PublicModule): boolean {
  return m.slug === 'website-builder' || m.monthly_price === 0;
}

// ---------------------------------------------------------------------------
// Section components
// ---------------------------------------------------------------------------
function Hero({ c }: { c: Content }) {
  const bg = c.background_image as string | undefined;
  return (
    <section
      className="relative bg-gradient-to-b from-primary-50 to-background pt-20 pb-28"
      style={
        bg
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="max-w-content mx-auto px-6 text-center">
        <h1
          className={`text-5xl md:text-6xl font-bold mb-6 leading-tight ${
            bg ? 'text-white' : 'text-ink'
          }`}
        >
          {c.headline}
        </h1>
        {c.subheadline && (
          <p
            className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto ${
              bg ? 'text-white/90' : 'text-foreground/80'
            }`}
          >
            {c.subheadline}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {c.primary_cta_text && (
            <Link href={c.primary_cta_link || '/modules'}>
              <Button variant="primary" size="lg" className="text-lg px-8 py-4">
                {c.primary_cta_text}
              </Button>
            </Link>
          )}
          {c.secondary_cta_text && (
            <Link href={c.secondary_cta_link || '#'}>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                {c.secondary_cta_text}
              </Button>
            </Link>
          )}
        </div>
        {c.note && (
          <p className={`mt-6 text-sm ${bg ? 'text-white/80' : 'text-foreground/60'}`}>
            {c.note}
          </p>
        )}
      </div>
    </section>
  );
}

function RichText({ c }: { c: Content }) {
  const align = (c.align as string) || 'center';
  const alignCls = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  return (
    <section className="py-16 bg-background">
      <div className="max-w-content mx-auto px-6">
        <div className={`max-w-3xl mx-auto ${alignCls}`}>
          {c.heading && (
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">{c.heading}</h2>
          )}
          {c.body && (
            <div className="text-lg text-foreground/80 leading-relaxed whitespace-pre-line">
              {c.body}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid({ c }: { c: Content }) {
  const cols = Number(c.columns) === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  const items: Content[] = Array.isArray(c.items) ? c.items : [];
  return (
    <section className="py-16 bg-primary-50">
      <div className="max-w-content mx-auto px-6">
        {(c.heading || c.intro) && (
          <div className="max-w-3xl mx-auto text-center mb-12">
            {c.heading && (
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">{c.heading}</h2>
            )}
            {c.intro && <p className="text-lg text-foreground/80">{c.intro}</p>}
          </div>
        )}
        <div className={`grid ${cols} gap-8`}>
          {items.map((it, i) => (
            <Card key={i} variant="elevated" padding="lg">
              <div className="text-center">
                {it.icon && <div className="text-4xl mb-4">{it.icon}</div>}
                {it.title && (
                  <h3 className="text-xl font-semibold text-ink mb-3">{it.title}</h3>
                )}
                {it.text && <p className="text-foreground/70 whitespace-pre-line">{it.text}</p>}
                {it.link && (
                  <div className="mt-4">
                    <Link href={it.link} className="text-primary font-medium">
                      Learn more →
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Steps({ c }: { c: Content }) {
  const steps: Content[] = Array.isArray(c.steps) ? c.steps : [];
  return (
    <section className="py-16 bg-background">
      <div className="max-w-content mx-auto px-6">
        {(c.heading || c.intro) && (
          <div className="text-center mb-12">
            {c.heading && (
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">{c.heading}</h2>
            )}
            {c.intro && <p className="text-lg text-foreground/70">{c.intro}</p>}
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                {i + 1}
              </div>
              {s.title && (
                <h3 className="text-xl font-semibold text-ink mb-3">{s.title}</h3>
              )}
              {s.text && <p className="text-foreground/70">{s.text}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ c }: { c: Content }) {
  const tiers: Content[] = Array.isArray(c.tiers) ? c.tiers : [];
  return (
    <section className="py-16 bg-background">
      <div className="max-w-content mx-auto px-6">
        {(c.heading || c.intro) && (
          <div className="text-center mb-12">
            {c.heading && (
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">{c.heading}</h2>
            )}
            {c.intro && <p className="text-lg text-foreground/70">{c.intro}</p>}
          </div>
        )}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((t, i) => (
            <Card
              key={i}
              variant={t.highlight ? 'outlined' : 'elevated'}
              padding="lg"
              className={t.highlight ? 'relative border-2 border-primary' : 'relative'}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-ink">{t.price}</span>
                  {t.period && <span className="text-foreground/70">{t.period}</span>}
                </div>
              </CardHeader>
              <CardContent className="mt-6">
                <ul className="space-y-3 text-foreground/70">
                  {(Array.isArray(t.features) ? t.features : []).map((f: string, j: number) => (
                    <li key={j} className="flex items-start">
                      <span className="text-primary mr-2">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        {c.note && (
          <div className="mt-12 text-center">
            <p className="text-sm text-foreground/60">{c.note}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function CtaBanner({ c }: { c: Content }) {
  return (
    <section className="py-16 bg-background">
      <div className="max-w-3xl mx-auto px-6 text-center">
        {c.heading && (
          <h2 className="text-3xl md:text-4xl font-bold text-ink mb-6">{c.heading}</h2>
        )}
        {c.text && <p className="text-lg text-foreground/80 mb-8">{c.text}</p>}
        {c.cta_text && (
          <Link href={c.cta_link || '/modules'}>
            <Button variant="primary" size="lg" className="text-xl px-12 py-5">
              {c.cta_text}
            </Button>
          </Link>
        )}
        {c.note && <p className="mt-6 text-sm text-foreground/60">{c.note}</p>}
      </div>
    </section>
  );
}

function ImageBlock({ c }: { c: Content }) {
  if (!c.url) return null;
  return (
    <section className="py-12 bg-background">
      <div className="max-w-content mx-auto px-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={c.url}
          alt={c.alt || ''}
          className="mx-auto rounded-card max-h-[520px] w-auto"
        />
        {c.caption && (
          <p className="mt-3 text-sm text-foreground/60">{c.caption}</p>
        )}
      </div>
    </section>
  );
}

function ImageText({ c }: { c: Content }) {
  const imageRight = (c.image_side as string) === 'right';
  const img = c.url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={c.url} alt={c.alt || ''} className="rounded-card w-full object-cover" />
  ) : (
    <div className="rounded-card bg-primary-50 aspect-video" />
  );
  const text = (
    <div>
      {c.heading && (
        <h2 className="text-3xl font-bold text-ink mb-4">{c.heading}</h2>
      )}
      {c.body && (
        <div className="text-lg text-foreground/80 whitespace-pre-line">{c.body}</div>
      )}
      {c.cta_text && (
        <div className="mt-6">
          <Link href={c.cta_link || '#'}>
            <Button variant="primary" size="md">
              {c.cta_text}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
  return (
    <section className="py-16 bg-background">
      <div className="max-w-content mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {imageRight ? (
            <>
              {text}
              {img}
            </>
          ) : (
            <>
              {img}
              {text}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Faq({ c }: { c: Content }) {
  const items: Content[] = Array.isArray(c.items) ? c.items : [];
  return (
    <section className="py-16 bg-primary-50">
      <div className="max-w-content mx-auto px-6">
        {c.heading && (
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-ink">{c.heading}</h2>
          </div>
        )}
        <div className="max-w-3xl mx-auto space-y-4">
          {items.map((it, i) => (
            <details key={i} className="rounded-card border border-hairline bg-background p-5">
              <summary className="cursor-pointer font-semibold text-ink">
                {it.question}
              </summary>
              {it.answer && (
                <p className="mt-3 text-foreground/70 whitespace-pre-line">{it.answer}</p>
              )}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function HtmlBlock({ c }: { c: Content }) {
  const html = String(c.html || '');
  // Minimal sanitization: strip <script> tags and inline event handlers.
  const safe = html
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return (
    <section className="py-12 bg-background">
      <div
        className="max-w-content mx-auto px-6 prose max-w-none"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </section>
  );
}

function ModulesGrid({
  c,
  modules,
}: {
  c: Content;
  modules: PublicModule[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const ordered = useMemo(
    () => [...modules].sort((a, b) => a.display_order - b.display_order),
    [modules]
  );
  const selectedModule = ordered.find((m) => m.slug === selected) || null;

  return (
    <section id="modules" className="py-16 bg-primary-50">
      <div className="max-w-content mx-auto px-6">
        {(c.heading || c.intro) && (
          <div className="text-center mb-12">
            {c.heading && (
              <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">{c.heading}</h2>
            )}
            {c.intro && <p className="text-lg text-foreground/70">{c.intro}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ordered.map((m) => {
            const meta = MODULE_META[m.slug] || { icon: '🧩', tagline: '' };
            const free = moduleIsFree(m);
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
                        free
                          ? 'bg-financial-50 text-financial-500'
                          : 'bg-primary-50 text-primary-700'
                      }`}
                    >
                      {free ? 'Free • Included' : `$${(m.monthly_price / 100).toFixed(0)}/mo`}
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
      </div>

      {selectedModule && (
        <div className="sticky bottom-0 mt-8 bg-background border-t-2 border-primary shadow-lg p-5 rounded-t-card">
          <div className="max-w-content mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl">
                {(MODULE_META[selectedModule.slug] || { icon: '🧩' }).icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">{selectedModule.name}</h3>
                <p className="text-sm text-foreground/70">
                  {moduleIsFree(selectedModule)
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
export interface RenderSection {
  id: number;
  type: string;
  content: Record<string, unknown>;
}

function renderOne(section: RenderSection, modules: PublicModule[]) {
  const c = (section.content || {}) as Content;
  switch (section.type) {
    case 'hero':
      return <Hero c={c} />;
    case 'rich_text':
    case 'text':
      return <RichText c={c} />;
    case 'feature_grid':
    case 'cards':
      return <FeatureGrid c={c} />;
    case 'steps':
    case 'how_it_works':
      return <Steps c={c} />;
    case 'pricing':
      return <Pricing c={c} />;
    case 'cta_banner':
      return <CtaBanner c={c} />;
    case 'image':
      return <ImageBlock c={c} />;
    case 'image_text':
      return <ImageText c={c} />;
    case 'faq':
      return <Faq c={c} />;
    case 'html':
      return <HtmlBlock c={c} />;
    case 'modules_grid':
      return <ModulesGrid c={c} modules={modules} />;
    default:
      return null;
  }
}

export default function SectionRenderer({
  sections,
  modules,
}: {
  sections: RenderSection[];
  modules: PublicModule[];
}) {
  return (
    <>
      {sections.map((s) => (
        <div key={s.id}>{renderOne(s, modules)}</div>
      ))}
    </>
  );
}
