import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as H from 'hyper-ts'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import { ExpressConnection } from 'hyper-ts/lib/express'
import type { Mock } from 'jest-mock'
import { createRequest, createResponse } from 'node-mocks-http'
import * as _ from '../src/find-a-preprint'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('parseLookupPreprint', () => {
  test.prop([
    fc
      .tuple(
        fc.preprintDoi(),
        fc.stringOf(fc.constant(' ')),
        fc.constantFrom('doi:', 'https://doi.org/', 'http://doi.org/', 'https://dx.doi.org/', 'http://dx.doi.org/'),
        fc.stringOf(fc.constant(' ')),
      )
      .map(([doi, whitespaceBefore, prefix, whitespaceAfter]) => [
        { preprint: `${whitespaceBefore}${prefix}${doi}${whitespaceAfter}` },
        doi,
      ]),
  ])('with a doi for a supported preprint server', ([input, expected]) => {
    const actual = _.parseLookupPreprint(input)
    expect(actual).toStrictEqual(E.right(expected))
  })

  test.prop([
    fc
      .tuple(fc.supportedPreprintUrl(), fc.stringOf(fc.constant(' ')), fc.stringOf(fc.constant(' ')))
      .map(([[url, doi], whitespaceBefore, whitespaceAfter]) => [
        { preprint: `${whitespaceBefore}${url}${whitespaceAfter}` },
        doi,
      ]),
  ])('with a recognised preprint url', ([input, expected]) => {
    const actual = _.parseLookupPreprint(input)

    expect(actual).toStrictEqual(E.right(expected))
  })

  test.prop([
    fc
      .tuple(
        fc.doi(),
        fc.stringOf(fc.constant(' ')),
        fc.constantFrom('doi:', 'https://doi.org/', 'http://doi.org/', 'https://dx.doi.org/', 'http://dx.doi.org/'),
        fc.stringOf(fc.constant(' ')),
      )
      .map(([doi, whitespaceBefore, prefix, whitespaceAfter]) => [
        { preprint: `${whitespaceBefore}${prefix}${doi}${whitespaceAfter}` },
        doi,
      ]),
  ])('with a doi not for a supported preprint server', ([input, doi]) => {
    const actual = _.parseLookupPreprint(input)
    expect(actual).toStrictEqual(
      E.left({
        _tag: 'UnsupportedDoiE',
        actual: doi,
      }),
    )
  })

  test.prop([
    fc
      .tuple(
        fc.oneof(fc.url(), fc.unsupportedPreprintUrl()),
        fc.stringOf(fc.constant(' ')),
        fc.stringOf(fc.constant(' ')),
      )
      .map(([url, whitespaceBefore, whitespaceAfter]) => [
        { preprint: `${whitespaceBefore}${url}${whitespaceAfter}` },
        url,
      ]),
  ])('with a url not for a supported preprint server', ([input, url]) => {
    const actual = _.parseLookupPreprint(input)
    expect(actual).toStrictEqual(
      E.left({
        _tag: 'UnsupportedUrlE',
        actual: url,
      }),
    )
  })

  test.prop([fc.string()])('with anything else', input => {
    const actual = _.parseLookupPreprint(input)

    expect(actual).toStrictEqual(
      E.left({
        _tag: 'InvalidE',
        actual: input,
      }),
    )
  })
})

describe('find-a-preprint', () => {
  test.prop([
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.option(fc.user(), { nil: undefined }),
  ])('findAPreprint', async (connection, user) => {
    const actual = await runMiddleware(
      _.findAPreprint({
        doesPreprintExist: () => () => Promise.reject('should not be called'),
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  describe('looking up a preprint', () => {
    test.prop(
      [
        fc
          .preprintDoi()
          .chain(preprint =>
            fc.tuple(
              fc.constant(preprint),
              fc.connection({ body: fc.constant({ preprint }), method: fc.constant('POST') }),
            ),
          ),
      ],
      {
        examples: [
          [
            [
              '10.1101/2021.06.18.21258689' as Doi<'1101'>,
              new ExpressConnection<H.StatusOpen>(
                createRequest({ body: { preprint: 'https://doi.org/10.1101/2021.06.18.21258689' }, method: 'POST' }),
                createResponse(),
              ),
            ], // doi.org URL,
          ],
          [
            [
              '10.1101/2021.06.18.21258689' as Doi<'1101'>,
              new ExpressConnection<H.StatusOpen>(
                createRequest({ body: { preprint: ' https://doi.org/10.1101/2021.06.18.21258689 ' }, method: 'POST' }),
                createResponse(),
              ),
            ], // doi.org URL with whitespace,
          ],
          [
            [
              '10.1101/2021.06.18.21258689' as Doi<'1101'>,
              new ExpressConnection<H.StatusOpen>(
                createRequest({
                  body: { preprint: 'https://www.biorxiv.org/content/10.1101/2021.06.18.21258689' },
                  method: 'POST',
                }),
                createResponse(),
              ),
            ], // biorxiv.org URL,
          ],
          [
            [
              '10.1101/2021.06.18.21258689' as Doi<'1101'>,
              new ExpressConnection<H.StatusOpen>(
                createRequest({
                  body: { preprint: ' http://www.biorxiv.org/content/10.1101/2021.06.18.21258689 ' },
                  method: 'POST',
                }),
                createResponse(),
              ),
            ], // biorxiv.org URL with whitespace,
          ],
        ],
      },
    )('with a preprint DOI', async ([doi, connection]) => {
      const doesPreprintExist: Mock<_.DoesPreprintExistEnv['doesPreprintExist']> = jest.fn(_ => TE.of(true))

      const actual = await runMiddleware(
        _.findAPreprint({
          doesPreprintExist,
          getUser: () => () => () => Promise.reject('should not be called'),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'))}`,
          },
          { type: 'endResponse' },
        ]),
      )
      expect(doesPreprintExist).toHaveBeenCalledWith(doi)
    })

    test.prop([
      fc.connection({ body: fc.record({ preprint: fc.preprintDoi() }), method: fc.constant('POST') }),
      fc.option(fc.user(), { nil: undefined }),
    ])("with a preprint DOI that doesn't exist", async (connection, user) => {
      const actual = await runMiddleware(
        _.findAPreprint({
          doesPreprintExist: () => TE.of(false),
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })

    test.prop([
      fc.connection({
        body: fc.record({ preprint: fc.preprintDoi() }),
        method: fc.constant('POST'),
      }),
      fc.option(fc.user(), { nil: undefined }),
    ])("when we can't see if the preprint exists", async (connection, user) => {
      const actual = await runMiddleware(
        _.findAPreprint({ doesPreprintExist: () => TE.left('unavailable'), getUser: () => M.of(user) }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })

    test.prop([
      fc.connection({
        body: fc.record({ doi: fc.oneof(fc.string(), fc.doi()) }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
      fc.option(fc.user(), { nil: undefined }),
    ])('with a non-preprint DOI', async (connection, user) => {
      const actual = await runMiddleware(
        _.findAPreprint({
          doesPreprintExist: () => () => Promise.reject('should not be called'),
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })
  })
})
