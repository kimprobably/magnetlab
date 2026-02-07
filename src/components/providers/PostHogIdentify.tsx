'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

interface PostHogIdentifyProps {
  userId: string;
  email?: string | null;
  name?: string | null;
}

export function PostHogIdentify({ userId, email, name }: PostHogIdentifyProps) {
  useEffect(() => {
    if (!userId) return;
    try {
      posthog.identify(userId, {
        ...(email && { email }),
        ...(name && { name }),
      });
    } catch {}
  }, [userId, email, name]);

  return null;
}
