import type { Temporal } from '@js-temporal/polyfill'
import { type Array, pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.ts'
import type { PreprintId } from '../Preprints/index.ts'
import type { ClubId } from '../types/club-id.ts'
import type { FieldId } from '../types/field.ts'
import type { SubfieldId } from '../types/subfield.ts'

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: {
    readonly named: Array.NonEmptyReadonlyArray<string>
    readonly anonymous: number
  }
  readonly published: Temporal.PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export interface GetRecentPrereviewsEnv {
  getRecentPrereviews: () => T.Task<ReadonlyArray<RecentPrereview>>
}

export const getRecentPrereviews = () =>
  pipe(
    RT.ask<GetRecentPrereviewsEnv>(),
    RT.chainTaskK(({ getRecentPrereviews }) => getRecentPrereviews()),
  )
