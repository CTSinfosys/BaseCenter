'use client';

// Phase 2B — Super Admin content editor for one managed page ("website" |
// "splash"). Ordered, drag-and-drop section cards with show/hide, edit, add,
// duplicate and delete. Editing a section opens a per-type form (with image
// upload widgets); saving replaces the section's content blob.

import { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui';
import ImageField from '@/components/admin/ImageField';
import {
  getAdminContent,
  getSectionTypes,
  addSection,
  updateSection,
  setSectionVisibility,
  deleteSection,
  duplicateSection,
  reorderSections,
  type PageSection,
  type SectionTypeInfo,
  type ContentPage,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Field schema per section type (drives the edit forms).
// ---------------------------------------------------------------------------
type FieldKind = 'text' | 'textarea' | 'image' | 'checkbox' | 'select' | 'items' | 'strings';
interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  // For 'items': subfields of each item.
  itemFields?: Field[];
  help?: string;
}

const SCHEMA: Record<string, Field[]> = {
  hero: [
    { key: 'headline', label: 'Headline', kind: 'text' },
    { key: 'subheadline', label: 'Subheadline', kind: 'textarea' },
    { key: 'background_image', label: 'Background image', kind: 'image' },
    { key: 'primary_cta_text', label: 'Primary button text', kind: 'text' },
    { key: 'primary_cta_link', label: 'Primary button link', kind: 'text' },
    { key: 'secondary_cta_text', label: 'Secondary button text', kind: 'text' },
    { key: 'secondary_cta_link', label: 'Secondary button link', kind: 'text' },
    { key: 'note', label: 'Small note under buttons', kind: 'text' },
  ],
  rich_text: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'textarea' },
    {
      key: 'align',
      label: 'Alignment',
      kind: 'select',
      options: [
        { value: 'center', label: 'Center' },
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ],
    },
  ],
  feature_grid: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'intro', label: 'Intro', kind: 'textarea' },
    {
      key: 'columns',
      label: 'Columns',
      kind: 'select',
      options: [
        { value: '2', label: '2 columns' },
        { value: '3', label: '3 columns' },
      ],
    },
    {
      key: 'items',
      label: 'Cards',
      kind: 'items',
      itemFields: [
        { key: 'icon', label: 'Icon / emoji', kind: 'text' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'text', label: 'Text', kind: 'textarea' },
        { key: 'link', label: 'Link (optional)', kind: 'text' },
      ],
    },
  ],
  modules_grid: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'intro', label: 'Intro', kind: 'textarea', help: 'The module cards are pulled live from the catalog (all modules, free one badged).' },
  ],
  steps: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'intro', label: 'Intro', kind: 'textarea' },
    {
      key: 'steps',
      label: 'Steps',
      kind: 'items',
      itemFields: [
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'text', label: 'Text', kind: 'textarea' },
      ],
    },
  ],
  pricing: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'intro', label: 'Intro', kind: 'textarea' },
    {
      key: 'tiers',
      label: 'Tiers',
      kind: 'items',
      itemFields: [
        { key: 'name', label: 'Name', kind: 'text' },
        { key: 'price', label: 'Price', kind: 'text' },
        { key: 'period', label: 'Period', kind: 'text' },
        { key: 'highlight', label: 'Highlight (Most Popular)', kind: 'checkbox' },
        { key: 'features', label: 'Features', kind: 'strings' },
      ],
    },
    { key: 'note', label: 'Footnote', kind: 'textarea' },
  ],
  cta_banner: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'text', label: 'Text', kind: 'textarea' },
    { key: 'cta_text', label: 'Button text', kind: 'text' },
    { key: 'cta_link', label: 'Button link', kind: 'text' },
    { key: 'note', label: 'Small note', kind: 'text' },
  ],
  image: [
    { key: 'url', label: 'Image', kind: 'image' },
    { key: 'alt', label: 'Alt text', kind: 'text' },
    { key: 'caption', label: 'Caption', kind: 'text' },
  ],
  image_text: [
    { key: 'url', label: 'Image', kind: 'image' },
    { key: 'alt', label: 'Alt text', kind: 'text' },
    {
      key: 'image_side',
      label: 'Image side',
      kind: 'select',
      options: [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
      ],
    },
    { key: 'heading', label: 'Heading', kind: 'text' },
    { key: 'body', label: 'Body', kind: 'textarea' },
    { key: 'cta_text', label: 'Button text', kind: 'text' },
    { key: 'cta_link', label: 'Button link', kind: 'text' },
  ],
  faq: [
    { key: 'heading', label: 'Heading', kind: 'text' },
    {
      key: 'items',
      label: 'Questions',
      kind: 'items',
      itemFields: [
        { key: 'question', label: 'Question', kind: 'text' },
        { key: 'answer', label: 'Answer', kind: 'textarea' },
      ],
    },
  ],
  html: [{ key: 'html', label: 'HTML', kind: 'textarea' }],
};

