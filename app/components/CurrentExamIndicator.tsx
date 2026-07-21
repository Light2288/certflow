'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/contexts/settings-context';
import { loadCertificationList } from '@/lib/loaders/certification-loader';
import type { CertificationSummary } from '@/lib/types/certification';

/**
 * Read-only indication of the currently selected certification.
 *
 * Displays the active exam in the header so users always know which
 * certification they are studying under. It is purely informational — the
 * exam can only be *changed* from the home page via CertificationSelector.
 *
 * Renders nothing when there is no valid selection (empty list, or the
 * selected id is not present in the loaded manifest).
 */
export default function CurrentExamIndicator() {
  const { currentCertificationId } = useSettings();
  const [certifications, setCertifications] = useState<CertificationSummary[]>(
    []
  );

  useEffect(() => {
    let cancelled = false;
    loadCertificationList()
      .then((list) => {
        if (!cancelled) setCertifications(list);
      })
      .catch((err) => {
        // Discovery is best-effort; render nothing if it fails.
        console.error('Failed to load certification list:', err);
        if (!cancelled) setCertifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = certifications.find(
    (cert) => cert.id === currentCertificationId
  );

  // No valid selection to indicate — render nothing rather than a placeholder.
  if (!current) {
    return null;
  }

  const label = `${current.name} (${current.code})`;

  return (
    <span
      title={label}
      aria-label={`Selected certification: ${label}`}
      className="inline-flex min-w-0 shrink items-center max-w-[8rem] sm:max-w-[12rem] lg:max-w-xs rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1 text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200"
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

// Made with Bob
