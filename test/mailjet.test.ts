import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as _ from '../src/mailjet'
import * as fc from './fc'

describe('sendContactEmailAddressVerificationEmail', () => {
  test.prop([
    fc.record({
      key: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      secret: fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
      sandbox: fc.boolean(),
    }),
    fc.origin(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
  ])('when the email can be sent', async (mailjetApi, publicUrl, user, emailAddress) => {
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
              From: { Email: 'help@prereview.org', name: 'PREreview' },
              To: [{ Email: emailAddress.value, name: user.name }],
              Subject: 'Verify your email address on PREreview',
            },
          ],
          SandboxMode: mailjetApi.sandbox,
        },
        matchPartialBody: true,
      },
      { body: { Messages: [{ Status: 'success' }] } },
    )

    const actual = await _.sendContactEmailAddressVerificationEmail(
      user,
      emailAddress,
    )({
      fetch,
      mailjetApi,
      publicUrl,
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
    fc.origin(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
    fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
  ])("when the email can't be sent", async (mailjetApi, publicUrl, user, emailAddress, response) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: 'https://api.mailjet.com/v3.1/send',
        headers: { 'Content-Type': 'application/json' },
        body: {
          Messages: [
            {
              From: { Email: 'help@prereview.org', name: 'PREreview' },
              To: [{ Email: emailAddress.value, name: user.name }],
              Subject: 'Verify your email address on PREreview',
            },
          ],
          SandboxMode: mailjetApi.sandbox,
        },
        matchPartialBody: true,
      },
      response,
    )

    const actual = await _.sendContactEmailAddressVerificationEmail(
      user,
      emailAddress,
    )({
      fetch,
      mailjetApi,
      publicUrl,
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
    fc.origin(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
    fc.string(),
  ])("when the response can't be decoded", async (mailjetApi, publicUrl, user, emailAddress, response) => {
    const fetch = fetchMock.sandbox().postOnce(
      {
        url: 'https://api.mailjet.com/v3.1/send',
        headers: { 'Content-Type': 'application/json' },
        body: {
          Messages: [
            {
              From: { Email: 'help@prereview.org', name: 'PREreview' },
              To: [{ Email: emailAddress.value, name: user.name }],
              Subject: 'Verify your email address on PREreview',
            },
          ],
          SandboxMode: mailjetApi.sandbox,
        },
        matchPartialBody: true,
      },
      { body: response },
    )

    const actual = await _.sendContactEmailAddressVerificationEmail(
      user,
      emailAddress,
    )({
      fetch,
      mailjetApi,
      publicUrl,
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
    fc.origin(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
    fc.error(),
  ])('when fetch throws an error', async (mailjetApi, publicUrl, user, emailAddress, error) => {
    const actual = await _.sendContactEmailAddressVerificationEmail(
      user,
      emailAddress,
    )({
      fetch: () => Promise.reject(error),
      mailjetApi,
      publicUrl,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
