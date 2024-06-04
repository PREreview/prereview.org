import { Temporal } from '@js-temporal/polyfill'
import * as RT from 'fp-ts/ReaderTask'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as T from 'fp-ts/Task'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html'
import type { ClubId } from '../types/club-id'
import type { FieldId } from '../types/field'
import type { PreprintId } from '../types/preprint-id'
import type { SubfieldId } from '../types/subfield'

import PlainDate = Temporal.PlainDate

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
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
