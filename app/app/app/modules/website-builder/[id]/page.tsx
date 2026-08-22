"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import TenantShell from "@/components/tenant/TenantShell";
import { Button, Card, CardContent, Input, Textarea } from "@/components/ui";
import {
  getWebsite,
  updateWebsite,
  setWebsitePublished,
  addWebsiteBlock,
  updateWebsiteBlock,
  deleteWebsiteBlock,
  reorderWebsiteBlocks,
  type WebsiteDetail,
  type WebsiteBlock,
  type BlockType,
} from "@/lib/api";

const BLOCK_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: "heading", label: "Heading", icon: "🔠" },
  { type: "text", label: "Text", icon: "📝" },
  { type: "image", label: "Image", icon: "🖼️" },
  { type: "button", label: "Button", icon: "🔘" },
];

function defaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "New heading" };
    case "text":
      return { text: "Some text..." };
    case "image":
      return { url: "", alt: "" };
    case "button":
      return { label: "Click me", url: "#" };
    default:
      return {};
  }
}

export default function WebsiteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [site, setSite] = useState<WebsiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const w = await getWebsite(id);
      setSite(w);
      setName(w.name);
      setSlug(w.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load website");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!Number.isNaN(id)) load();
  }, [id, load]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  }

  async function saveInfo() {
    setSaving(true);
    setError("");
    try {
      const w = await updateWebsite(id, { name, slug });
      setSite(w);
      setSlug(w.slug);
      flash("Site info saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!site) return;
    try {
      const w = await setWebsitePublished(id, !site.published);
      setSite(w);
      flash(w.published ? "Site published." : "Site unpublished.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update publish state");
    }
  }

  async function addBlock(type: BlockType) {
    try {
      await addWebsiteBlock(id, { block_type: type, content: defaultContent(type) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add block");
    }
  }

  async function saveBlock(block: WebsiteBlock, content: Record<string, unknown>) {
    try {
      await updateWebsiteBlock(id, block.id, { content });
      await load();
      flash("Block saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save block");
    }
  }

  async function removeBlock(blockId: number) {
    try {
      await deleteWebsiteBlock(id, blockId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete block");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    if (!site) return;
    const blocks = [...site.blocks];
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    const items = blocks.map((b, i) => ({ id: b.id, position: i }));
    // optimistic
    setSite({ ...site, blocks: blocks.map((b, i) => ({ ...b, position: i })) });
    try {
      await reorderWebsiteBlocks(id, items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder");
      await load();
    }
  }

  if (loading) {
    return (
      <TenantShell>
        <p className="text-neutral-500">Loading editor...</p>
      </TenantShell>
    );
  }

  if (!site) {
    return (
      <TenantShell>
        <div className="rounded-md bg-destructive-50 text-destructive px-4 py-3 text-sm">
          {error || "Website not found."}
        </div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/app/modules/website-builder")}
        >
          Back to sites
        </Button>
      </TenantShell>
    );
  }

  return (
    <TenantShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/app/modules/website-builder")}
            className="text-sm text-neutral-500 hover:text-secondary mb-1"
          >
            ← Back to sites
          </button>
          <h1 className="text-2xl font-bold text-ink">{site.name}</h1>
          <p className="text-neutral-400 text-sm">/{site.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {site.published && (
            <a href={`/site/${site.slug}`} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">
                View live
              </Button>
            </a>
          )}
          <Button
            variant={site.published ? "outline" : "financial"}
            onClick={togglePublish}
          >
            {site.published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive-50 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-md bg-constructive-50 text-constructive px-4 py-3 text-sm">
          {notice}
        </div>
      )}

      {/* Site info */}
      <Card className="mb-6">
        <CardContent className="py-5 space-y-4">
          <h2 className="font-semibold text-ink">Site settings</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Name
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Slug (public URL)
              </label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <Button variant="primary" onClick={saveInfo} disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Blocks */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-ink">Content blocks</h2>
        <div className="flex gap-2">
          {BLOCK_TYPES.map((b) => (
            <Button
              key={b.type}
              variant="outline"
              size="sm"
              onClick={() => addBlock(b.type)}
            >
              + {b.label}
            </Button>
          ))}
        </div>
      </div>

      {site.blocks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-neutral-500">
            No content yet. Add a block above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {site.blocks.map((block, i) => (
            <BlockEditor
              key={block.id}
              block={block}
              isFirst={i === 0}
              isLast={i === site.blocks.length - 1}
              onSave={(content) => saveBlock(block, content)}
              onDelete={() => removeBlock(block.id)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))}
        </div>
      )}
    </TenantShell>
  );
}

function BlockEditor({
  block,
  isFirst,
  isLast,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: WebsiteBlock;
  isFirst: boolean;
  isLast: boolean;
  onSave: (content: Record<string, unknown>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [content, setContent] = useState<Record<string, unknown>>(block.content);

  useEffect(() => {
    setContent(block.content);
  }, [block.content]);

  function set(key: string, value: string) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  const str = (k: string) => (content[k] as string) ?? "";

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
            {block.block_type}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={isFirst}>
              ↑
            </Button>
            <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast}>
              ↓
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>

        {block.block_type === "heading" && (
          <Input value={str("text")} onChange={(e) => set("text", e.target.value)} />
        )}
        {block.block_type === "text" && (
          <Textarea
            value={str("text")}
            onChange={(e) => set("text", e.target.value)}
            rows={3}
          />
        )}
        {block.block_type === "image" && (
          <div className="space-y-2">
            <Input
              placeholder="Image URL"
              value={str("url")}
              onChange={(e) => set("url", e.target.value)}
            />
            <Input
              placeholder="Alt text"
              value={str("alt")}
              onChange={(e) => set("alt", e.target.value)}
            />
          </div>
        )}
        {block.block_type === "button" && (
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              placeholder="Button label"
              value={str("label")}
              onChange={(e) => set("label", e.target.value)}
            />
            <Input
              placeholder="Link URL"
              value={str("url")}
              onChange={(e) => set("url", e.target.value)}
            />
          </div>
        )}

        <div className="mt-3">
          <Button variant="primary" size="sm" onClick={() => onSave(content)}>
            Save block
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
