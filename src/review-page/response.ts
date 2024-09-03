import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'

import PlainDate = Temporal.PlainDate

export interface Response {
  authors: {
    named: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
  }
  doi: Doi
  id: number
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: PlainDate
  text: Html
}
