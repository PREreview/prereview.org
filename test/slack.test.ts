import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import { URL } from 'url'
import * as StatusCodes from '../src/StatusCodes.js'
import * as _ from '../src/slack.js'
import { toUrl } from '../src/types/Orcid.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

describe('getUserFromSlack', () => {
  test.prop([fc.string(), fc.string({ unit: fc.alphanumeric(), minLength: 1 }), fc.nonEmptyString(), fc.url()])(
    'when the user can be decoded',
    async (slackApiToken, user, name, image) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://slack.com/api/users.profile.get?',
          query: { user },
          headers: { Authorization: `Bearer ${slackApiToken}` },
        },
        { body: { ok: true, profile: { real_name: name, image_48: image } } },
      )

      const actual = await _.getUserFromSlack(user)({
        fetch,
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(
        E.right({
          name,
          image,
          profile: new URL(`https://prereviewcommunity.slack.com/team/${user}`),
        }),
      )
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.string(),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])("when the user can't be decoded", async (slackApiToken, user, response) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'begin:https://slack.com/api/users.profile.get?',
        query: { user },
        headers: { Authorization: `Bearer ${slackApiToken}` },
      },
      response,
    )

    const actual = await _.getUserFromSlack(user)({
      fetch,
      slackApiToken,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.string(), fc.string({ unit: fc.alphanumeric(), minLength: 1 }), fc.nonEmptyString()])(
    'when the response has a Slack error',
    async (slackApiToken, user, error) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://slack.com/api/users.profile.get?',
          query: { user },
          headers: { Authorization: `Bearer ${slackApiToken}` },
        },
        { body: { ok: false, error } },
      )

      const actual = await _.getUserFromSlack(user)({
        fetch,
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.string(),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK),
  ])('when the response has a non-200 status code', async (slackApiToken, user, status) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'begin:https://slack.com/api/users.profile.get?',
        query: { user },
        headers: { Authorization: `Bearer ${slackApiToken}` },
      },
      { status },
    )

    const actual = await _.getUserFromSlack(user)({
      fetch,
      slackApiToken,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.string(), fc.string({ unit: fc.alphanumeric(), minLength: 1 }), fc.error()])(
    'when fetch throws an error',
    async (slackApiToken, user, error) => {
      const actual = await _.getUserFromSlack(user)({
        fetch: () => Promise.reject(error),
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('addOrcidToSlackProfile', () => {
  describe('when Slack should be updated', () => {
    test.prop([fc.string(), fc.slackUserId(), fc.orcid()])(
      'when the request is successful',
      async (slackApiToken, userId, orcid) => {
        const fetch = fetchMock
          .sandbox()
          .postOnce(
            {
              url: 'https://slack.com/api/users.profile.set',
              body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
              headers: { Authorization: `Bearer ${userId.accessToken}` },
            },
            { body: { ok: true } },
          )
          .postOnce(
            {
              url: 'https://slack.com/api/chat.postMessage',
              body: {
                channel: userId.userId,
                text: 'Thanks for connecting your PREreview profile to your Community Slack Account. I’ve added your ORCID iD to your Slack profile.',
              },
              headers: { Authorization: `Bearer ${slackApiToken}` },
            },
            { body: { ok: true } },
          )

        const actual = await _.addOrcidToSlackProfile(
          userId,
          orcid,
        )({
          fetch,
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiToken,
          slackApiUpdate: true,
        })()

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.slackUserId(), fc.orcid(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })])(
      "when the response can't be decoded",
      async (slackApiToken, userId, orcid, response) => {
        const fetch = fetchMock.sandbox().postOnce(
          {
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
          },
          response,
        )

        const actual = await _.addOrcidToSlackProfile(
          userId,
          orcid,
        )({
          fetch,
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiToken,
          slackApiUpdate: true,
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.slackUserId(), fc.orcid(), fc.nonEmptyString()])(
      'when the response has a Slack error',
      async (slackApiToken, userId, orcid, error) => {
        const fetch = fetchMock.sandbox().postOnce(
          {
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
          },
          { body: { ok: false, error } },
        )

        const actual = await _.addOrcidToSlackProfile(
          userId,
          orcid,
        )({
          fetch,
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiUpdate: true,
          slackApiToken,
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([
      fc.string(),
      fc.slackUserId(),
      fc.orcid(),
      fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK),
    ])('when the response has a non-200 status code', async (slackApiToken, userId, orcid, status) => {
      const fetch = fetchMock.sandbox().postOnce(
        {
          url: 'https://slack.com/api/users.profile.set',
          body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
          headers: { Authorization: `Bearer ${userId.accessToken}` },
        },
        { status },
      )

      const actual = await _.addOrcidToSlackProfile(
        userId,
        orcid,
      )({
        fetch,
        clock: SystemClock,
        logger: () => IO.of(undefined),
        slackApiToken,
        slackApiUpdate: true,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    })

    test.prop([fc.string(), fc.slackUserId(), fc.orcid(), fc.error()])(
      'when fetch throws an error',
      async (slackApiToken, userId, orcid, error) => {
        const actual = await _.addOrcidToSlackProfile(
          userId,
          orcid,
        )({
          fetch: () => Promise.reject(error),
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiToken,
          slackApiUpdate: true,
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
      },
    )
  })

  test.prop([fc.string(), fc.slackUserId(), fc.orcid()])(
    "when Slack shouldn't be updated",
    async (slackApiToken, userId, orcid) => {
      const actual = await _.addOrcidToSlackProfile(
        userId,
        orcid,
      )({
        fetch: shouldNotBeCalled,
        clock: SystemClock,
        logger: () => IO.of(undefined),
        slackApiToken,
        slackApiUpdate: false,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
    },
  )
})

describe('removeOrcidFromSlackProfile', () => {
  describe('when Slack should be updated', () => {
    test.prop([fc.string(), fc.slackUserId()])('when the request is successful', async (slackApiToken, userId) => {
      const fetch = fetchMock
        .sandbox()
        .postOnce(
          {
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
          },
          { body: { ok: true } },
        )
        .postOnce(
          {
            url: 'https://slack.com/api/chat.postMessage',
            body: {
              channel: userId.userId,
              text: 'As you’ve disconnected your PREreview profile from your Community Slack account, I’ve removed your ORCID iD from your Slack profile.',
            },
            headers: { Authorization: `Bearer ${slackApiToken}` },
          },
          { body: { ok: true } },
        )

      const actual = await _.removeOrcidFromSlackProfile(userId)({
        fetch,
        clock: SystemClock,
        logger: () => IO.of(undefined),
        slackApiToken,
        slackApiUpdate: true,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(fetch.done()).toBeTruthy()
    })

    test.prop([fc.string(), fc.slackUserId(), fc.fetchResponse({ status: fc.constant(StatusCodes.OK) })])(
      "when the response can't be decoded",
      async (slackApiToken, userId, response) => {
        const fetch = fetchMock.sandbox().postOnce(
          {
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
          },
          response,
        )

        const actual = await _.removeOrcidFromSlackProfile(userId)({
          fetch,
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiToken,
          slackApiUpdate: true,
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.slackUserId(), fc.nonEmptyString()])(
      'when the response has a Slack error',
      async (slackApiToken, userId, error) => {
        const fetch = fetchMock.sandbox().postOnce(
          {
            url: 'https://slack.com/api/users.profile.set',
            body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
            headers: { Authorization: `Bearer ${userId.accessToken}` },
          },
          { body: { ok: false, error } },
        )

        const actual = await _.removeOrcidFromSlackProfile(userId)({
          fetch,
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiToken,
          slackApiUpdate: true,
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([
      fc.string(),
      fc.slackUserId(),
      fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK),
    ])('when the response has a non-200 status code', async (slackApiToken, userId, status) => {
      const fetch = fetchMock.sandbox().postOnce(
        {
          url: 'https://slack.com/api/users.profile.set',
          body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
          headers: { Authorization: `Bearer ${userId.accessToken}` },
        },
        { status },
      )

      const actual = await _.removeOrcidFromSlackProfile(userId)({
        fetch,
        clock: SystemClock,
        logger: () => IO.of(undefined),
        slackApiToken,
        slackApiUpdate: true,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    })

    test.prop([fc.string(), fc.slackUserId(), fc.error()])(
      'when fetch throws an error',
      async (slackApiToken, userId, error) => {
        const actual = await _.removeOrcidFromSlackProfile(userId)({
          fetch: () => Promise.reject(error),
          clock: SystemClock,
          logger: () => IO.of(undefined),
          slackApiToken,
          slackApiUpdate: true,
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
      },
    )
  })

  test.prop([fc.string(), fc.slackUserId()])("when Slack shouldn't be updated", async (slackApiToken, userId) => {
    const actual = await _.removeOrcidFromSlackProfile(userId)({
      fetch: shouldNotBeCalled,
      clock: SystemClock,
      logger: () => IO.of(undefined),
      slackApiToken,
      slackApiUpdate: false,
    })()

    expect(actual).toStrictEqual(E.right(undefined))
  })
})
