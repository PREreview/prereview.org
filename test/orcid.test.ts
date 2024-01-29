import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as IO from 'fp-ts/IO'
import { Status } from 'hyper-ts'
import type { Orcid } from 'orcid-id-ts'
import * as _ from '../src/orcid'
import * as fc from './fc'

describe('getNameFromOrcid', () => {
  describe('when the request succeeds', () => {
    test.prop(
      [
        fc.origin(),
        fc.orcid(),
        fc
          .tuple(fc.nonEmptyString(), fc.nonEmptyString())
          .map(([givenName, familyName]) => [givenName, familyName, `${givenName.trim()} ${familyName.trim()}`]),
      ],
      {
        examples: [
          [new URL('https://pub.orcid.org'), '0000-0002-1825-0097' as Orcid, ['Josiah', 'Carberry', 'Josiah Carberry']],
          [
            new URL('https://pub.orcid.org'),
            '0000-0002-1825-0097' as Orcid,
            [' Josiah ', ' Carberry ', 'Josiah Carberry'],
          ],
        ],
      },
    )('with a family name', async (url, orcid, [givenName, familyName, expected]) => {
      const actual = await _.getNameFromOrcid(orcid)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
          body: { name: { 'given-names': { value: givenName }, 'family-name': { value: familyName } } },
        }),
        logger: () => IO.of(undefined),
        orcidApiUrl: url,
      })()

      expect(actual).toStrictEqual(E.right(expected))
    })

    test.prop([fc.origin(), fc.orcid(), fc.nonEmptyString().map(givenName => [givenName, givenName.trim()])], {
      examples: [
        [new URL('https://pub.orcid.org'), '0000-0002-1825-0097' as Orcid, ['Josiah', 'Josiah']],
        [new URL('https://pub.orcid.org'), '0000-0002-1825-0097' as Orcid, [' Josiah ', 'Josiah']],
      ],
    })('without a family name', async (url, orcid, [givenName, expected]) => {
      const actual = await _.getNameFromOrcid(orcid)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
          body: { name: { 'given-names': { value: givenName }, 'family-name': null } },
        }),
        logger: () => IO.of(undefined),
        orcidApiUrl: url,
      })()

      expect(actual).toStrictEqual(E.right(expected))
    })

    test.prop([fc.origin(), fc.orcid()])('without a name', async (url, orcid) => {
      const actual = await _.getNameFromOrcid(orcid)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
          body: { name: null },
        }),
        logger: () => IO.of(undefined),
        orcidApiUrl: url,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
    })
  })

  test.prop([fc.origin(), fc.orcid()])('when the profile is locked', async (url, orcid) => {
    const actual = await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
        body: { 'error-code': 9018 },
        status: Status.Conflict,
      }),
      logger: () => IO.of(undefined),
      orcidApiUrl: url,
    })()

    expect(actual).toStrictEqual(E.right(undefined))
  })

  test.prop([fc.origin(), fc.orcid(), fc.string()])('uses an API token', async (url, orcid, token) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(
        { url: `${url.origin}/v3.0/${orcid}/personal-details`, headers: { Authorization: `Bearer ${token}` } },
        { status: Status.NotFound },
      )

    await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
      orcidApiUrl: url,
      orcidApiToken: token,
    })()

    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.origin(), fc.orcid()])('revalidates if the response is stale', async (url, orcid) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(
        (thisUrl, { cache }) => thisUrl === `${url.origin}/v3.0/${orcid}/personal-details` && cache === 'force-cache',
        {
          body: { name: { 'given-names': { value: 'Daniela' }, 'family-name': { value: 'Saderi' } } },
          headers: { 'X-Local-Cache-Status': 'stale' },
        },
      )
      .getOnce(
        (thisUrl, { cache }) => thisUrl === `${url.origin}/v3.0/${orcid}/personal-details` && cache === 'no-cache',
        { throws: new Error('Network error') },
      )

    const actual = await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
      orcidApiUrl: url,
    })()

    expect(actual).toStrictEqual(E.right('Daniela Saderi'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.origin(),
    fc.orcid(),
    fc.oneof(
      fc.record({
        status: fc.integer({ min: 100, max: 599 }).filter(status => status !== Status.OK && status !== Status.Conflict),
      }),
      fc.record({
        body: fc.record({ 'error-code': fc.integer().filter(code => code !== 9018) }),
        status: fc.integer({ min: 400, max: 599 }),
      }),
    ),
  ])('when the request fails', async (url, orcid, response) => {
    const fetch = fetchMock.sandbox().get('*', response)

    const actual = await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
      orcidApiUrl: url,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.origin(), fc.orcid()])('when the network fails', async (url, orcid) => {
    const actual = await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch: () => Promise.reject('network error'),
      logger: () => IO.of(undefined),
      orcidApiUrl: url,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
