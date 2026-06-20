'use client';

import * as React from 'react';
import { ImagePlus, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, api, uploadDirect } from '@/lib/api';
import { API_PATHS, ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface UploadedPhoto {
  id: string;
  url: string;
}

interface PhotoUploadProps {
  museumId: string;
  onUploaded?: (photo: UploadedPhoto) => void;
  className?: string;
}

type ItemStatus = 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  fileName: string;
  status: ItemStatus;
  error?: string;
}

// Lightweight drag-and-drop photo uploader that uses the new
// `POST /admin/upload/direct` (multipart) endpoint and then attaches
// the returned fileUrl to a museum via `POST /admin/museums/:id/photos`.
//
// Intentionally has no third-party drag-and-drop dependency — uses
// the native HTML5 drag events instead.
export function PhotoUpload({ museumId, onUploaded, className }: PhotoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const counter = React.useRef(0);

  const setItem = React.useCallback(
    (id: string, patch: Partial<QueueItem>) => {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    },
    [],
  );

  const validate = React.useCallback((file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return `Unsupported type: ${file.type || 'unknown'}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (max ${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB)`;
    }
    return null;
  }, []);

  const uploadFile = React.useCallback(
    async (file: File, index: number) => {
      const id = `${Date.now()}-${++counter.current}`;
      setItems((prev) => [
        ...prev,
        { id, fileName: file.name, status: 'uploading' },
      ]);

      const validationError = validate(file);
      if (validationError) {
        setItem(id, { status: 'error', error: validationError });
        toast.error(`${file.name}: ${validationError}`);
        return;
      }

      try {
        const { fileUrl } = await uploadDirect(file);
        const photo = await api.post<UploadedPhoto>(
          API_PATHS.ADMIN_MUSEUM_PHOTOS(museumId),
          { url: fileUrl, orderIdx: index },
        );
        setItem(id, { status: 'done' });
        onUploaded?.(photo);
      } catch (err) {
        const msg =
          err instanceof ApiError
            ? `${err.statusCode}: ${err.message}`
            : err instanceof Error
              ? err.message
              : 'Unknown error';
        setItem(id, { status: 'error', error: msg });
        // Use toast if available; otherwise alert is the fallback (sonner is
        // mounted in `components/layout/providers.tsx`, so toast is fine here).
        toast.error(`${file.name}: ${msg}`);
      }
    },
    [museumId, onUploaded, setItem, validate],
  );

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      for (let i = 0; i < list.length; i++) {
        // Sequential upload to keep order stable and avoid server overload.
        // eslint-disable-next-line no-await-in-loop
        await uploadFile(list[i], i);
      }
    },
    [uploadFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // reset so selecting the same file again re-triggers onChange
      e.target.value = '';
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onZoneClick = () => inputRef.current?.click();
  const onZoneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const isUploading = items.some((it) => it.status === 'uploading');

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={onZoneClick}
        onKeyDown={onZoneKeyDown}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          isUploading && 'opacity-80',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onInputChange}
          className="hidden"
        />
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          Drag &amp; drop or click to upload
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP &middot; max{' '}
          {Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB
        </p>
      </div>

      {items.length > 0 && (
        <ul className="space-y-1 text-xs">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1"
            >
              <span className="truncate">{it.fileName}</span>
              {it.status === 'uploading' && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> uploading
                </span>
              )}
              {it.status === 'done' && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> done
                </span>
              )}
              {it.status === 'error' && (
                <span
                  className="flex items-center gap-1 text-destructive"
                  title={it.error}
                >
                  <XCircle className="h-3 w-3" /> error
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PhotoUpload;
