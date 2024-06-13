import { Temporal } from '@js-temporal/polyfill'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { ClubId } from '../types/club-id.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { NonEmptyString } from '../types/string.js'
import type { SubfieldId } from '../types/subfield.js'

import PlainDate = Temporal.PlainDate

export interface RecentPrereviews {
  readonly currentPage: number
  readonly totalPages: number
  readonly field?: FieldId
  readonly language?: LanguageCode
  readonly query?: NonEmptyString
  readonly recentPrereviews: RNEA.ReadonlyNonEmptyArray<{
    readonly club?: ClubId
    readonly id: number
    readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
    readonly published: PlainDate
    readonly fields: ReadonlyArray<FieldId>
    readonly subfields: ReadonlyArray<SubfieldId>
    readonly preprint: {
      readonly id: PreprintId
      readonly language: LanguageCode
      readonly title: Html
    }
  }>
}

export interface GetRecentPrereviewsEnv {
  getRecentPrereviews: (args: {
    field?: FieldId
    language?: LanguageCode
    page: number
    query?: NonEmptyString
  }) => TE.TaskEither<'not-found' | 'unavailable', RecentPrereviews>
}

export const getRecentPrereviews = (...args: Parameters<GetRecentPrereviewsEnv['getRecentPrereviews']>) =>
  pipe(
    RTE.ask<GetRecentPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getRecentPrereviews }) => getRecentPrereviews(...args)),
  )
