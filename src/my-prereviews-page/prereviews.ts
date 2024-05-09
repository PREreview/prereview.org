import { Temporal } from '@js-temporal/polyfill'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html'
import type { ClubId } from '../types/club-id'
import type { PreprintId } from '../types/preprint-id'
import type { User } from '../user'
import { UnableToLoadPrereviews } from './unable-to-load-prereviews'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
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
