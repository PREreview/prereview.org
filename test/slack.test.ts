import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { Status } from 'hyper-ts'
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
