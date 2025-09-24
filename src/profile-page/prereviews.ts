import type { Temporal } from '@js-temporal/polyfill'
import { type Array, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.ts'
import type { PreprintId } from '../Preprints/index.ts'
import type { ClubId } from '../types/club-id.ts'
import type { FieldId } from '../types/field.ts'
import type { ProfileId } from '../types/profile-id.ts'
import type { SubfieldId } from '../types/subfield.ts'

export type Prereviews = ReadonlyArray<{
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
}>

export interface GetPrereviewsEnv {
  getPrereviews: (profile: ProfileId) => TE.TaskEither<'unavailable', Prereviews>
}

export const getPrereviews = (profile: ProfileId) =>
  pipe(
    RTE.ask<GetPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getPrereviews }) => getPrereviews(profile)),
  )
