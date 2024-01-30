import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import type { NonEmptyString } from './types/string'

export interface OrcidToken {
  readonly accessToken: NonEmptyString
  readonly scopes: ReadonlySet<NonEmptyString>
}

export interface EditOrcidTokenEnv {
  saveOrcidToken: (orcid: Orcid, orcidToken: OrcidToken) => TE.TaskEither<'unavailable', void>
}

export const saveOrcidToken = (
  orcid: Orcid,
  orcidToken: OrcidToken,
): RTE.ReaderTaskEither<EditOrcidTokenEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveOrcidToken }) => saveOrcidToken(orcid, orcidToken)))
