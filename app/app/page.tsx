'use client';

// Public marketing site (route "/"). Content is managed by Super Admins via the
// Content editor (/admin/content) and rendered from the DB as an ordered list of
// visible sections. Falls back to the built-in default content if the content
// API is unreachable or returns nothing, so the page is never blank. The
// website-scope theme is applied live by ThemeManager; shared Navigation +
// Footer come from the root layout.

import { useEffect, useState } from 'react';
import SectionRenderer, { type RenderSection } from '@/components/content/SectionRenderer';
import { WEBSITE_FALLBACK, MODULE_FALLBACK } from '@/components/content/defaults';
import { getPublicContent, getPublicModules, type PublicModule } from '@/lib/api';

export default function HomePage() {
  const [sections, setSections] = useState<RenderSection[]>(WEBSITE_FALLBACK);
  const [modules, setModules] = useState<PublicModule[]>(MODULE_FALLBACK as PublicModule[]);

  useEffect(() => {
    getPublicContent('website')
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
    <div className="min-h-screen">
      <SectionRenderer sections={sections} modules={modules} />
    </div>
  );
}
