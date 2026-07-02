import { defineConfig } from 'vitest/config'

// Unit tests target pure logic (utils/services). jsdom provides DOMParser for
// the RSS/HTML parsers. Test files are excluded from the production tsc build.
export default defineConfig({
  test: {
    // Node by default (fast); files needing the DOM opt in with a
    // `// @vitest-environment jsdom` pragma (see rssParser.test.ts).
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
