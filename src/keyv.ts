import * as E from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import type { Decoder } from 'io-ts/Decoder'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import type Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { AuthorInviteC } from './author-invite'
import { type CareerStage, CareerStageC } from './career-stage'
import { ContactEmailAddressC } from './contact-email-address'
import { IsOpenForRequestsC } from './is-open-for-requests'
import { LanguagesC } from './languages'
import { LocationC } from './location'
import { OrcidTokenC } from './orcid-token'
import { type ResearchInterests, ResearchInterestsC } from './research-interests'
import { SlackUserIdC } from './slack-user-id'
import { NonEmptyStringC } from './types/string'
import { UuidC } from './types/uuid'
import { type UserOnboarding, UserOnboardingC } from './user-onboarding'

export interface AuthorInviteStoreEnv {
  authorInviteStore: Keyv<unknown>
}

export interface AvatarStoreEnv {
  avatarStore: Keyv<unknown>
}

export interface CareerStageStoreEnv {
  careerStageStore: Keyv<unknown>
}

export interface ContactEmailAddressStoreEnv {
  contactEmailAddressStore: Keyv<unknown>
}

export interface IsOpenForRequestsStoreEnv {
  isOpenForRequestsStore: Keyv<unknown>
}

export interface LanguagesStoreEnv {
  languagesStore: Keyv<unknown>
}

export interface LocationStoreEnv {
  locationStore: Keyv<unknown>
}

export interface ResearchInterestsStoreEnv {
  researchInterestsStore: Keyv<unknown>
}

export interface OrcidTokenStoreEnv {
  orcidTokenStore: Keyv<unknown>
}

export interface SlackUserIdStoreEnv {
  slackUserIdStore: Keyv<unknown>
}

export interface UserOnboardingStoreEnv {
  userOnboardingStore: Keyv<unknown>
}

interface KeyvEnv {
  keyv: Keyv<unknown>
}

const OrcidE: Encoder<string, Orcid> = { encode: identity }

const deleteKey =
  <K>(keyEncoder: Encoder<string, K>) =>
  (key: K): RTE.ReaderTaskEither<KeyvEnv & L.LoggerEnv, 'unavailable', void> =>
    pipe(
      RTE.ask<KeyvEnv>(),
      RTE.chainW(({ keyv }) =>
        pipe(
          RTE.fromTaskEither(
            TE.tryCatch(async () => {
              await keyv.delete(keyEncoder.encode(key))
            }, E.toError),
          ),
          RTE.orElseFirstW(
            RTE.fromReaderIOK(
              flow(
                error => ({ error: error.message, key: keyEncoder.encode(key), namespace: keyv.opts.namespace }),
                L.errorP('Failed to delete key'),
              ),
            ),
          ),
        ),
      ),
      RTE.mapLeft(() => 'unavailable'),
    )

const getKey =
  <K, V>(keyEncoder: Encoder<string, K>, valueDecoder: Decoder<unknown, V>) =>
  (key: K): RTE.ReaderTaskEither<KeyvEnv & L.LoggerEnv, 'unavailable' | 'not-found', V> =>
    pipe(
      RTE.ask<KeyvEnv>(),
      RTE.chainW(({ keyv }) =>
        pipe(
          RTE.fromTaskEither(TE.tryCatch(() => keyv.get(keyEncoder.encode(key)), E.toError)),
          RTE.orElseFirstW(
            RTE.fromReaderIOK(
              flow(
                error => ({ error: error.message, key: keyEncoder.encode(key), namespace: keyv.opts.namespace }),
                L.errorP('Failed to get key'),
              ),
            ),
          ),
        ),
      ),
      RTE.mapLeft(() => 'unavailable' as const),
      RTE.chainEitherKW(
        flow(
          valueDecoder.decode,
          E.mapLeft(() => 'not-found' as const),
        ),
      ),
    )

const setKey =
  <K, V>(keyEncoder: Encoder<string, K>, valueEncoder: Encoder<unknown, V>) =>
  (key: K, value: V): RTE.ReaderTaskEither<KeyvEnv & L.LoggerEnv, 'unavailable', void> =>
    pipe(
      RTE.ask<KeyvEnv>(),
      RTE.chainW(({ keyv }) =>
        pipe(
          RTE.fromTaskEither(
            TE.tryCatch(async () => {
              await keyv.set(keyEncoder.encode(key), valueEncoder.encode(value))
            }, E.toError),
          ),
          RTE.orElseFirstW(
            RTE.fromReaderIOK(
              flow(
                error => ({ error: error.message, key: keyEncoder.encode(key), namespace: keyv.opts.namespace }),
                L.errorP('Failed to set key'),
              ),
            ),
          ),
        ),
      ),
      RTE.mapLeft(() => 'unavailable'),
    )

export const getAuthorInvite = flow(
  getKey(UuidC, AuthorInviteC),
  RTE.local((env: AuthorInviteStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.authorInviteStore })),
)

