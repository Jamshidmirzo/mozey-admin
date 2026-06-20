'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { useMuseumCities } from '@/lib/hooks/use-museums';

interface CityInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional region scope — narrows the suggestion list to cities in that region. */
  regionId?: string | null;
  placeholder?: string;
  id?: string;
}

/**
 * City input with native HTML5 datalist autosuggest, populated from the
 * distinct cities currently in the DB. Lets the editor either pick an
 * existing value or type a new one — leaving it blank is allowed.
 */
export function CityInput({
  value,
  onChange,
  regionId,
  placeholder,
  id,
}: CityInputProps) {
  const t = useTranslations('museums');
  const { data: cities } = useMuseumCities(regionId);
  const listId = React.useId();

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('cityPlaceholder')}
        autoComplete="off"
      />
      <datalist id={listId}>
        {cities?.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}
