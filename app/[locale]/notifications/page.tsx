'use client';

import { DashboardShell } from '@/components/layout/dashboard-shell';
import { NotificationForm } from '@/components/notifications/notification-form';
import { NotificationTable } from '@/components/notifications/notification-table';

export default function NotificationsPage() {
  return (
    <DashboardShell>
      <div className="space-y-6">
        <NotificationForm />
        <NotificationTable />
      </div>
    </DashboardShell>
  );
}
