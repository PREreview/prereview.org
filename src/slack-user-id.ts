import { type HashSet, pipe, type Redacted } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type { Slack } from './ExternalApis/index.ts'
import type { NonEmptyString } from './types/NonEmptyString.ts'
import type { OrcidId } from './types/OrcidId.ts'

export interface SlackUserId {
  readonly accessToken: Redacted.Redacted<NonEmptyString>
  readonly scopes: HashSet.HashSet<NonEmptyString>
  readonly userId: Slack.UserId
}

export interface GetSlackUserIdEnv {
  getSlackUserId: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', SlackUserId>
}

export interface EditSlackUserIdEnv {
  saveSlackUserId: (orcid: OrcidId, slackUserId: SlackUserId) => TE.TaskEither<'unavailable', void>
}

export interface DeleteSlackUserIdEnv {
  deleteSlackUserId: (orcid: OrcidId) => TE.TaskEither<'unavailable', void>
}

export const getSlackUserId = (orcid: OrcidId) =>
  pipe(
    RTE.ask<GetSlackUserIdEnv>(),
    RTE.chainTaskEitherK(({ getSlackUserId }) => getSlackUserId(orcid)),
  )

export const saveSlackUserId = (
  orcid: OrcidId,
  slackUserId: SlackUserId,
): RTE.ReaderTaskEither<EditSlackUserIdEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveSlackUserId }) => saveSlackUserId(orcid, slackUserId)))

export const deleteSlackUserId = (orcid: OrcidId) =>
  pipe(
    RTE.ask<DeleteSlackUserIdEnv>(),
    RTE.chainTaskEitherK(({ deleteSlackUserId }) => deleteSlackUserId(orcid)),
  )
