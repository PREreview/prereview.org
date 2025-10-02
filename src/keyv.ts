import KeyvRedis from '@keyv/redis'
import { Context, Effect, flow, identity, Layer, Option, pipe, Record } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type { Json } from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { SessionEnv } from 'hyper-ts-session'
import type { Decoder } from 'io-ts/lib/Decoder.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Encoder } from 'io-ts/lib/Encoder.js'
import * as EN from 'io-ts/lib/Encoder.js'
import Keyv from 'keyv'
import * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import { AuthorInviteC } from './author-invite.ts'
import { type CareerStage, CareerStageC } from './career-stage.ts'
import { ContactEmailAddressC } from './contact-email-address.ts'
import { IsOpenForRequestsC } from './is-open-for-requests.ts'
import { LanguagesC } from './languages.ts'
import { LocationC } from './location.ts'
import { OrcidTokenC } from './orcid-token.ts'
import type { PreprintId } from './Preprints/index.ts'
import { DataStoreRedis } from './Redis.ts'
import { type ResearchInterests, ResearchInterestsC } from './research-interests.ts'
import { ReviewRequestC } from './review-request.ts'
import { SlackUserIdC } from './slack-user-id.ts'
import { NonEmptyStringC } from './types/NonEmptyString.ts'
import { isOrcidId, type OrcidId } from './types/OrcidId.ts'
import { UuidC } from './types/uuid.ts'
import { type UserOnboarding, UserOnboardingC } from './user-onboarding.ts'
import type { FormStoreEnv } from './write-review/index.ts'

export { Keyv } from 'keyv'

export class KeyvStores extends Context.Tag('KeyvStores')<
  KeyvStores,
  AvatarStoreEnv &
    AuthorInviteStoreEnv &
    CareerStageStoreEnv &
    ContactEmailAddressStoreEnv &
    IsOpenForRequestsStoreEnv &
    LanguagesStoreEnv &
    LocationStoreEnv &
    OrcidTokenStoreEnv &
    ResearchInterestsStoreEnv &
    ReviewRequestStoreEnv &
    SlackUserIdStoreEnv &
    UserOnboardingStoreEnv &
    FormStoreEnv
>() {}

export const keyvStoresLayer = Layer.effect(
  KeyvStores,
  Effect.gen(function* () {
    const maybeRedis = yield* Effect.serviceOption(DataStoreRedis)

    const createKeyvStore = () =>
      Option.match(maybeRedis, {
        onSome: redis => new KeyvRedis(redis).on('error', () => undefined),
        onNone: () => new Map(),
      })

    return {
      authorInviteStore: new Keyv({ emitErrors: false, namespace: 'author-invite', store: createKeyvStore() }),
      avatarStore: new Keyv({ emitErrors: false, namespace: 'avatar-store', store: createKeyvStore() }),
      contactEmailAddressStore: new Keyv({
        emitErrors: false,
        namespace: 'contact-email-address',
        store: createKeyvStore(),
      }),
      formStore: new Keyv({ emitErrors: false, namespace: 'forms', store: createKeyvStore() }),
      careerStageStore: new Keyv({ emitErrors: false, namespace: 'career-stage', store: createKeyvStore() }),
      isOpenForRequestsStore: new Keyv({
        emitErrors: false,
        namespace: 'is-open-for-requests',
        store: createKeyvStore(),
      }),
      languagesStore: new Keyv({ emitErrors: false, namespace: 'languages', store: createKeyvStore() }),
      locationStore: new Keyv({ emitErrors: false, namespace: 'location', store: createKeyvStore() }),
      orcidTokenStore: new Keyv({ emitErrors: false, namespace: 'orcid-token', store: createKeyvStore() }),
      researchInterestsStore: new Keyv({
        emitErrors: false,
        namespace: 'research-interests',
        store: createKeyvStore(),
      }),
      reviewRequestStore: new Keyv({ emitErrors: false, namespace: 'review-request', store: createKeyvStore() }),
      slackUserIdStore: new Keyv({ emitErrors: false, namespace: 'slack-user-id', store: createKeyvStore() }),
      userOnboardingStore: new Keyv({ emitErrors: false, namespace: 'user-onboarding', store: createKeyvStore() }),
    }
  }),
)

export interface AuthorInviteStoreEnv {
  authorInviteStore: Keyv
}

export interface AvatarStoreEnv {
  avatarStore: Keyv
}

export interface CareerStageStoreEnv {
  careerStageStore: Keyv
}

export interface ContactEmailAddressStoreEnv {
  contactEmailAddressStore: Keyv
}

export interface IsOpenForRequestsStoreEnv {
  isOpenForRequestsStore: Keyv
}

export interface LanguagesStoreEnv {
  languagesStore: Keyv
}

export interface LocationStoreEnv {
  locationStore: Keyv
}

