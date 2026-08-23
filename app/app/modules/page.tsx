'use client';

// Intro / Splash screen (route "/modules"). Content is managed by Super Admins
// via the Content editor (/admin/content) under the "splash" scope and rendered
// from the DB as an ordered list of visible sections. The modules_grid section
// shows ALL modules (free one badged) and drives the select → /register flow.
// Falls back to built-in defaults if the content API is unreachable or empty.
// The splash-scope theme is applied live by ThemeManager; shared header + Login
// come from the root layout.

import { useEffect, useState } from 'react';
import SectionRenderer, { type RenderSection } from '@/components/content/SectionRenderer';
import { SPLASH_FALLBACK, MODULE_FALLBACK } from '@/components/content/defaults';
import { getPublicContent, getPublicModules, type PublicModule } from '@/lib/api';

export default function ModulesPage() {
  const [sections, setSections] = useState<RenderSection[]>(SPLASH_FALLBACK);
  const [modules, setModules] = useState<PublicModule[]>(MODULE_FALLBACK as PublicModule[]);

  useEffect(() => {
    getPublicContent('splash')
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setSections(list as RenderSection[]);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
    getPublicModules()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) setModules(list);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return (
    <div className="min-h-screen bg-page py-12">
      <SectionRenderer sections={sections} modules={modules} />
    </div>
  );
}
