'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotifications } from '@/lib/hooks/use-notifications';
import type { LocalizedField } from '@/lib/types';

export function NotificationTable() {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useNotifications({ page, limit: 10 });

  const getLocalizedText = (field: LocalizedField): string => {
    return field[locale as keyof LocalizedField] || field.uz || field.ru || field.en || '';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(
      locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t('history')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data?.items?.length ? (
          <p className="text-center text-muted-foreground py-8">
            {t('noNotifications')}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('notificationTitle')}</TableHead>
                  <TableHead>{t('notificationBody')}</TableHead>
                  <TableHead>{t('topic')}</TableHead>
                  <TableHead className="text-center">{t('sentCount')}</TableHead>
                  <TableHead className="text-center">{t('failedCount')}</TableHead>
                  <TableHead>{t('admin')}</TableHead>
                  <TableHead>{t('sentAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {getLocalizedText(notification.title)}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {getLocalizedText(notification.body)}
                    </TableCell>
                    <TableCell>
                      {notification.topic ? (
                        <Badge variant="outline">{notification.topic}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="bg-green-600">
                        {notification.sentCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {notification.failedCount > 0 ? (
                        <Badge variant="destructive">{notification.failedCount}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {notification.adminEmail}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(notification.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {tc('page')} {page} {tc('of')} {data.totalPages} ({tc('total')}: {data.total})
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {tc('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (data.totalPages || 1)}
                  >
                    {tc('next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
