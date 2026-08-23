'use client';

// Phase 2B — SA "Content" area. Two managed pages, each an ordered list of
// sections editable with drag-and-drop, show/hide, add, duplicate and delete:
//   • Public Website  (route /)
//   • Intro / Splash  (route /modules)

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import ContentEditor from '@/components/admin/ContentEditor';
import { type ContentPage } from '@/lib/api';

const TABS: { page: ContentPage; label: string; hint: string; preview: string }[] = [
  { page: 'website', label: 'Public Website', hint: 'The marketing site at /.', preview: '/' },
  { page: 'splash', label: 'Intro / Splash', hint: 'The module selection screen at /modules.', preview: '/modules' },
];

export default function ContentPageAdmin() {
  const [active, setActive] = useState<ContentPage>('website');

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Content</h1>
        <p className="text-neutral-500 mt-1">
          Manage the sections shown on your public pages. Changes are applied live —
          no redeploy needed.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-hairline mb-6">
        {TABS.map((t) => (
          <button
            key={t.page}
            onClick={() => setActive(t.page)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.page
                ? 'border-primary text-primary-700'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) =>
        t.page === active ? (
          <div key={t.page} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">{t.hint}</p>
              <a
                href={t.preview}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary font-medium"
              >
                Open preview ↗
              </a>
            </div>
            <ContentEditor page={t.page} />
          </div>
        ) : null
      )}
    </AdminShell>
  );
}
