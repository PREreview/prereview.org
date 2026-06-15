import { plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'

export const template = (locale: SupportedLocale) =>
  plainText`
${translate(locale, 'write-review', 'writeAShortSummary')()}

## ${translate(locale, 'write-review', 'majorIssues')()}

- ${translate(locale, 'write-review', 'listSignificantConcerns')()}

## ${translate(locale, 'write-review', 'minorIssues')()}

- ${translate(locale, 'write-review', 'listFlowConcerns')()}
`
    .toString()
    .trim()
