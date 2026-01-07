import { pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type * as Prereviews from '../../Prereviews/index.ts'
import type { FieldId } from '../../types/field.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'

export interface GetRecentPrereviewsEnv {
  getRecentPrereviews: (args: {
    field?: FieldId
    language?: LanguageCode
    page: number
    query?: NonEmptyString
  }) => TE.TaskEither<'not-found' | 'unavailable', Prereviews.RecentPrereviews>
}

export const getRecentPrereviews = (...args: Parameters<GetRecentPrereviewsEnv['getRecentPrereviews']>) =>
  pipe(
    RTE.ask<GetRecentPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getRecentPrereviews }) => getRecentPrereviews(...args)),
  )
