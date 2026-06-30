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
    <label className="flex items-center gap-2">
      <span className="sr-only">Certification</span>
      <select
        aria-label="Certification"
        value={currentCertificationId}
        onChange={(e) => setCurrentCertification(e.target.value)}
        className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      >
        {certifications.map((cert) => (
          <option key={cert.id} value={cert.id}>
            {cert.name} ({cert.code})
          </option>
        ))}
      </select>
    </label>
  );
}
