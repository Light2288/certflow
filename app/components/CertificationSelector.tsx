'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/lib/contexts/settings-context';
import { loadCertificationList } from '@/lib/loaders/certification-loader';
import type { CertificationSummary } from '@/lib/types/certification';

export default function CertificationSelector() {
  const { currentCertificationId, setCurrentCertification } = useSettings();
  const [certifications, setCertifications] = useState<CertificationSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCertificationList()
      .then((list) => {
        if (!cancelled) setCertifications(list);
      })
      .catch((err) => {
        // Discovery is best-effort; render gracefully if it fails.
        console.error('Failed to load certification list:', err);
        if (!cancelled) setCertifications([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to choose from — render nothing rather than an empty control.
  if (certifications.length === 0) {
    return null;
  }

  return (
    <label className="inline-flex max-w-full items-center gap-2 px-4 sm:px-6 py-3 bg-blue-100 dark:bg-blue-900 rounded-full">
      <span className="shrink-0 text-sm font-medium text-blue-800 dark:text-blue-200">
        Current Certification:
      </span>
      <select
        aria-label="Certification"
        value={currentCertificationId}
        onChange={(e) => setCurrentCertification(e.target.value)}
        className="min-w-0 flex-1 truncate text-sm font-medium bg-transparent text-blue-800 dark:text-blue-200 border-0 focus:ring-0 cursor-pointer"
      >
        {certifications.map((cert) => (
          <option
            key={cert.id}
            value={cert.id}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {cert.name} ({cert.code})
          </option>
        ))}
      </select>
    </label>
  );
}
