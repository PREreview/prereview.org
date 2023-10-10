import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { Status } from 'hyper-ts'
import { URL } from 'url'
import * as _ from '../src/slack'
import * as fc from './fc'

describe('getUserFromSlack', () => {
  test.prop([fc.string(), fc.slackUserId(), fc.nonEmptyString(), fc.url()])(
    'when the user can be decoded',
    async (slackApiToken, slackUserId, name, image) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://slack.com/api/users.profile.get?',
          query: { user: slackUserId.userId },
          headers: { Authorization: `Bearer ${slackApiToken}` },
        },
        { body: { ok: true, profile: { real_name: name, image_48: image } } },
      )

      const actual = await _.getUserFromSlack(slackUserId)({
        fetch,
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(
        E.right({
          name,
          image,
          profile: new URL(`https://prereviewcommunity.slack.com/team/${slackUserId.userId}`),
        }),
      )
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.string(), fc.slackUserId(), fc.fetchResponse({ status: fc.constant(Status.OK) })])(
    "when the user can't be decoded",
    async (slackApiToken, slackUserId, response) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://slack.com/api/users.profile.get?',
          query: { user: slackUserId.userId },
          headers: { Authorization: `Bearer ${slackApiToken}` },
        },
        response,
      )

      const actual = await _.getUserFromSlack(slackUserId)({
        fetch,
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.string(), fc.slackUserId(), fc.nonEmptyString()])(
    'when the response has a Slack error',
    async (slackApiToken, slackUserId, error) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://slack.com/api/users.profile.get?',
          query: { user: slackUserId.userId },
          headers: { Authorization: `Bearer ${slackApiToken}` },
        },
        { body: { ok: false, error } },
      )

      const actual = await _.getUserFromSlack(slackUserId)({
        fetch,
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.string(), fc.slackUserId(), fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK)])(
    'when the response has a non-200 status code',
    async (slackApiToken, slackUserId, status) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://slack.com/api/users.profile.get?',
          query: { user: slackUserId.userId },
          headers: { Authorization: `Bearer ${slackApiToken}` },
        },
        { status },
      )

      const actual = await _.getUserFromSlack(slackUserId)({
        fetch,
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.string(), fc.slackUserId(), fc.error()])(
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