export const saveAuthorInvite = flow(
  setKey(UuidC, AuthorInviteC),
  RTE.local((env: AuthorInviteStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.authorInviteStore })),
)

export const deleteCareerStage = flow(
  deleteKey(OrcidE),
  RTE.local((env: CareerStageStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.careerStageStore })),
)

export const getCareerStage = flow(
  getKey(
    OrcidE,
    D.union(
      CareerStageC,
      pipe(
        D.literal('early', 'mid', 'late'),
        D.map(value => ({ value, visibility: 'restricted' }) satisfies CareerStage),
      ),
    ),
  ),
  RTE.local((env: CareerStageStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.careerStageStore })),
)

export const saveCareerStage = flow(
  setKey(OrcidE, CareerStageC),
  RTE.local((env: CareerStageStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.careerStageStore })),
)

export const isOpenForRequests = flow(
  getKey(OrcidE, IsOpenForRequestsC),
  RTE.local((env: IsOpenForRequestsStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.isOpenForRequestsStore })),
)

export const saveOpenForRequests = flow(
  setKey(OrcidE, IsOpenForRequestsC),
  RTE.local((env: IsOpenForRequestsStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.isOpenForRequestsStore })),
)

export const deleteResearchInterests = flow(
  deleteKey(OrcidE),
  RTE.local((env: ResearchInterestsStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.researchInterestsStore })),
)

export const getResearchInterests = flow(
  getKey(
    OrcidE,
    D.union(
      ResearchInterestsC,
      pipe(
        D.struct({ value: NonEmptyStringC }),
        D.map(value => ({ ...value, visibility: 'restricted' }) satisfies ResearchInterests),
      ),
      pipe(
        NonEmptyStringC,
        D.map(value => ({ value, visibility: 'restricted' }) satisfies ResearchInterests),
      ),
    ),
  ),
  RTE.local((env: ResearchInterestsStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.researchInterestsStore })),
)

export const saveResearchInterests = flow(
  setKey(OrcidE, ResearchInterestsC),
  RTE.local((env: ResearchInterestsStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.researchInterestsStore })),
)

export const deleteOrcidToken = flow(
  deleteKey(OrcidE),
  RTE.local((env: OrcidTokenStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.orcidTokenStore })),
)

export const getOrcidToken = flow(
  getKey(OrcidE, OrcidTokenC),
  RTE.local((env: OrcidTokenStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.orcidTokenStore })),
)

export const saveOrcidToken = flow(
  setKey(OrcidE, OrcidTokenC),
  RTE.local((env: OrcidTokenStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.orcidTokenStore })),
)

export const deleteSlackUserId = flow(
  deleteKey(OrcidE),
  RTE.local((env: SlackUserIdStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.slackUserIdStore })),
)

export const getSlackUserId = flow(
  getKey(OrcidE, SlackUserIdC),
  RTE.local((env: SlackUserIdStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.slackUserIdStore })),
)

export const saveSlackUserId = flow(
  setKey(OrcidE, SlackUserIdC),
  RTE.local((env: SlackUserIdStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.slackUserIdStore })),
)

export const deleteLocation = flow(
  deleteKey(OrcidE),
  RTE.local((env: LocationStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.locationStore })),
)

export const getLocation = flow(
  getKey(OrcidE, LocationC),
  RTE.local((env: LocationStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.locationStore })),
)

export const saveLocation = flow(
  setKey(OrcidE, LocationC),
  RTE.local((env: LocationStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.locationStore })),
)

export const deleteLanguages = flow(
  deleteKey(OrcidE),
  RTE.local((env: LanguagesStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.languagesStore })),
)

export const getLanguages = flow(
  getKey(OrcidE, LanguagesC),
  RTE.local((env: LanguagesStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.languagesStore })),
)

export const saveLanguages = flow(
  setKey(OrcidE, LanguagesC),
  RTE.local((env: LanguagesStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.languagesStore })),
)

export const getContactEmailAddress = flow(
  getKey(OrcidE, ContactEmailAddressC),
  RTE.local((env: ContactEmailAddressStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.contactEmailAddressStore })),
)

export const saveContactEmailAddress = flow(
  setKey(OrcidE, ContactEmailAddressC),
  RTE.local((env: ContactEmailAddressStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.contactEmailAddressStore })),
)

export const getUserOnboarding = flow(
  getKey(OrcidE, UserOnboardingC),
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right({ seenMyDetailsPage: false } satisfies UserOnboarding))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
  RTE.local((env: UserOnboardingStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.userOnboardingStore })),
)

export const saveUserOnboarding = flow(
  setKey(OrcidE, UserOnboardingC),
  RTE.local((env: UserOnboardingStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.userOnboardingStore })),
)

export const getAvatar = flow(
  getKey(OrcidE, NonEmptyStringC),
  RTE.local((env: AvatarStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.avatarStore })),
)

export const saveAvatar = flow(
  setKey(OrcidE, NonEmptyStringC),
  RTE.local((env: AvatarStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.avatarStore })),
)
