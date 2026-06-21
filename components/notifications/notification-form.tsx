'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageTabs } from '@/components/shared/language-tabs';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useSendNotification } from '@/lib/hooks/use-notifications';
import type { CreateNotificationData, LocalizedField } from '@/lib/types';

export function NotificationForm() {
  const t = useTranslations('notifications');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const sendMutation = useSendNotification();

  const form = useForm<CreateNotificationData>({
    defaultValues: {
      title: { uz: '', ru: '', en: '' },
      body: { uz: '', ru: '', en: '' },
      topic: '',
    },
  });

  const watchedTopic = form.watch('topic');

  const onSubmit = () => {
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    const values = form.getValues();
    const data: CreateNotificationData = {
      title: values.title,
      body: values.body,
      ...(values.topic ? { topic: values.topic } : {}),
    };

    try {
      await sendMutation.mutateAsync(data);
      toast.success(t('notificationSent'));
      form.reset({
        title: { uz: '', ru: '', en: '' },
        body: { uz: '', ru: '', en: '' },
        topic: '',
      });
    } catch (error: unknown) {
      toast.error(t('notificationError'), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('sendNotification')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">{t('notificationTitle')}</Label>
              <LanguageTabs>
                {(lang) => (
                  <Input
                    {...form.register(`title.${lang as keyof LocalizedField}` as const)}
                    placeholder={t('notificationTitle')}
                  />
                )}
              </LanguageTabs>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">{t('notificationBody')}</Label>
              <LanguageTabs>
                {(lang) => (
                  <Textarea
                    {...form.register(`body.${lang as keyof LocalizedField}` as const)}
                    placeholder={t('notificationBody')}
                    rows={3}
                  />
                )}
              </LanguageTabs>
            </div>

            <div className="space-y-2">
              <Label>{t('topic')}</Label>
              <Input
                {...form.register('topic')}
                placeholder="news"
              />
              <p className="text-sm text-muted-foreground">{t('topicHint')}</p>
            </div>

            <Button type="submit" disabled={sendMutation.isPending}>
              <Send className="mr-2 h-4 w-4" />
              {sendMutation.isPending ? t('sending') : t('send')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('confirmTitle')}
        description={
          watchedTopic
            ? t('confirmTopicDescription', { topic: watchedTopic })
            : t('confirmDescription')
        }
        onConfirm={handleConfirm}
        confirmLabel={t('send')}
        variant="default"
        loading={sendMutation.isPending}
      />
    </>
  );
}
