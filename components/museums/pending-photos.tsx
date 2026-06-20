'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MAX_FILE_SIZE } from '@/lib/constants';

interface PendingPhotosProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

/**
 * Photo picker for the *create* flow — buffers files locally until the museum
 * is saved (we need an ID before we can attach photos to it).
 *
 * Used only on the "new museum" / "new historical place" forms.
 * For the edit flow use <PhotoUpload> instead, which uploads immediately.
 */
export function PendingPhotos({ files, onFilesChange }: PendingPhotosProps) {
  const t = useTranslations();

  const previews = React.useMemo(
    () => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [files],
  );

  React.useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDrop: (accepted) => onFilesChange([...files, ...accepted]),
  });

  function removeAt(idx: number) {
    onFilesChange(files.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t('museums.photos')}</h3>

      {previews.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {previews.map((p, idx) => (
            <div
              key={p.url}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Pending ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-start justify-end bg-black/0 p-2 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeAt(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                {idx + 1}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('museums.noPhotos')}</p>
      )}

      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('common.dragDrop')}</p>
        <p className="text-xs text-muted-foreground">
          {t('common.supportedFormats')} &middot; {t('common.maxFileSize')}
        </p>
        <p className="text-[12px] text-muted-foreground/80">
          {t('museums.photosPendingHint')}
        </p>
      </div>
    </div>
  );
}
