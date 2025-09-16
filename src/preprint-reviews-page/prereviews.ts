import type { Array } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { Html } from '../html.js'
import type { PreprintId } from '../Preprints/index.js'
import type { ClubId } from '../types/club-id.js'
import type { OrcidId } from '../types/OrcidId.js'

export interface Prereview {
  authors: {
    named: Array.NonEmptyReadonlyArray<{ name: string; orcid?: OrcidId }>
    anonymous: number
  }
  club?: ClubId
  id: number
  language?: LanguageCode
  text: Html
}

export interface GetPrereviewsEnv {
  getPrereviews: (id: PreprintId) => TE.TaskEither<'unavailable', ReadonlyArray<Prereview>>
}

export const getPrereviews = (
  id: PreprintId,
): RTE.ReaderTaskEither<GetPrereviewsEnv, 'unavailable', ReadonlyArray<Prereview>> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereviews }) => getPrereviews(id)))