export interface ResearchInterestsStoreEnv {
  researchInterestsStore: Keyv
}

export interface OrcidTokenStoreEnv {
  orcidTokenStore: Keyv
}

export interface ReviewRequestStoreEnv {
  reviewRequestStore: Keyv
}

export interface SlackUserIdStoreEnv {
  slackUserIdStore: Keyv
}

export interface UserOnboardingStoreEnv {
  userOnboardingStore: Keyv
}

interface KeyvEnv {
  keyv: Keyv
}

const OrcidD: Decoder<unknown, OrcidId> = D.fromRefinement(isOrcidId, 'ORCID')

const OrcidE: Encoder<string, OrcidId> = { encode: identity }

const PreprintIdE: Encoder<string, PreprintId> = {
  encode: preprintId => `${preprintId._tag}-${preprintId.value}`,
}

const UnderscoreTupleE = flow(EN.tuple, EN.compose({ encode: values => values.join('_') }))

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
                error => ({
                  error: error.message,
                  key: keyEncoder.encode(key),
                  namespace: keyv.opts.namespace as Json,
                }),
                L.errorP('Failed to delete key'),
              ),
            ),
          ),
        ),
      ),
      RTE.mapLeft(() => 'unavailable'),
    )

const getAll = <K extends string, V>(
  keyDecoder: Decoder<unknown, K>,
  valueDecoder: Decoder<unknown, V>,
): RTE.ReaderTaskEither<
  KeyvEnv & L.LoggerEnv,
  'unavailable',
  Record.ReadonlyRecord<Record.ReadonlyRecord.NonLiteralKey<K>, V>
> =>
  pipe(
    RTE.ask<KeyvEnv>(),
    RTE.chainW(({ keyv }) =>
      RTE.fromTaskEither(
        TE.tryCatch(() => (keyv.iterator ? toArray(keyv.iterator(undefined)) : Promise.resolve([])), E.toError),
      ),
    ),
    RTE.chainEitherKW(D.array(D.tuple(keyDecoder, valueDecoder)).decode),
    RTE.bimap(() => 'unavailable' as const, Record.fromEntries),
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
                error => ({
                  error: error.message,
                  key: keyEncoder.encode(key),
                  namespace: keyv.opts.namespace as Json,
                }),
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
                error => ({
                  error: error.message,
                  key: keyEncoder.encode(key),
                  namespace: keyv.opts.namespace as Json,
                }),
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

export const getAllCareerStages = pipe(
  getAll(
    OrcidD,
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

export const getAllLocations = pipe(
  getAll(OrcidD, LocationC),
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

export const deleteAvatar = flow(
  deleteKey(OrcidE),
  RTE.local((env: AvatarStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.avatarStore })),
)

export const getReviewRequest = flow(
  getKey(UnderscoreTupleE(OrcidE, PreprintIdE), ReviewRequestC),
  RTE.local((env: ReviewRequestStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.reviewRequestStore })),
)

export const saveReviewRequest = flow(
  setKey(UnderscoreTupleE(OrcidE, PreprintIdE), ReviewRequestC),
  RTE.local((env: ReviewRequestStoreEnv & L.LoggerEnv) => ({ ...env, keyv: env.reviewRequestStore })),
)

export const addToSession = (sessionId: string, key: string, value: Json) =>
  pipe(
    getKey(EN.id<string>(), D.UnknownRecord)(sessionId),
    RTE.mapLeft(() => 'unavailable' as const),
    RTE.chain(session =>
      setKey(EN.id<string>(), EN.id<Record<string, unknown>>())(sessionId, { ...session, [key]: value }),
    ),
    RTE.local((env: Pick<SessionEnv, 'sessionStore'> & L.LoggerEnv) => ({ ...env, keyv: env.sessionStore })),
  )

export const popFromSession = (sessionId: string, key: string) =>
  pipe(
    getKey(EN.id<string>(), D.UnknownRecord)(sessionId),
    RTE.bindTo('session'),
    RTE.bindW(
      'value',
      RTE.fromNullableK('unavailable' as const)(({ session }) => session[key] as Json),
    ),
    RTE.mapLeft(() => 'unavailable' as const),
    RTE.chainFirst(({ session }) =>
      setKey(EN.id<string>(), EN.id<Record<string, unknown>>())(sessionId, { ...session, [key]: undefined }),
    ),
    RTE.map(({ value }) => value),
    RTE.local((env: Pick<SessionEnv, 'sessionStore'> & L.LoggerEnv) => ({ ...env, keyv: env.sessionStore })),
  )

async function toArray<T>(asyncIterator: AsyncIterable<T>): Promise<ReadonlyArray<T>> {
  const array = []
  for await (const item of asyncIterator) {
    array.push(item)
  }
  return array
}
