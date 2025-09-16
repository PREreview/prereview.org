import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as _ from '../src/orcid.js'
import { OrcidId } from '../src/types/OrcidId.js'
import * as fc from './fc.js'

describe('getNameFromOrcid', () => {
  describe('when the request succeeds', () => {
    test.prop(
      [
        fc.origin(),
        fc.orcidId(),
        fc
          .tuple(fc.nonEmptyString(), fc.nonEmptyString(), fc.nonEmptyString())
          .map(([creditName, givenName, familyName]) => [creditName, givenName, familyName, creditName.trim()]),
      ],
      {
        examples: [
          [
            new URL('https://pub.orcid.org'),
            OrcidId('0000-0002-1825-0097'),
            ['J. S. Carberry', 'Josiah', 'Carberry', 'J. S. Carberry'],
          ],
          [
            new URL('https://pub.orcid.org'),
            OrcidId('0000-0002-1825-0097'),
            [' J. S. Carberry ', ' Josiah ', ' Carberry ', 'J. S. Carberry'],
          ],
        ],
      },
    )('with a credit name', async (url, orcid, [creditName, givenName, familyName, expected]) => {
      const actual = await _.getNameFromOrcid(orcid)({
        fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
          body: {
            name: {
              'given-names': { value: givenName },
              'family-name': { value: familyName },
              'credit-name': { value: creditName },
            },
          },
        }),
        clock: SystemClock,
        logger: () => IO.of(undefined),
        orcidApiUrl: url,
      })()

      expect(actual).toStrictEqual(E.right(expected))
    })

    test.prop(
      [
        fc.origin(),
        fc.orcidId(),
        fc
          .tuple(fc.nonEmptyString(), fc.nonEmptyString())
          .map(([givenName, familyName]) => [givenName, familyName, `${givenName.trim()} ${familyName.trim()}`]),
      ],
      {
        examples: [
          [new URL('https://pub.orcid.org'), OrcidId('0000-0002-1825-0097'), ['Josiah', 'Carberry', 'Josiah Carberry']],
          [
            new URL('https://pub.orcid.org'),
            OrcidId('0000-0002-1825-0097'),
            [' Josiah ', ' Carberry ', 'Josiah Carberry'],
          ],
        ],
      },
    )('with a family name', async (url, orcid, [givenName, familyName, expected]) => {
      const actual = await _.getNameFromOrcid(orcid)({
        fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
          body: {
            name: { 'given-names': { value: givenName }, 'family-name': { value: familyName }, 'credit-name': null },
          },
        }),
        clock: SystemClock,
        logger: () => IO.of(undefined),
        orcidApiUrl: url,
      })()

      expect(actual).toStrictEqual(E.right(expected))
    })

    test.prop([fc.origin(), fc.orcidId(), fc.nonEmptyString().map(givenName => [givenName, givenName.trim()])], {
      examples: [
        [new URL('https://pub.orcid.org'), OrcidId('0000-0002-1825-0097'), ['Josiah', 'Josiah']],
        [new URL('https://pub.orcid.org'), OrcidId('0000-0002-1825-0097'), [' Josiah ', 'Josiah']],
      ],
    })('without a family name', async (url, orcid, [givenName, expected]) => {
      const actual = await _.getNameFromOrcid(orcid)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
          body: { name: { 'given-names': { value: givenName }, 'family-name': null, 'credit-name': null } },
        }),
        logger: () => IO.of(undefined),
        orcidApiUrl: url,
      })()

      expect(actual).toStrictEqual(E.right(expected))
    })

    test.prop([fc.origin(), fc.orcidId()])('without a name', async (url, orcid) => {
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

  test.prop([fc.origin(), fc.orcidId(), fc.constantFrom(9018, 9044)])(
    'when the profile is locked or deactivated',
    async (url, orcid, errorCode) => {
      const actual = await _.getNameFromOrcid(orcid)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().get(`${url.origin}/v3.0/${orcid}/personal-details`, {
          body: { 'error-code': errorCode },
          status: StatusCodes.Conflict,
        }),
        logger: () => IO.of(undefined),
        orcidApiUrl: url,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
    },
  )

  test.prop([fc.origin(), fc.orcidId(), fc.string()])('uses an API token', async (url, orcid, token) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(
        { url: `${url.origin}/v3.0/${orcid}/personal-details`, headers: { Authorization: `Bearer ${token}` } },
        { status: StatusCodes.NotFound },
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

  test.prop([
    fc.origin(),
    fc.orcidId(),
    fc.oneof(
      fc.record({
        status: fc
          .integer({ min: 100, max: 599 })
          .filter(status => status !== StatusCodes.OK && status !== StatusCodes.Conflict),
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

  test.prop([fc.origin(), fc.orcidId()])('when the network fails', async (url, orcid) => {
    const actual = await _.getNameFromOrcid(orcid)({
      clock: SystemClock,
      fetch: () => Promise.reject('network error'),
      logger: () => IO.of(undefined),
      orcidApiUrl: url,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
