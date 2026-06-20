'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ChevronLeft } from 'lucide-react';
import {
  historicalPlaceSchema,
  type HistoricalPlaceFormValues,
} from '@/lib/validations/historical-place';
import {
  useCreateHistoricalPlace,
  useUpdateHistoricalPlace,
} from '@/lib/hooks/use-historical-places';
import { Link, useRouter } from '@/i18n/navigation';
import { ROUTES } from '@/lib/constants';
import { emptyLocalizedField } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import dynamic from 'next/dynamic';
import { LanguageTabs } from '@/components/shared/language-tabs';
import { RegionSelect } from '@/components/shared/region-select';
import { CityInput } from '@/components/shared/city-input';
import { PhotoUpload } from '@/components/museums/photo-upload';
import { PendingPhotos } from '@/components/museums/pending-photos';
import { uploadDirect, api } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import type { HistoricalPlace } from '@/lib/types';

const MapPicker = dynamic(
  () => import('@/components/shared/map-picker').then((m) => m.MapPicker),
  { ssr: false, loading: () => <div className="h-[320px] rounded-lg bg-muted animate-pulse" /> },
);

interface PlaceFormProps {
  place?: HistoricalPlace;
}

export function PlaceForm({ place }: PlaceFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const isEdit = !!place;

  const createMutation = useCreateHistoricalPlace();
  const updateMutation = useUpdateHistoricalPlace(place?.id || '');

  const form = useForm<HistoricalPlaceFormValues>({
    resolver: zodResolver(historicalPlaceSchema),
    defaultValues: place
      ? {
          name: place.name,
          description: place.description,
          ticketPrice: place.ticketPrice,
          latitude: place.latitude,
          longitude: place.longitude,
          city: place.city,
          regionId: place.regionId || null,
          isPublished: place.isPublished,
        }
      : {
          name: emptyLocalizedField(),
          description: emptyLocalizedField(),
          ticketPrice: emptyLocalizedField(),
          latitude: 41.311081,
          longitude: 69.240562,
          city: '',
          regionId: null,
          isPublished: false,
        },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [pendingPhotos, setPendingPhotos] = React.useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = React.useState(false);

  async function onSubmit(data: HistoricalPlaceFormValues) {
    setSubmitError(null);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(data);
        toast.success(t('historicalPlaces.placeUpdated'));
      } else {
        const created = await createMutation.mutateAsync(data);
        toast.success(t('historicalPlaces.placeCreated'));

        if (pendingPhotos.length > 0) {
          setUploadingPhotos(true);
          let uploaded = 0;
          for (let i = 0; i < pendingPhotos.length; i++) {
            try {
              const { fileUrl } = await uploadDirect(pendingPhotos[i]);
              await api.post(API_PATHS.ADMIN_HISTORICAL_PLACE_PHOTOS(created.id), {
                url: fileUrl,
                orderIdx: i,
              });
              uploaded++;
            } catch (e) {
              const m = e instanceof Error ? e.message : t('common.error');
              toast.error(`${pendingPhotos[i].name}: ${m}`);
            }
          }
          setUploadingPhotos(false);
          if (uploaded > 0) {
            toast.success(t('museums.photoUploaded'));
          }
        }

        router.push(ROUTES.HISTORICAL_PLACE_EDIT(created.id));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      setSubmitError(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-xl">
          <Link href={ROUTES.HISTORICAL_PLACES}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            {isEdit ? t('historicalPlaces.editPlace') : t('historicalPlaces.createPlace')}
          </h2>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, () => toast.error(t('validation.required')))} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>
                {t('historicalPlaces.name')} / {t('historicalPlaces.description')} / {t('historicalPlaces.ticketPrice')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LanguageTabs>
                {(lang) => (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`name.${lang}` as `name.uz` | `name.ru` | `name.en`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[13px] text-muted-foreground font-medium">{t('historicalPlaces.name')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`description.${lang}` as `description.uz` | `description.ru` | `description.en`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[13px] text-muted-foreground font-medium">{t('historicalPlaces.description')}</FormLabel>
                          <FormControl>
                            <Textarea rows={5} {...field} className="rounded-xl border-0 bg-secondary/70 ring-1 ring-border/50 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200 ease-ios" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ticketPrice.${lang}` as `ticketPrice.uz` | `ticketPrice.ru` | `ticketPrice.en`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[13px] text-muted-foreground font-medium">{t('historicalPlaces.ticketPrice')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </LanguageTabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t('regions.region')} / {t('historicalPlaces.city')} / {t('historicalPlaces.latitude')} / {t('historicalPlaces.longitude')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] text-muted-foreground font-medium">{t('regions.region')}</FormLabel>
                    <FormControl>
                      <RegionSelect
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] text-muted-foreground font-medium">
                      {t('historicalPlaces.city')}{' '}
                      <span className="text-muted-foreground/70 font-normal">
                        ({t('museums.cityOptional')})
                      </span>
                    </FormLabel>
                    <CityInput
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      regionId={form.watch('regionId')}
                    />
                    <p className="text-[12px] text-muted-foreground/80">
                      {t('museums.cityHint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-1.5">
                <p className="text-[13px] text-muted-foreground font-medium">
                  {t('museums.pickOnMap')}
                </p>
                <MapPicker
                  latitude={Number(form.watch('latitude')) || 41.311081}
                  longitude={Number(form.watch('longitude')) || 64.585262}
                  onChange={(lat, lng) => {
                    form.setValue('latitude', lat, { shouldDirty: true, shouldValidate: true });
                    form.setValue('longitude', lng, { shouldDirty: true, shouldValidate: true });
                  }}
                />
                <p className="text-[12px] text-muted-foreground/80">
                  {t('museums.pickOnMapHint')}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] text-muted-foreground font-medium">{t('historicalPlaces.latitude')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[13px] text-muted-foreground font-medium">{t('historicalPlaces.longitude')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === '' ? '' : parseFloat(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-4 transition-colors duration-200">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-semibold">
                        {t('historicalPlaces.isPublished')}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {submitError && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {submitError}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending} className="min-w-[120px]">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href={ROUTES.HISTORICAL_PLACES}>{t('common.cancel')}</Link>
            </Button>
          </div>
        </form>
      </Form>

      {isEdit && place && (
        <Card>
          <CardHeader>
            <CardTitle>{t('historicalPlaces.managePhotos')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PhotoUpload
              entityType="historical-place"
              entityId={place.id}
              photos={place.photos}
            />
          </CardContent>
        </Card>
      )}

      {!isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>{t('historicalPlaces.managePhotos')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingPhotos files={pendingPhotos} onFilesChange={setPendingPhotos} />
            {uploadingPhotos && (
              <p className="mt-3 text-sm text-muted-foreground inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('museums.uploadingPhotos')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
