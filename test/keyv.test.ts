import { describe, expect, it } from '@effect/vitest'
import { SystemClock } from 'clock-ts'
import { Effect, Record, Struct } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import Keyv from 'keyv'
import { ContactEmailAddressC } from '../src/contact-email-address.ts'
import * as _ from '../src/keyv.ts'
import { OrcidTokenC } from '../src/orcid-token.ts'
import { SlackUserIdC } from '../src/slack-user-id.ts'
import { NonEmptyStringC, isNonEmptyString } from '../src/types/NonEmptyString.ts'
import { UserOnboardingC } from '../src/user-onboarding.ts'
import * as fc from './fc.ts'

describe('getAuthorInvite', () => {
  it.effect.prop('when the key contains an author invite', [fc.uuid(), fc.authorInvite()], ([uuid, authorInvite]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(uuid, authorInvite))

      const actual = yield* Effect.promise(
        _.getAuthorInvite(uuid)({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(authorInvite))
    }),
  )

  it.effect.prop(
    'when the key contains something other than author invite',
    [fc.uuid(), fc.anything()],
    ([uuid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(uuid, value))

        const actual = yield* Effect.promise(
          _.getAuthorInvite(uuid)({
            authorInviteStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.uuid()], ([uuid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getAuthorInvite(uuid)({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.uuid(), fc.anything()], ([uuid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getAuthorInvite(uuid)({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveAuthorInvite', () => {
  it.effect.prop('when the key contains an author invite', [fc.uuid(), fc.authorInvite()], ([uuid, authorInvite]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(uuid, authorInvite))

      const actual = yield* Effect.promise(
        _.saveAuthorInvite(
          uuid,
          authorInvite,
        )({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(uuid))).toStrictEqual(authorInvite)
    }),
  )

  it.effect.prop(
    'when the key already contains something other than an author invite',
    [fc.uuid(), fc.anything(), fc.authorInvite()],
    ([uuid, value, authorInvite]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(uuid, value))

        const actual = yield* Effect.promise(
          _.saveAuthorInvite(
            uuid,
            authorInvite,
          )({
            authorInviteStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(uuid))).toStrictEqual(authorInvite)
      }),
  )

  it.effect.prop('when the key is not set', [fc.uuid(), fc.authorInvite()], ([uuid, authorInvite]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveAuthorInvite(
          uuid,
          authorInvite,
        )({
          authorInviteStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(uuid))).toStrictEqual(authorInvite)
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.uuid(), fc.authorInvite(), fc.anything()],
    ([uuid, authorInvite, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveAuthorInvite(
            uuid,
            authorInvite,
          )({
            authorInviteStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('deleteCareerStage', () => {
  it.effect.prop('when the key contains a career stage', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, careerStage))

      const actual = yield* Effect.promise(
        _.deleteCareerStage(orcid)({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop(
    'when the key contains something other than career stage',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.deleteCareerStage(orcid)({
            careerStageStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.deleteCareerStage(orcid)({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.delete = () => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.deleteCareerStage(orcid)({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getCareerStage', () => {
  it.effect.prop('when the key contains a career stage', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, careerStage))

      const actual = yield* Effect.promise(
        _.getCareerStage(orcid)({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(careerStage))
    }),
  )

  it.effect.prop(
    'when the key contains a career stage as a string',
    [fc.orcidId(), fc.careerStage().map(Struct.get('value'))],
    ([orcid, careerStage]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, careerStage))

        const actual = yield* Effect.promise(
          _.getCareerStage(orcid)({
            careerStageStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right({ value: careerStage, visibility: 'restricted' }))
      }),
  )

  it.effect.prop(
    'when the key contains something other than career stage',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getCareerStage(orcid)({
            careerStageStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getCareerStage(orcid)({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getCareerStage(orcid)({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getAllCareerStages', () => {
  it.effect.prop(
    'when there are career stages',
    [fc.array(fc.tuple(fc.orcidId(), fc.careerStage()))],
    ([careerStages]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() =>
          Promise.all(careerStages.map(([orcid, careerStage]) => store.set(orcid, careerStage))),
        )

        const actual = yield* Effect.promise(
          _.getAllCareerStages({
            careerStageStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(Object.fromEntries(careerStages)))
      }),
  )

  it.effect.prop('when the store cannot be accessed', [fc.anything()], error =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.iterator = async function* iterator() {
        yield await Promise.reject(error)
      }

      const actual = yield* Effect.promise(
        _.getAllCareerStages({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveCareerStage', () => {
  it.effect.prop('when the key contains a career stage', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, careerStage))

      const actual = yield* Effect.promise(
        _.saveCareerStage(
          orcid,
          careerStage,
        )({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(careerStage)
    }),
  )

  it.effect.prop(
    'when the key already contains something other than career stage',
    [fc.orcidId(), fc.anything(), fc.careerStage()],
    ([orcid, value, careerStage]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveCareerStage(
            orcid,
            careerStage,
          )({
            careerStageStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(careerStage)
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.careerStage()], ([orcid, careerStage]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveCareerStage(
          orcid,
          careerStage,
        )({
          careerStageStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(careerStage)
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.careerStage(), fc.anything()],
    ([orcid, careerStage, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveCareerStage(
            orcid,
            careerStage,
          )({
            careerStageStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('isOpenForRequests', () => {
  it.effect.prop(
    'when the key contains open for requests',
    [fc.orcidId(), fc.isOpenForRequests()],
    ([orcid, isOpenForRequests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, isOpenForRequests))

        const actual = yield* Effect.promise(
          _.isOpenForRequests(orcid)({
            isOpenForRequestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(isOpenForRequests))
      }),
  )

  it.effect.prop(
    'when the key contains something other than open for requests',
    [fc.orcidId(), fc.oneof(fc.constant(''), fc.anything())],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.isOpenForRequests(orcid)({
            isOpenForRequestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.isOpenForRequests(orcid)({
          isOpenForRequestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.isOpenForRequests(orcid)({
          isOpenForRequestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveOpenForRequests', () => {
  it.effect.prop(
    'when the key contains open for requests',
    [fc.orcidId(), fc.isOpenForRequests()],
    ([orcid, isOpenForRequests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, isOpenForRequests))

        const actual = yield* Effect.promise(
          _.saveOpenForRequests(
            orcid,
            isOpenForRequests,
          )({
            isOpenForRequestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(isOpenForRequests)
      }),
  )

  it.effect.prop(
    'when the key already contains something other than open for requests',
    [fc.orcidId(), fc.anything(), fc.isOpenForRequests()],
    ([orcid, value, isOpenForRequests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveOpenForRequests(
            orcid,
            isOpenForRequests,
          )({
            isOpenForRequestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(isOpenForRequests)
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.isOpenForRequests()], ([orcid, isOpenForRequests]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveOpenForRequests(
          orcid,
          isOpenForRequests,
        )({
          isOpenForRequestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(isOpenForRequests)
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.isOpenForRequests(), fc.anything()],
    ([orcid, isOpenForRequests, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveOpenForRequests(
            orcid,
            isOpenForRequests,
          )({
            isOpenForRequestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('deleteResearchInterests', () => {
  it.effect.prop(
    'when the key contains research interests',
    [fc.orcidId(), fc.researchInterests()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, researchInterests))

        const actual = yield* Effect.promise(
          _.deleteResearchInterests(orcid)({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
      }),
  )

  it.effect.prop(
    'when the key contains something other than research interests',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.deleteResearchInterests(orcid)({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.deleteResearchInterests(orcid)({
          researchInterestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.delete = () => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.deleteResearchInterests(orcid)({
          researchInterestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getResearchInterests', () => {
  it.effect.prop(
    'when the key contains research interests',
    [fc.orcidId(), fc.researchInterests()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, researchInterests))

        const actual = yield* Effect.promise(
          _.getResearchInterests(orcid)({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(researchInterests))
      }),
  )

  it.effect.prop(
    'when the key contains research interests without a visibility level',
    [fc.orcidId(), fc.nonEmptyString()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, { value: researchInterests }))

        const actual = yield* Effect.promise(
          _.getResearchInterests(orcid)({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right({ value: researchInterests, visibility: 'restricted' }))
      }),
  )

  it.effect.prop(
    'when the key contains research interests as a string',
    [fc.orcidId(), fc.nonEmptyString()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, researchInterests))

        const actual = yield* Effect.promise(
          _.getResearchInterests(orcid)({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right({ value: researchInterests, visibility: 'restricted' }))
      }),
  )

  it.effect.prop(
    'when the key contains something other than research interests',
    [
      fc.orcidId(),
      fc.oneof(
        fc.constant(''),
        fc.anything().filter(value => typeof value !== 'string'),
      ),
    ],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getResearchInterests(orcid)({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getResearchInterests(orcid)({
          researchInterestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getResearchInterests(orcid)({
          researchInterestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveResearchInterests', () => {
  it.effect.prop(
    'when the key contains research interests',
    [fc.orcidId(), fc.researchInterests()],
    ([orcid, researchInterests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, researchInterests))

        const actual = yield* Effect.promise(
          _.saveResearchInterests(
            orcid,
            researchInterests,
          )({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(researchInterests)
      }),
  )

  it.effect.prop(
    'when the key already contains something other than research interests',
    [fc.orcidId(), fc.anything(), fc.researchInterests()],
    ([orcid, value, researchInterests]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveResearchInterests(
            orcid,
            researchInterests,
          )({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(researchInterests)
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.researchInterests()], ([orcid, researchInterests]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveResearchInterests(
          orcid,
          researchInterests,
        )({
          researchInterestsStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(researchInterests)
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.researchInterests(), fc.anything()],
    ([orcid, researchInterests, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveResearchInterests(
            orcid,
            researchInterests,
          )({
            researchInterestsStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('deleteOrcidToken', () => {
  it.effect.prop('when the key contains an ORCID token', [fc.orcidId(), fc.orcidToken()], ([orcid, orcidToken]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, OrcidTokenC.encode(orcidToken)))

      const actual = yield* Effect.promise(
        _.deleteOrcidToken(orcid)({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop(
    'when the key contains something other than an ORCID token',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.deleteOrcidToken(orcid)({
            orcidTokenStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.deleteOrcidToken(orcid)({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.delete = () => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.deleteOrcidToken(orcid)({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getOrcidToken', () => {
  it.effect.prop('when the key contains an ORCID token', [fc.orcidId(), fc.orcidToken()], ([orcid, getOrcidToken]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, OrcidTokenC.encode(getOrcidToken)))

      const actual = yield* Effect.promise(
        _.getOrcidToken(orcid)({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(getOrcidToken))
    }),
  )

  it.effect.prop(
    'when the key contains something other than an ORCID token',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getOrcidToken(orcid)({
            orcidTokenStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getOrcidToken(orcid)({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getOrcidToken(orcid)({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveOrcidToken', () => {
  it.effect.prop('when the key contains an ORCID token', [fc.orcidId(), fc.orcidToken()], ([orcid, orcidToken]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, OrcidTokenC.encode(orcidToken)))

      const actual = yield* Effect.promise(
        _.saveOrcidToken(
          orcid,
          orcidToken,
        )({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(OrcidTokenC.encode(orcidToken))
    }),
  )

  it.effect.prop(
    'when the key already contains something other than an ORCID token',
    [fc.orcidId(), fc.anything(), fc.orcidToken()],
    ([orcid, value, orcidToken]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveOrcidToken(
            orcid,
            orcidToken,
          )({
            orcidTokenStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(OrcidTokenC.encode(orcidToken))
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.orcidToken()], ([orcid, orcidToken]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveOrcidToken(
          orcid,
          orcidToken,
        )({
          orcidTokenStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(OrcidTokenC.encode(orcidToken))
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.orcidToken(), fc.anything()],
    ([orcid, orcidToken, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveOrcidToken(
            orcid,
            orcidToken,
          )({
            orcidTokenStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('deleteSlackUserId', () => {
  it.effect.prop('when the key contains a Slack user ID', [fc.orcidId(), fc.slackUserId()], ([orcid, slackUserId]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, SlackUserIdC.encode(slackUserId)))

      const actual = yield* Effect.promise(
        _.deleteSlackUserId(orcid)({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop(
    'when the key contains something other than a Slack user ID',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.deleteSlackUserId(orcid)({
            slackUserIdStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.deleteSlackUserId(orcid)({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.delete = () => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.deleteSlackUserId(orcid)({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getSlackUserId', () => {
  it.effect.prop('when the key contains a Slack user ID', [fc.orcidId(), fc.slackUserId()], ([orcid, getSlackUserId]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, SlackUserIdC.encode(getSlackUserId)))

      const actual = yield* Effect.promise(
        _.getSlackUserId(orcid)({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(SlackUserIdC.decode(SlackUserIdC.encode(getSlackUserId)))
    }),
  )

  it.effect.prop(
    'when the key contains something other than a Slack user ID',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getSlackUserId(orcid)({
            slackUserIdStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getSlackUserId(orcid)({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getSlackUserId(orcid)({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveSlackUserId', () => {
  it.effect.prop('when the key contains a Slack user ID', [fc.orcidId(), fc.slackUserId()], ([orcid, slackUserId]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, SlackUserIdC.encode(slackUserId)))

      const actual = yield* Effect.promise(
        _.saveSlackUserId(
          orcid,
          slackUserId,
        )({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(SlackUserIdC.encode(slackUserId))
    }),
  )

  it.effect.prop(
    'when the key already contains something other than a Slack user ID',
    [fc.orcidId(), fc.anything(), fc.slackUserId()],
    ([orcid, value, slackUserId]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveSlackUserId(
            orcid,
            slackUserId,
          )({
            slackUserIdStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(SlackUserIdC.encode(slackUserId))
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.slackUserId()], ([orcid, slackUserId]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveSlackUserId(
          orcid,
          slackUserId,
        )({
          slackUserIdStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(SlackUserIdC.encode(slackUserId))
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.slackUserId(), fc.anything()],
    ([orcid, slackUserId, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveSlackUserId(
            orcid,
            slackUserId,
          )({
            slackUserIdStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('deleteLocation', () => {
  it.effect.prop('when the key contains a location', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, location))

      const actual = yield* Effect.promise(
        _.deleteLocation(orcid)({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop(
    'when the key contains something other than a location',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.deleteLocation(orcid)({
            locationStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.deleteLocation(orcid)({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.delete = () => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.deleteLocation(orcid)({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getLocation', () => {
  it.effect.prop('when the key contains a location', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, location))

      const actual = yield* Effect.promise(
        _.getLocation(orcid)({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(location))
    }),
  )

  it.effect.prop(
    'when the key contains something other than a location',
    [
      fc.orcidId(),
      fc.oneof(
        fc.constant(''),
        fc.anything().filter(value => typeof value !== 'string'),
      ),
    ],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getLocation(orcid)({
            locationStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getLocation(orcid)({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getLocation(orcid)({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getAllLocations', () => {
  it.effect.prop('when there are locations', [fc.array(fc.tuple(fc.orcidId(), fc.location()))], ([locations]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => Promise.all(locations.map(([orcid, location]) => store.set(orcid, location))))

      const actual = yield* Effect.promise(
        _.getAllLocations({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(Object.fromEntries(locations)))
    }),
  )

  it.effect.prop('when the store cannot be accessed', [fc.anything()], error =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.iterator = async function* iterator() {
        yield await Promise.reject(error)
      }

      const actual = yield* Effect.promise(
        _.getAllLocations({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveLocation', () => {
  it.effect.prop('when the key contains a location', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, location))

      const actual = yield* Effect.promise(
        _.saveLocation(
          orcid,
          location,
        )({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(location)
    }),
  )

  it.effect.prop(
    'when the key already contains something other than a location',
    [fc.orcidId(), fc.anything(), fc.location()],
    ([orcid, value, location]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveLocation(
            orcid,
            location,
          )({
            locationStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(location)
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.location()], ([orcid, location]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveLocation(
          orcid,
          location,
        )({
          locationStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(location)
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.location(), fc.anything()],
    ([orcid, location, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveLocation(
            orcid,
            location,
          )({
            locationStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('deleteLanguages', () => {
  it.effect.prop('when the key contains languages', [fc.orcidId(), fc.languages()], ([orcid, languages]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, languages))

      const actual = yield* Effect.promise(
        _.deleteLanguages(orcid)({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop(
    'when the key contains something other than languages',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.deleteLanguages(orcid)({
            languagesStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.deleteLanguages(orcid)({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.delete = () => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.deleteLanguages(orcid)({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('getLanguages', () => {
  it.effect.prop('when the key contains languages', [fc.orcidId(), fc.languages()], ([orcid, languages]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, languages))

      const actual = yield* Effect.promise(
        _.getLanguages(orcid)({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(languages))
    }),
  )

  it.effect.prop(
    'when the key contains something other than languages',
    [
      fc.orcidId(),
      fc.oneof(
        fc.constant(''),
        fc.anything().filter(value => typeof value !== 'string'),
      ),
    ],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getLanguages(orcid)({
            languagesStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getLanguages(orcid)({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getLanguages(orcid)({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveLanguages', () => {
  it.effect.prop('when the key contains languages', [fc.orcidId(), fc.languages()], ([orcid, languages]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, languages))

      const actual = yield* Effect.promise(
        _.saveLanguages(
          orcid,
          languages,
        )({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(languages)
    }),
  )

  it.effect.prop(
    'when the key already contains something other than languages',
    [fc.orcidId(), fc.anything(), fc.languages()],
    ([orcid, value, languages]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveLanguages(
            orcid,
            languages,
          )({
            languagesStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(languages)
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.languages()], ([orcid, languages]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveLanguages(
          orcid,
          languages,
        )({
          languagesStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(languages)
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.languages(), fc.anything()],
    ([orcid, languages, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveLanguages(
            orcid,
            languages,
          )({
            languagesStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('getContactEmailAddress', () => {
  it.effect.prop(
    'when the key contains an email address',
    [fc.orcidId(), fc.contactEmailAddress()],
    ([orcid, emailAddress]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, ContactEmailAddressC.encode(emailAddress)))

        const actual = yield* Effect.promise(
          _.getContactEmailAddress(orcid)({
            contactEmailAddressStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(emailAddress))
      }),
  )

  it.effect.prop(
    'when the key contains something other than an email address',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getContactEmailAddress(orcid)({
            contactEmailAddressStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getContactEmailAddress(orcid)({
          contactEmailAddressStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getContactEmailAddress(orcid)({
          contactEmailAddressStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveContactEmailAddress', () => {
  it.effect.prop(
    'when the key contains an email address',
    [fc.orcidId(), fc.contactEmailAddress()],
    ([orcid, emailAddress]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, ContactEmailAddressC.encode(emailAddress)))

        const actual = yield* Effect.promise(
          _.saveContactEmailAddress(
            orcid,
            emailAddress,
          )({
            contactEmailAddressStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(ContactEmailAddressC.encode(emailAddress))
      }),
  )

  it.effect.prop(
    'when the key already contains something other than an email address',
    [fc.orcidId(), fc.anything(), fc.contactEmailAddress()],
    ([orcid, value, emailAddress]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveContactEmailAddress(
            orcid,
            emailAddress,
          )({
            contactEmailAddressStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(ContactEmailAddressC.encode(emailAddress))
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.contactEmailAddress()], ([orcid, emailAddress]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveContactEmailAddress(
          orcid,
          emailAddress,
        )({
          contactEmailAddressStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(ContactEmailAddressC.encode(emailAddress))
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.contactEmailAddress(), fc.anything()],
    ([orcid, emailAddress, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveContactEmailAddress(
            orcid,
            emailAddress,
          )({
            contactEmailAddressStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('getUserOnboarding', () => {
  it.effect.prop(
    'when the key contains user onboarding details',
    [fc.orcidId(), fc.userOnboarding()],
    ([orcid, userOnboarding]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, UserOnboardingC.encode(userOnboarding)))

        const actual = yield* Effect.promise(
          _.getUserOnboarding(orcid)({
            userOnboardingStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(userOnboarding))
      }),
  )

  it.effect.prop(
    'when the key contains something other than user onboarding details',
    [fc.orcidId(), fc.anything()],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getUserOnboarding(orcid)({
            userOnboardingStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right({ seenMyDetailsPage: false }))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getUserOnboarding(orcid)({
          userOnboardingStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right({ seenMyDetailsPage: false }))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getUserOnboarding(orcid)({
          userOnboardingStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveUserOnboarding', () => {
  it.effect.prop(
    'when the key contains user onboarding details',
    [fc.orcidId(), fc.userOnboarding()],
    ([orcid, userOnboarding]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, UserOnboardingC.encode(userOnboarding)))

        const actual = yield* Effect.promise(
          _.saveUserOnboarding(
            orcid,
            userOnboarding,
          )({
            userOnboardingStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(UserOnboardingC.encode(userOnboarding))
      }),
  )

  it.effect.prop(
    'when the key already contains something other than user onboarding details',
    [fc.orcidId(), fc.anything(), fc.userOnboarding()],
    ([orcid, value, userOnboarding]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveUserOnboarding(
            orcid,
            userOnboarding,
          )({
            userOnboardingStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(UserOnboardingC.encode(userOnboarding))
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.userOnboarding()], ([orcid, userOnboarding]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveUserOnboarding(
          orcid,
          userOnboarding,
        )({
          userOnboardingStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(UserOnboardingC.encode(userOnboarding))
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.userOnboarding(), fc.anything()],
    ([orcid, userOnboarding, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveUserOnboarding(
            orcid,
            userOnboarding,
          )({
            userOnboardingStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('getAvatar', () => {
  it.effect.prop('when the key contains an avatar', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatar]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, avatar))

      const actual = yield* Effect.promise(
        _.getAvatar(orcid)({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(avatar))
    }),
  )

  it.effect.prop(
    'when the key contains something other than an avatar',
    [fc.orcidId(), fc.anything().filter(value => typeof value !== 'string' || !isNonEmptyString(value))],
    ([orcid, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.getAvatar(orcid)({
            avatarStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('not-found'))
      }),
  )

  it.effect.prop('when the key is not found', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.getAvatar(orcid)({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.getAvatar(orcid)({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('saveAvatar', () => {
  it.effect.prop('when the key contains an avatar', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatar]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, NonEmptyStringC.encode(avatar)))

      const actual = yield* Effect.promise(
        _.saveAvatar(
          orcid,
          avatar,
        )({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(NonEmptyStringC.encode(avatar))
    }),
  )

  it.effect.prop(
    'when the key already contains something other than an avatar',
    [fc.orcidId(), fc.anything(), fc.nonEmptyString()],
    ([orcid, value, avatar]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(orcid, value))

        const actual = yield* Effect.promise(
          _.saveAvatar(
            orcid,
            avatar,
          )({
            avatarStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(NonEmptyStringC.encode(avatar))
      }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatar]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.saveAvatar(
          orcid,
          avatar,
        )({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.get(orcid))).toStrictEqual(NonEmptyStringC.encode(avatar))
    }),
  )

  it.effect.prop(
    'when the key cannot be accessed',
    [fc.orcidId(), fc.nonEmptyString(), fc.anything()],
    ([orcid, avatar, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.saveAvatar(orcid, avatar)({ avatarStore: store, clock: SystemClock, logger: () => IO.of(undefined) }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('deleteAvatar', () => {
  it.effect.prop('when the key contains a avatar', [fc.orcidId(), fc.nonEmptyString()], ([orcid, avatar]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, avatar))

      const actual = yield* Effect.promise(
        _.deleteAvatar(orcid)({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key contains something other than avatar', [fc.orcidId(), fc.anything()], ([orcid, value]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      yield* Effect.promise(() => store.set(orcid, value))

      const actual = yield* Effect.promise(
        _.deleteAvatar(orcid)({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key is not set', [fc.orcidId()], ([orcid]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.deleteAvatar(orcid)({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
      expect(yield* Effect.promise(() => store.has(orcid))).toBeFalsy()
    }),
  )

  it.effect.prop('when the key cannot be accessed', [fc.orcidId(), fc.anything()], ([orcid, error]) =>
    Effect.gen(function* () {
      const store = new Keyv()
      store.delete = () => Promise.reject(error)

      const actual = yield* Effect.promise(
        _.deleteAvatar(orcid)({
          avatarStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )
})

describe('addToSession', () => {
  it.effect.prop(
    'when there is a session',
    [fc.string(), fc.dictionary(fc.lorem(), fc.string()), fc.lorem(), fc.string()],
    ([sessionId, session, key, value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, session))

        const actual = yield* Effect.promise(
          _.addToSession(
            sessionId,
            key,
            value,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(yield* Effect.promise(() => store.get(sessionId))).toStrictEqual({ ...session, [key]: value })
      }),
  )

  it.effect.prop('when the session is not set', [fc.string(), fc.lorem(), fc.string()], ([sessionId, key, value]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.addToSession(
          sessionId,
          key,
          value,
        )({
          sessionStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(yield* Effect.promise(() => store.has(sessionId))).toBeFalsy()
    }),
  )

  it.effect.prop(
    'when the session cannot be accessed',
    [fc.string(), fc.json(), fc.string(), fc.json(), fc.anything()],
    ([sessionId, session, key, value, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, session))
        store.set = () => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.addToSession(
            sessionId,
            key,
            value,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('popFromSession', () => {
  it.effect.prop(
    'when the session contains the key',
    [
      fc.string(),
      fc
        .tuple(fc.dictionary(fc.lorem(), fc.string()), fc.lorem())
        .filter(([session, key]) => !Record.has(session, key)),
      fc.string(),
    ],
    ([sessionId, [session, key], value]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, { ...session, [key]: value }))

        const actual = yield* Effect.promise(
          _.popFromSession(
            sessionId,
            key,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right(value))
        expect(yield* Effect.promise(() => store.get(sessionId))).toStrictEqual(session)
      }),
  )

  it.effect.prop(
    'when the key is not found in the session',
    [
      fc.string(),
      fc
        .tuple(fc.dictionary(fc.lorem(), fc.string()), fc.lorem())
        .filter(([session, key]) => !Record.has(session, key)),
    ],
    ([sessionId, [session, key]]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        yield* Effect.promise(() => store.set(sessionId, session))

        const actual = yield* Effect.promise(
          _.popFromSession(
            sessionId,
            key,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(yield* Effect.promise(() => store.get(sessionId))).toStrictEqual(session)
      }),
  )

  it.effect.prop('when the session is not found', [fc.string(), fc.lorem()], ([sessionId, key]) =>
    Effect.gen(function* () {
      const store = new Keyv()

      const actual = yield* Effect.promise(
        _.popFromSession(
          sessionId,
          key,
        )({
          sessionStore: store,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.left('unavailable'))
    }),
  )

  it.effect.prop(
    'when the session cannot be accessed',
    [fc.string(), fc.lorem(), fc.anything()],
    ([sessionId, key, error]) =>
      Effect.gen(function* () {
        const store = new Keyv()
        store.get = (): Promise<never> => Promise.reject(error)

        const actual = yield* Effect.promise(
          _.popFromSession(
            sessionId,
            key,
          )({
            sessionStore: store,
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})
