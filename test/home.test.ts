import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as T from 'fp-ts/Task'
import * as H from 'hyper-ts'
import { MediaType, Status } from 'hyper-ts'
import { ExpressConnection } from 'hyper-ts/lib/express'
import { createRequest, createResponse } from 'node-mocks-http'
import * as _ from '../src/home'
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

  test.todo('with a recognised preprint url')

  test.prop([
    fc
      .tuple(
        fc.doi(),
        fc.stringOf(fc.constant(' ')),
        fc.constantFrom('doi:', 'https://doi.org/', 'http://doi.org/', 'https://dx.doi.org/', 'http://dx.doi.org/'),
        fc.stringOf(fc.constant(' ')),
      )
      .map(([doi, whitespaceBefore, prefix, whitespaceAfter]) => ({
        preprint: `${whitespaceBefore}${prefix}${doi}${whitespaceAfter}`,
      })),
  ])('with a doi not for a supported preprint server', input => {
    const actual = _.parseLookupPreprint(input)
    expect(actual).toStrictEqual(
      E.left({
        _tag: 'InvalidE',
        actual: input.preprint,
      }),
    )
  })

  test.todo('with anything else')
})

describe('home', () => {
  test.prop([fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') })])(
    'home',
    async connection => {
      const actual = await runMiddleware(_.home({ getRecentPrereviews: () => T.of([]) }), connection)()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

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
      const actual = await runMiddleware(_.home({ getRecentPrereviews: () => T.of([]) }), connection)()

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
    })

    test.prop([
      fc.connection({
        body: fc.record({ doi: fc.oneof(fc.string(), fc.doi()) }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
    ])('with a non-preprint DOI', async connection => {
      const actual = await runMiddleware(_.home({ getRecentPrereviews: () => T.of([]) }), connection)()

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
