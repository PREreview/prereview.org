import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import type { NonEmptyString } from './string'

export interface SaveSlackUserAccessTokenEnv {
  saveSlackUserAccessToken: (orcid: Orcid, slackUserAccessToken: NonEmptyString) => TE.TaskEither<'unavailable', void>
}

export const saveSlackUserAccessToken = (
  orcid: Orcid,
  slackUserAccessToken: NonEmptyString,
): RTE.ReaderTaskEither<SaveSlackUserAccessTokenEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveSlackUserAccessToken }) => saveSlackUserAccessToken(orcid, slackUserAccessToken)),
  )
