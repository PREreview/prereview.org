import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import * as _ from '../src/mailjet'
import * as fc from './fc'

describe('sendEmail', () => {
  test.prop([
    fc.record({
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      sandbox: fc.boolean(),
    }),
    fc.email(),
  ])('when the email can be sent', async (mailjetApi, email) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: 'https://api.mailjet.com/v3.1/send',
        headers: {
          Authorization: `Basic ${btoa(`${mailjetApi.key}:${mailjetApi.secret}`)}`,
          'Content-Type': 'application/json',
        },
        body: {
          Messages: [
            {
              From: { Email: email.from.address, name: email.from.name },
              To: [{ Email: email.to.address, name: email.to.name }],
              Subject: email.subject,
              TextPart: email.text,
              HtmlPart: email.html.toString(),
            },
          ],
          SandboxMode: mailjetApi.sandbox,
        },
      },
      { body: { Messages: [{ Status: 'success' }] } },
    )

    const actual = await _.sendEmail(email)({
      fetch,
      mailjetApi,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      sandbox: fc.boolean(),
    }),
    fc.email(),
    fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
  ])("when the email can't be sent", async (mailjetApi, email, response) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: 'https://api.mailjet.com/v3.1/send',
        headers: { 'Content-Type': 'application/json' },
      },
      response,
    )

    const actual = await _.sendEmail(email)({
      fetch,
      mailjetApi,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      sandbox: fc.boolean(),
    }),
    fc.email(),
    fc.unverifiedContactEmailAddress(),
    fc.string(),
  ])("when the response can't be decoded", async (mailjetApi, email, response) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: 'https://api.mailjet.com/v3.1/send',
        headers: { 'Content-Type': 'application/json' },
      },
      { body: response },
    )

    const actual = await _.sendEmail(email)({
      fetch,
      mailjetApi,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      sandbox: fc.boolean(),
    }),
    fc.email(),
    fc.error(),
  ])('when fetch throws an error', async (mailjetApi, email, error) => {
    const actual = await _.sendEmail(email)({
      fetch: () => Promise.reject(error),
      mailjetApi,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
