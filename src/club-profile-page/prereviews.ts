import { Temporal } from '@js-temporal/polyfill'
import { type Array, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { ClubId } from '../types/club-id.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'

import PlainDate = Temporal.PlainDate

export type Prereviews = ReadonlyArray<{
  readonly id: number
  readonly reviewers: {
    readonly named: Array.NonEmptyReadonlyArray<string>
    readonly anonymous: number
  }
  readonly published: PlainDate
  readonly fields: ReadonlyArray<FieldId>
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}>

export interface GetPrereviewsEnv {
  getPrereviews: (id: ClubId) => TE.TaskEither<'unavailable', Prereviews>
}

export const getPrereviews = (id: ClubId) =>
  pipe(
    RTE.ask<GetPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getPrereviews }) => getPrereviews(id)),
  )
