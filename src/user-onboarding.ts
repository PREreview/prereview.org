import { Context, flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import type { OrcidId } from './types/OrcidId.js'

export interface UserOnboarding {
  readonly seenMyDetailsPage: boolean
}

export class UserOnboardingService extends Context.Tag('UserOnboardingService')<
  UserOnboardingService,
  UserOnboarding
>() {}

export interface GetUserOnboardingEnv {
  getUserOnboarding: (orcid: OrcidId) => TE.TaskEither<'unavailable', UserOnboarding>
}

export interface SaveUserOnboardingEnv {
  saveUserOnboarding: (orcid: OrcidId, userOnboarding: UserOnboarding) => TE.TaskEither<'unavailable', void>
}

export const UserOnboardingC = C.struct({
  seenMyDetailsPage: C.boolean,
}) satisfies C.Codec<unknown, unknown, UserOnboarding>

export const getUserOnboarding = (
  orcid: OrcidId,
): RTE.ReaderTaskEither<GetUserOnboardingEnv, 'unavailable', UserOnboarding> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getUserOnboarding }) => getUserOnboarding(orcid)))

export const maybeGetUserOnboarding = flow(
  getUserOnboarding,
  RTE.orElseW(() => RTE.of(undefined)),
)

export const saveUserOnboarding = (
  orcid: OrcidId,
  userOnboarding: UserOnboarding,
): RTE.ReaderTaskEither<SaveUserOnboardingEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveUserOnboarding }) => saveUserOnboarding(orcid, userOnboarding)))
