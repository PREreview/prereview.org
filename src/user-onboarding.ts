import { Context, flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import type { Orcid } from 'orcid-id-ts'

export interface UserOnboarding {
  readonly seenMyDetailsPage: boolean
}

export class UserOnboardingService extends Context.Tag('UserOnboardingService')<
  UserOnboardingService,
  UserOnboarding
>() {}

export interface GetUserOnboardingEnv {
  getUserOnboarding: (orcid: Orcid) => TE.TaskEither<'unavailable', UserOnboarding>
}

export interface SaveUserOnboardingEnv {
  saveUserOnboarding: (orcid: Orcid, userOnboarding: UserOnboarding) => TE.TaskEither<'unavailable', void>
}

export const UserOnboardingC = C.struct({
  seenMyDetailsPage: C.boolean,
}) satisfies C.Codec<unknown, unknown, UserOnboarding>

export const getUserOnboarding = (
  orcid: Orcid,
): RTE.ReaderTaskEither<GetUserOnboardingEnv, 'unavailable', UserOnboarding> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getUserOnboarding }) => getUserOnboarding(orcid)))

export const maybeGetUserOnboarding = flow(
  getUserOnboarding,
  RTE.orElseW(() => RTE.of(undefined)),
)

export const saveUserOnboarding = (
  orcid: Orcid,
  userOnboarding: UserOnboarding,
): RTE.ReaderTaskEither<SaveUserOnboardingEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveUserOnboarding }) => saveUserOnboarding(orcid, userOnboarding)))
