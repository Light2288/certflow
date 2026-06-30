/**
 * CertFlow - App Settings Type Definitions
 *
 * Application-level settings that are independent of AI provider settings.
 * Currently models the user's currently selected certification.
 */

// ============================================================================
// APP SETTINGS TYPES
// ============================================================================

export interface AppSettings {
  currentCertificationId: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

export const DEFAULT_CERTIFICATION_ID = 'aws-ml';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currentCertificationId: DEFAULT_CERTIFICATION_ID,
};
