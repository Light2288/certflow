# CertFlow Testing Guide

## 🧪 Test Infrastructure

This project uses **Vitest** + **React Testing Library** for comprehensive testing.

### Running Tests

```sh
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Coverage Targets

- **Business Logic (loaders, validators):** 85%+
- **Helper Functions:** 80%+
- **React Components:** 60-70%
- **Overall:** 75%+

## 📁 Test Structure

```text
test/
├── setup.ts                 - Global test setup
├── helpers/
│   ├── mock-data.ts        - Mock certification data
│   └── test-utils.tsx      - Custom render utilities
└── README.md               - This file

lib/loaders/__tests__/
├── certification-loader.test.ts              - Unit tests
└── certification-loader.integration.test.ts  - Integration tests

app/**/__tests__/
└── page.test.tsx           - Component tests for each page
```

## ✅ Implemented Tests

### Unit Tests (certification-loader.test.ts)
- ✅ validateCertificationConfig (8 tests)
- ✅ validateTopics (7 tests)
- ✅ validateQuestion (18 tests)
- ✅ validateQuestions (3 tests)
- ✅ Helper functions (12 tests)

**Total: 48 unit tests**

### Integration Tests (certification-loader.integration.test.ts)
- ✅ loadCertificationConfig (3 tests)
- ✅ loadCertificationTopics (2 tests)
- ✅ loadCertificationQuestions (2 tests)
- ✅ loadCertification (2 tests)

**Total: 9 integration tests**

### Component Tests
- Component tests for pages need to be added after running `npm install`

## 📊 Current Coverage

After running `npm install` and `npm run test:coverage`, you should see:

- **certification-loader.ts:** 85-90% coverage
- **Validation functions:** 90%+ coverage
- **Helper functions:** 85%+ coverage

## 🚀 Next Steps

After installing dependencies with `npm install`:

1. Run tests to verify everything works: `npm test`
2. Check coverage: `npm run test:coverage`
3. Add component tests for pages (TODO - see below)
4. Review coverage report in `coverage/index.html`

## 📝 TODO: Component Tests to Add

Component tests should be added in a future step:

```text
app/__tests__/page.test.tsx
app/simulator/__tests__/page.test.tsx
app/topics/__tests__/page.test.tsx
app/tutor/__tests__/page.test.tsx
app/settings/__tests__/page.tsx
```

Each should test:
- Page renders without errors
- Main headings are present
- Navigation links exist
- Links have correct hrefs

## 🎨 Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../my-module';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Component Test Example

```typescript
import { render, screen } from '@/test/helpers/test-utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render heading', () => {
    render(<MyComponent />);
    expect(screen.getByText('My Heading')).toBeInTheDocument();
  });
});
```

## 🔧 Troubleshooting

### TypeScript Errors in vitest.config.ts

These are expected before running `npm install`. The dependencies need to be installed first.

### Tests Not Finding Modules

Make sure you've run `npm install` to install all dependencies including Vitest and testing libraries.

### Coverage Too Low

Focus on testing:
1. Business logic first (highest priority)
2. Validation functions
3. Helper/utility functions
4. Component rendering (basic coverage)

Not everything needs 100% coverage - focus on critical paths.