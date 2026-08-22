"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicSite, type PublicWebsite, type WebsiteBlock } from "@/lib/api";

export default function PublicSitePage() {
  const params = useParams();
  const slug = String(params.slug);
  const [site, setSite] = useState<PublicWebsite | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getPublicSite(slug)
      .then(setSite)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-400">
        Loading...
      </div>
    );
  }

  if (notFound || !site) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-3xl font-bold text-ink mb-2">Site not available</h1>
        <p className="text-neutral-500">
          This site does not exist or has not been published.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        {site.blocks.map((block) => (
          <RenderBlock key={block.id} block={block} />
        ))}
      </main>
      <footer className="text-center text-xs text-neutral-300 py-8">
        Built with BaseCenter.ai
      </footer>
    </div>
  );
}

function RenderBlock({ block }: { block: WebsiteBlock }) {
  const c = block.content as Record<string, string>;
  switch (block.block_type) {
    case "heading":
      return <h2 className="text-3xl font-bold text-ink">{c.text}</h2>;
    case "text":
      return (
        <p className="text-lg text-neutral-700 whitespace-pre-wrap leading-relaxed">
          {c.text}
        </p>
      );
    case "image":
      return c.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.url}
          alt={c.alt || ""}
          className="w-full rounded-lg object-cover"
        />
      ) : null;
    case "button":
      return (
        <div>
          <a
            href={c.url || "#"}
            className="inline-flex items-center px-6 py-3 rounded-md bg-primary text-white font-medium hover:bg-primary-700 transition-colors"
          >
            {c.label || "Button"}
          </a>
        </div>
      );
    default:
      return null;
  }
}
