import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { Status } from 'hyper-ts'
import * as _ from '../src/slack'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('getUserFromSlack', () => {
  describe('when the ID is U05BUCDTN2X', () => {
    test.prop([fc.string(), fc.nonEmptyString(), fc.url()])(
      'when the user can be decoded',
      async (slackApiToken, name, image) => {
        const fetch = fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://slack.com/api/users.profile.get?',
            query: { user: 'U05BUCDTN2X' },
            headers: { Authorization: `Bearer ${slackApiToken}` },
          },
          { body: { ok: true, profile: { real_name: name, image_48: image } } },
        )

        const actual = await _.getUserFromSlack('U05BUCDTN2X')({
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

    test.prop([fc.string(), fc.fetchResponse({ status: fc.constant(Status.OK) })])(
      "when the user can't be decoded",
      async (slackApiToken, response) => {
        const fetch = fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://slack.com/api/users.profile.get?',
            query: { user: 'U05BUCDTN2X' },
            headers: { Authorization: `Bearer ${slackApiToken}` },
          },
          response,
        )

        const actual = await _.getUserFromSlack('U05BUCDTN2X')({
          fetch,
          slackApiToken,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK)])(
      'when the response has a non-200 status code',
      async (slackApiToken, status) => {
        const fetch = fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://slack.com/api/users.profile.get?',
            query: { user: 'U05BUCDTN2X' },
            headers: { Authorization: `Bearer ${slackApiToken}` },
          },
          { status },
        )

        const actual = await _.getUserFromSlack('U05BUCDTN2X')({
          fetch,
          slackApiToken,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        })()

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.error()])('when fetch throws an error', async (slackApiToken, error) => {
      const actual = await _.getUserFromSlack('U05BUCDTN2X')({
        fetch: () => Promise.reject(error),
        slackApiToken,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    })
  })

  test.prop([fc.string(), fc.string()])('when the ID is something else', async (slackApiToken, id) => {
    const actual = await _.getUserFromSlack(id)({
      fetch: shouldNotBeCalled,
      slackApiToken,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })
})
