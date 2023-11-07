import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import type * as H from 'hyper-ts'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import { ExpressConnection } from 'hyper-ts/express'
import { createRequest, createResponse } from 'node-mocks-http'
import type { DoesPreprintExistEnv } from '../src/preprint'
import * as _ from '../src/review-a-preprint'
import { writeReviewMatch } from '../src/routes'
import { fromPreprintDoi } from '../src/types/preprint-id'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('reviewAPreprint', () => {
  test.prop([
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('with a GET request', async (connection, user) => {
    const actual = await runMiddleware(
      _.reviewAPreprint({
        doesPreprintExist: shouldNotBeCalled,
        getUser: () => M.fromEither(user),
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

  describe('with a POST request', () => {
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
      const id = fromPreprintDoi(doi)
      const doesPreprintExist = jest.fn<DoesPreprintExistEnv['doesPreprintExist']>(_ => TE.of(true))

      const actual = await runMiddleware(
        _.reviewAPreprint({
          doesPreprintExist,
          getUser: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewMatch.formatter, { id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(doesPreprintExist).toHaveBeenCalledWith(expect.objectContaining({ value: id.value }))
    })

    test.prop([
      fc.connection({ body: fc.record({ preprint: fc.preprintDoi() }), method: fc.constant('POST') }),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])("with a preprint DOI that doesn't exist", async (connection, user) => {
      const actual = await runMiddleware(
        _.reviewAPreprint({
          doesPreprintExist: () => TE.of(false),
          getUser: () => M.fromEither(user),
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
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('when it is not a preprint', async (connection, user) => {
      const actual = await runMiddleware(
        _.reviewAPreprint({ doesPreprintExist: () => TE.left('not-a-preprint'), getUser: () => M.fromEither(user) }),
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

    test.prop([
      fc.connection({
        body: fc.record({ preprint: fc.preprintDoi() }),
        method: fc.constant('POST'),
      }),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])("when we can't see if the preprint exists", async (connection, user) => {
      const actual = await runMiddleware(
        _.reviewAPreprint({ doesPreprintExist: () => TE.left('unavailable'), getUser: () => M.fromEither(user) }),
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
        body: fc.record({ doi: fc.oneof(fc.string(), fc.nonPreprintDoi()) }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
      fc.either(fc.constant('no-session' as const), fc.user()),
    ])('with a non-preprint DOI', async (connection, user) => {
      const actual = await runMiddleware(
        _.reviewAPreprint({
          doesPreprintExist: shouldNotBeCalled,
          getUser: () => M.fromEither(user),
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