function summarize(section: PageSection): string {
  const c = section.content as Record<string, any>;
  return (
    c.headline || c.heading || c.name || c.cta_text || c.caption || c.body || ''
  )
    .toString()
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Field editors
// ---------------------------------------------------------------------------
const inputCls =
  'w-full rounded border border-hairline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

function StringsEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const list = Array.isArray(value) ? value : [];
  return (
    <div className="space-y-2">
      {list.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={inputCls}
            value={s}
            onChange={(e) => {
              const next = [...list];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className="text-destructive text-sm px-2"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-primary text-sm font-medium"
        onClick={() => onChange([...list, ''])}
      >
        + Add item
      </button>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.kind === 'items') {
    const items: any[] = Array.isArray(value) ? value : [];
    const blank = () =>
      Object.fromEntries((field.itemFields || []).map((f) => [f.key, f.kind === 'checkbox' ? false : f.kind === 'strings' ? [] : '']));
    return (
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-card border border-hairline p-3 bg-neutral-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">Item {idx + 1}</span>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  disabled={idx === 0}
                  className="text-neutral-500 disabled:opacity-30"
                  onClick={() => {
                    const next = [...items];
                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                    onChange(next);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={idx === items.length - 1}
                  className="text-neutral-500 disabled:opacity-30"
                  onClick={() => {
                    const next = [...items];
                    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                    onChange(next);
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-destructive"
                  onClick={() => onChange(items.filter((_, j) => j !== idx))}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {(field.itemFields || []).map((sf) => (
                <FieldEditor
                  key={sf.key}
                  field={sf}
                  value={item[sf.key]}
                  onChange={(v) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], [sf.key]: v };
                    onChange(next);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-primary text-sm font-medium"
          onClick={() => onChange([...items, blank()])}
        >
          + Add {field.label.toLowerCase()}
        </button>
      </div>
    );
  }

  if (field.kind === 'strings') {
    return (
      <div>
        <label className="block text-sm font-medium text-ink mb-1">{field.label}</label>
        <StringsEditor value={value} onChange={onChange} />
      </div>
    );
  }

  if (field.kind === 'image') {
    return <ImageField label={field.label} value={value || ''} onChange={onChange} />;
  }

  if (field.kind === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }

  if (field.kind === 'select') {
    return (
      <div>
        <label className="block text-sm font-medium text-ink mb-1">{field.label}</label>
        <select
          className={inputCls}
          value={value ?? field.options?.[0]?.value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">{field.label}</label>
      {field.kind === 'textarea' ? (
        <textarea
          className={inputCls}
          rows={4}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputCls}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.help && <p className="mt-1 text-xs text-neutral-400">{field.help}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section edit form
// ---------------------------------------------------------------------------
function SectionForm({
  section,
  onSaved,
  onCancel,
}: {
  section: PageSection;
  onSaved: (s: PageSection) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, any>>({ ...(section.content as any) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fields = SCHEMA[section.type] || [];

  // Normalize columns to number on save.
  async function save() {
    setError('');
    setBusy(true);
    try {
      const payload: Record<string, any> = { ...draft };
      if ('columns' in payload) payload.columns = Number(payload.columns) || 3;
      const updated = await updateSection(section.id, payload);
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-hairline mt-3 pt-4 space-y-4">
      {fields.map((f) => (
        <FieldEditor
          key={f.key}
          field={f}
          value={draft[f.key]}
          onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
        />
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button variant="primary" size="sm" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save section'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable card
// ---------------------------------------------------------------------------
function SortableCard({
  section,
  typeLabel,
  expanded,
  onToggleExpand,
  onSaved,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  busy,
}: {
  section: PageSection;
  typeLabel: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onSaved: (s: PageSection) => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-card border border-hairline bg-background p-4"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-neutral-400 px-1"
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">{typeLabel}</span>
            {!section.is_visible && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">
                Hidden
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 truncate">
            {summarize(section) || <span className="italic">No text</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            className="text-neutral-500 hover:text-primary"
            onClick={onToggleVisibility}
            disabled={busy}
            title={section.is_visible ? 'Hide' : 'Show'}
          >
            {section.is_visible ? '👁️' : '🚫'}
          </button>
          <button
            type="button"
            className="text-neutral-500 hover:text-primary"
            onClick={onDuplicate}
            disabled={busy}
            title="Duplicate"
          >
            ⧉
          </button>
          <button
            type="button"
            className="text-neutral-500 hover:text-destructive"
            onClick={onDelete}
            disabled={busy}
            title="Delete"
          >
            🗑️
          </button>
          <Button variant="outline" size="sm" onClick={onToggleExpand}>
            {expanded ? 'Close' : 'Edit'}
          </Button>
        </div>
      </div>
      {expanded && (
        <SectionForm section={section} onSaved={onSaved} onCancel={onToggleExpand} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------
export default function ContentEditor({ page }: { page: ContentPage }) {
  const [sections, setSections] = useState<PageSection[]>([]);
  const [types, setTypes] = useState<SectionTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [addType, setAddType] = useState('');
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [secs, tps] = await Promise.all([getAdminContent(page), getSectionTypes()]);
      setSections(secs);
      setTypes(tps);
      if (tps.length && !addType) setAddType(tps[0].type);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [page, addType]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const typeLabel = (t: string) => types.find((x) => x.type === t)?.label || t;

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2500);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);
    try {
      await reorderSections(page, reordered.map((s) => s.id));
      flash('Order saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed');
      load();
    }
  }

  async function handleAdd() {
    if (!addType) return;
    setAdding(true);
    setError('');
    try {
      const created = await addSection(page, addType);
      setSections((s) => [...s, created]);
      setExpandedId(created.id);
      flash('Section added');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleVisibility(sec: PageSection) {
    setBusyId(sec.id);
    try {
      const updated = await setSectionVisibility(sec.id, !sec.is_visible);
      setSections((s) => s.map((x) => (x.id === sec.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(sec: PageSection) {
    setBusyId(sec.id);
    try {
      const clone = await duplicateSection(sec.id);
      setSections((s) => [...s, clone]);
      flash('Section duplicated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duplicate failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(sec: PageSection) {
    if (!confirm('Delete this section? This cannot be undone.')) return;
    setBusyId(sec.id);
    try {
      await deleteSection(sec.id);
      setSections((s) => s.filter((x) => x.id !== sec.id));
      flash('Section deleted');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-neutral-500">Loading content…</p>;

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-card border border-constructive bg-constructive-50 px-4 py-2 text-sm text-ink">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-card border border-destructive bg-destructive-50 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add section */}
      <div className="flex items-end gap-3 rounded-card border border-hairline bg-neutral-50 p-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-ink mb-1">Add a section</label>
          <select
            className={inputCls}
            value={addType}
            onChange={(e) => setAddType(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label} — {t.description}
              </option>
            ))}
          </select>
        </div>
        <Button variant="primary" size="md" onClick={handleAdd} disabled={adding}>
          {adding ? 'Adding…' : '+ Add'}
        </Button>
      </div>

      {sections.length === 0 ? (
        <p className="text-neutral-500 text-sm">No sections yet. Add one above.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((sec) => (
                <SortableCard
                  key={sec.id}
                  section={sec}
                  typeLabel={typeLabel(sec.type)}
                  expanded={expandedId === sec.id}
                  onToggleExpand={() =>
                    setExpandedId((id) => (id === sec.id ? null : sec.id))
                  }
                  onSaved={(updated) => {
                    setSections((s) => s.map((x) => (x.id === updated.id ? updated : x)));
                    setExpandedId(null);
                    flash('Section saved');
                  }}
                  onToggleVisibility={() => handleToggleVisibility(sec)}
                  onDuplicate={() => handleDuplicate(sec)}
                  onDelete={() => handleDelete(sec)}
                  busy={busyId === sec.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
