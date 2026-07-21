import { version } from '@/package.json';

const REPO_URL = 'https://github.com/Light2288/certflow';
const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
const DONATION_URL = 'https://paypal.me/DavideAliti';

export default function Footer() {
  return (
    <footer className="shrink-0 border-t border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: copyright, links, version */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span>&copy; 2026 CertFlow</span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              GitHub
            </a>
            <a
              href={LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              MIT License
            </a>
            {version ? (
              <span className="text-gray-400 dark:text-gray-500">
                v{version}
              </span>
            ) : null}
          </div>

          {/* Right: donation button */}
          <a
            href={DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-yellow-400 px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-yellow-300"
          >
            <span aria-hidden="true">☕</span>
            Buy me a coffee
          </a>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          AI-generated content may be inaccurate — always verify against
          official sources. CertFlow is not affiliated with or endorsed by any
          certification vendor.
        </p>
      </div>
    </footer>
  );
}

// Made with Bob
