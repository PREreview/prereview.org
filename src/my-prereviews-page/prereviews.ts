import { Temporal } from '@js-temporal/polyfill'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { ClubId } from '../types/club-id.js'
import type { FieldId } from '../types/field.js'
import type { PreprintId } from '../types/preprint-id.js'
import type { SubfieldId } from '../types/subfield.js'
import type { User } from '../user.js'
import { UnableToLoadPrereviews } from './unable-to-load-prereviews.js'

import PlainDate = Temporal.PlainDate

export interface Prereview {
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

export interface GetMyPrereviewsEnv {
  getMyPrereviews: (user: User) => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

export const getMyPrereviews = (
  user: User,
): RTE.ReaderTaskEither<GetMyPrereviewsEnv, UnableToLoadPrereviews, ReadonlyArray<Prereview>> =>
  pipe(
    RTE.ask<GetMyPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getMyPrereviews }) => getMyPrereviews(user)),
    RTE.mapLeft(() => UnableToLoadPrereviews),
  )
