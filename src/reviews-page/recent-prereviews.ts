import type { Temporal } from '@js-temporal/polyfill'
import { type Array, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.ts'
import type { PreprintId } from '../Preprints/index.ts'
import type { ClubId } from '../types/club-id.ts'
import type { FieldId } from '../types/field.ts'
import type { NonEmptyString } from '../types/NonEmptyString.ts'
import type { SubfieldId } from '../types/subfield.ts'

export interface RecentPrereviews {
  readonly currentPage: number
  readonly totalPages: number
  readonly field?: FieldId
  readonly language?: LanguageCode
  readonly query?: NonEmptyString
  readonly recentPrereviews: Array.NonEmptyReadonlyArray<{
    readonly club?: ClubId
    readonly id: number
    readonly reviewers: {
      named: Array.NonEmptyReadonlyArray<string>
      anonymous: number
    }
    readonly published: Temporal.PlainDate
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
