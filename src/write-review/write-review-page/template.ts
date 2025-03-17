import { translate, type SupportedLocale } from '../../locales/index.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const template = (locale: SupportedLocale) =>
  `
${translate(locale, 'write-review', 'writeAShortSummary')()}

## ${translate(locale, 'write-review', 'majorIssues')()}

- ${translate(locale, 'write-review', 'listSignificantConcerns')()}

## ${translate(locale, 'write-review', 'minorIssues')()}

- ${translate(locale, 'write-review', 'listFlowConcerns')()}
`.trim()
