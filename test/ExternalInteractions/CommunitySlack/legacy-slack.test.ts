import { describe, expect, it } from '@effect/vitest'
import { SystemClock } from 'clock-ts'
import { Effect } from 'effect'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as _ from '../../../src/ExternalInteractions/CommunitySlack/legacy-slack.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { toUrl } from '../../../src/types/OrcidId.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('addOrcidToSlackProfile', () => {
  describe('when Slack should be updated', () => {
    it.effect.prop(
      'when the request is successful',
      [fc.string(), fc.slackUserId(), fc.orcidId()],
      ([slackApiToken, userId, orcid]) =>
        Effect.gen(function* () {
          const fetch = fetchMock
            .createInstance()
            .postOnce({
              url: 'https://slack.com/api/users.profile.set',
              body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
              headers: { Authorization: `Bearer ${userId.accessToken}` },
              response: { body: { ok: true } },
            })
            .postOnce({
              url: 'https://slack.com/api/chat.postMessage',
              body: {
                channel: userId.userId,
                text: 'Thanks for connecting your PREreview profile to your Community Slack Account. I’ve added your ORCID iD to your Slack profile.',
              },
              headers: { Authorization: `Bearer ${slackApiToken}` },
              response: { body: { ok: true } },
            })

          const actual = yield* Effect.promise(
            _.addOrcidToSlackProfile(
              userId,
              orcid,
            )({
              fetch: (...args) => fetch.fetchHandler(...args),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      "when the response can't be decoded",
      [fc.string(), fc.slackUserId(), fc.orcidId(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })],
      ([slackApiToken, userId, orcid, response]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
            response,
          })

          const actual = yield* Effect.promise(
            _.addOrcidToSlackProfile(
              userId,
              orcid,
            )({
              fetch: (...args) => fetch.fetchHandler(...args),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when the response has a Slack error',
      [fc.string(), fc.slackUserId(), fc.orcidId(), fc.nonEmptyString()],
      ([slackApiToken, userId, orcid, error]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
            response: { body: { ok: false, error } },
          })

          const actual = yield* Effect.promise(
            _.addOrcidToSlackProfile(
              userId,
              orcid,
            )({
              fetch: (...args) => fetch.fetchHandler(...args),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiUpdate: true,
              slackApiToken,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when the response has a non-200 status code',
      [
        fc.string(),
        fc.slackUserId(),
        fc.orcidId(),
        fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK),
      ],
      ([slackApiToken, userId, orcid, status]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
            response: { status },
          })

          const actual = yield* Effect.promise(
            _.addOrcidToSlackProfile(
              userId,
              orcid,
            )({
              fetch: (...args) => fetch.fetchHandler(...args),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when fetch throws an error',
      [fc.string(), fc.slackUserId(), fc.orcidId(), fc.error()],
      ([slackApiToken, userId, orcid, error]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.addOrcidToSlackProfile(
              userId,
              orcid,
            )({
              fetch: () => Promise.reject(error),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
        }),
    )
  })

  it.effect.prop(
    "when Slack shouldn't be updated",
    [fc.string(), fc.slackUserId(), fc.orcidId()],
    ([slackApiToken, userId, orcid]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.addOrcidToSlackProfile(
            userId,
            orcid,
          )({
            fetch: shouldNotBeCalled,
            clock: SystemClock,
            logger: () => IO.of(undefined),
            slackApiToken,
            slackApiUpdate: false,
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
      }),
  )
})

describe('removeOrcidFromSlackProfile', () => {
  describe('when Slack should be updated', () => {
    it.effect.prop('when the request is successful', [fc.string(), fc.slackUserId()], ([slackApiToken, userId]) =>
      Effect.gen(function* () {
        const fetch = fetchMock
          .createInstance()
          .postOnce({
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
            response: { body: { ok: true } },
          })
          .postOnce({
            url: 'https://slack.com/api/chat.postMessage',
            body: {
              channel: userId.userId,
              text: 'As you’ve disconnected your PREreview profile from your Community Slack account, I’ve removed your ORCID iD from your Slack profile.',
            },
            headers: { Authorization: `Bearer ${slackApiToken}` },
            response: { body: { ok: true } },
          })

        const actual = yield* Effect.promise(
          _.removeOrcidFromSlackProfile(userId)({
            fetch: (...args) => fetch.fetchHandler(...args),
            clock: SystemClock,
            logger: () => IO.of(undefined),
            slackApiToken,
            slackApiUpdate: true,
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
    )

    it.effect.prop(
      "when the response can't be decoded",
      [fc.string(), fc.slackUserId(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })],
      ([slackApiToken, userId, response]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
            response,
          })

          const actual = yield* Effect.promise(
            _.removeOrcidFromSlackProfile(userId)({
              fetch: (...args) => fetch.fetchHandler(...args),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when the response has a Slack error',
      [fc.string(), fc.slackUserId(), fc.nonEmptyString()],
      ([slackApiToken, userId, error]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
            response: { body: { ok: false, error } },
          })

          const actual = yield* Effect.promise(
            _.removeOrcidFromSlackProfile(userId)({
              fetch: (...args) => fetch.fetchHandler(...args),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when the response has a non-200 status code',
      [fc.string(), fc.slackUserId(), fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK)],
      ([slackApiToken, userId, status]) =>
        Effect.gen(function* () {
          const fetch = fetchMock.createInstance().postOnce({
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
            response: { status },
          })

          const actual = yield* Effect.promise(
            _.removeOrcidFromSlackProfile(userId)({
              fetch: (...args) => fetch.fetchHandler(...args),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when fetch throws an error',
      [fc.string(), fc.slackUserId(), fc.error()],
      ([slackApiToken, userId, error]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.removeOrcidFromSlackProfile(userId)({
              fetch: () => Promise.reject(error),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              slackApiToken,
              slackApiUpdate: true,
            }),
          )

          expect(actual).toStrictEqual(E.left('unavailable'))
        }),
    )
  })

  it.effect.prop("when Slack shouldn't be updated", [fc.string(), fc.slackUserId()], ([slackApiToken, userId]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.removeOrcidFromSlackProfile(userId)({
          fetch: shouldNotBeCalled,
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiToken,
          slackApiUpdate: false,
        }),
      )

      expect(actual).toStrictEqual(E.right(undefined))
    }),
  )
})
