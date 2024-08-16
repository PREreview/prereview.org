import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import type { Html } from '../html.js'
import type { ClubId } from '../types/club-id.js'
import type { PreprintId } from '../types/preprint-id.js'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  addendum?: Html
  authors: {
    named: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
    anonymous: number
  }
  club?: ClubId
  doi: Doi
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: PlainDate
  preprint: {
    id: PreprintId
    language: LanguageCode
    title: Html
    url: URL
  }
  live: boolean
  requested: boolean
  structured: boolean
  text: Html
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable' | 'not-found' | 'removed', Prereview>
}

export const getPrereview = (
  id: number,
): RTE.ReaderTaskEither<GetPrereviewEnv, 'unavailable' | 'not-found' | 'removed', Prereview> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }) => getPrereview(id)))
