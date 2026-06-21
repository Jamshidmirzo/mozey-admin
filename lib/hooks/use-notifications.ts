'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { API_PATHS, DEFAULT_PAGE_SIZE } from '../constants';
import type { Notification, CreateNotificationData, PaginatedResponse } from '../types';

const NOTIFICATIONS_KEY = 'admin-notifications';

export function useNotifications(params: { page?: number; limit?: number } = {}) {
  const finalParams = { page: params.page || 1, limit: params.limit || DEFAULT_PAGE_SIZE };
  const qs = `?page=${finalParams.page}&limit=${finalParams.limit}`;
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY, finalParams],
    queryFn: () => api.get<PaginatedResponse<Notification>>(`${API_PATHS.ADMIN_NOTIFICATIONS}${qs}`),
  });
}

export function useSendNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotificationData) =>
      api.post<Notification>(API_PATHS.ADMIN_NOTIFICATIONS, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATIONS_KEY] });
    },
  });
}
