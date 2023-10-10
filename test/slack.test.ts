import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { Status } from 'hyper-ts'
import { toUrl } from 'orcid-id-ts'
import { URL } from 'url'
import * as _ from '../src/slack'
import * as fc from './fc'

describe('getUserFromSlack', () => {
  test.prop([fc.string(), fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.nonEmptyString(), fc.url()])(
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
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.fetchResponse({ status: fc.constant(Status.OK) }),
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

  test.prop([fc.string(), fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.nonEmptyString()])(
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
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK),
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

  test.prop([fc.string(), fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.error()])(
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
  test.prop([fc.slackUserId(), fc.orcid()])('when the request is successful', async (userId, orcid) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: 'https://slack.com/api/users.profile.set',
        body: { profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } },
        headers: { Authorization: `Bearer ${userId.accessToken}` },
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
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.slackUserId(), fc.orcid(), fc.fetchResponse({ status: fc.constant(Status.OK) })])(
    "when the response can't be decoded",
    async (userId, orcid, response) => {
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
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.slackUserId(), fc.orcid(), fc.nonEmptyString()])(
    'when the response has a Slack error',
    async (userId, orcid, error) => {
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
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.slackUserId(), fc.orcid(), fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK)])(
    'when the response has a non-200 status code',
    async (userId, orcid, status) => {
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
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.slackUserId(), fc.orcid(), fc.error()])('when fetch throws an error', async (userId, orcid, error) => {
    const actual = await _.addOrcidToSlackProfile(
      userId,
      orcid,
    )({
      fetch: () => Promise.reject(error),
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('removeOrcidFromSlackProfile', () => {
  test.prop([fc.slackUserId()])('when the request is successful', async userId => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: 'https://slack.com/api/users.profile.set',
        body: { profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } },
        headers: { Authorization: `Bearer ${userId.accessToken}` },
      },
      { body: { ok: true } },
    )

    const actual = await _.removeOrcidFromSlackProfile(userId)({
      fetch,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.slackUserId(), fc.fetchResponse({ status: fc.constant(Status.OK) })])(
    "when the response can't be decoded",
    async (userId, response) => {
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
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.slackUserId(), fc.nonEmptyString()])('when the response has a Slack error', async (userId, error) => {
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
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.slackUserId(), fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK)])(
    'when the response has a non-200 status code',
    async (userId, status) => {
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
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.slackUserId(), fc.error()])('when fetch throws an error', async (userId, error) => {
    const actual = await _.removeOrcidFromSlackProfile(userId)({
      fetch: () => Promise.reject(error),
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
