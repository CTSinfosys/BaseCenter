'use client';

// Phase 2B — image upload widget for the Content editor. Drag-and-drop or click
// to pick a file; uploads to the SA-protected media endpoint and stores the
// returned public URL. Shows a preview and lets you clear the value.

import { useRef, useState } from 'react';
import { uploadMedia } from '@/lib/api';

export default function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setError('');
    setBusy(true);
    try {
      const res = await uploadMedia(file);
      onChange(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`rounded-card border-2 border-dashed p-4 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary-50' : 'border-hairline'
        }`}
      >
        {value ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="mx-auto max-h-40 rounded" />
            <div className="flex items-center justify-center gap-3 text-sm">
              <button
                type="button"
                className="text-primary font-medium"
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </button>
              <button
                type="button"
                className="text-destructive font-medium"
                onClick={() => onChange('')}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">
              {busy ? 'Uploading…' : 'Drag & drop an image here, or'}
            </p>
            {!busy && (
              <button
                type="button"
                className="text-primary font-medium text-sm"
                onClick={() => inputRef.current?.click()}
              >
                choose a file
              </button>
            )}
            <p className="text-xs text-neutral-400">JPEG, PNG, GIF, WEBP or SVG · up to 5 MB</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {value && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded border border-hairline px-2 py-1 text-xs text-neutral-500"
          placeholder="Image URL"
        />
      )}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
}
