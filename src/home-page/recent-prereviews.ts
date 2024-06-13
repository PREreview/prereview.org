import { Temporal } from '@js-temporal/polyfill'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as T from 'fp-ts/lib/Task.js'
import { pipe } from 'fp-ts/lib/function.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { ClubId } from '../types/club-id.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'

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
