import type { SupportedLocale } from '../../locales/index.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const template = (locale: SupportedLocale) =>
  `
Write a short summary of the research’s main findings and how this work has moved the field forward.

## Major issues

- List significant concerns about the research, if there are any.

## Minor issues

- List concerns that would improve the overall flow or clarity but are not critical to the understanding and conclusions of the research.
`.trim()
