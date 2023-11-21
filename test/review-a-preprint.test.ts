import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { DoesPreprintExistEnv } from '../src/preprint'
import * as _ from '../src/review-a-preprint'
import { reviewAPreprintMatch, writeReviewMatch } from '../src/routes'
import { fromPreprintDoi } from '../src/types/preprint-id'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('reviewAPreprint', () => {
  test.prop([fc.requestMethod().filter(method => method !== 'POST'), fc.anything()])(
    'with a GET request',
    async (method, body) => {
      const actual = await _.reviewAPreprint({ method, body })({ doesPreprintExist: shouldNotBeCalled })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(reviewAPreprintMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('Which preprint'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('Which preprint'),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  describe('with a POST request', () => {
    test.prop(
      [
        fc
          .preprintDoi()
          .chain(preprint => fc.tuple(fc.constant(preprint), fc.constant({ preprint: preprint.toString() }))),
      ],
      {
        examples: [
          [
            ['10.1101/2021.06.18.21258689' as Doi<'1101'>, { preprint: 'https://doi.org/10.1101/2021.06.18.21258689' }], // doi.org URL,
          ],
          [
            [
              '10.1101/2021.06.18.21258689' as Doi<'1101'>,
              { preprint: ' https://doi.org/10.1101/2021.06.18.21258689 ' },
            ], // doi.org URL with whitespace,
          ],
          [
            [
              '10.1101/2021.06.18.21258689' as Doi<'1101'>,
              { preprint: 'https://www.biorxiv.org/content/10.1101/2021.06.18.21258689' },
            ], // biorxiv.org URL,
          ],
          [
            [
              '10.1101/2021.06.18.21258689' as Doi<'1101'>,
              { preprint: ' http://www.biorxiv.org/content/10.1101/2021.06.18.21258689 ' },
            ], // biorxiv.org URL with whitespace,
          ],
        ],
      },
    )('with a preprint DOI', async ([doi, body]) => {
      const id = fromPreprintDoi(doi)
      const doesPreprintExist = jest.fn<DoesPreprintExistEnv['doesPreprintExist']>(_ => TE.of(true))

      const actual = await _.reviewAPreprint({ body, method: 'POST' })({ doesPreprintExist })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id }),
      })
      expect(doesPreprintExist).toHaveBeenCalledWith(expect.objectContaining({ value: id.value }))
    })

    test.prop([fc.record({ preprint: fc.preprintDoi() })])("with a preprint DOI that doesn't exist", async body => {
      const actual = await _.reviewAPreprint({ body, method: 'POST' })({ doesPreprintExist: () => TE.of(false) })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.BadRequest,
        title: expect.stringContaining('don’t know'),
        main: expect.stringContaining('don’t know'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.record({ preprint: fc.preprintDoi() })])('when it is not a preprint', async body => {
      const actual = await _.reviewAPreprint({ body, method: 'POST' })({
        doesPreprintExist: () => TE.left('not-a-preprint'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.BadRequest,
        title: expect.stringContaining('only support'),
        main: expect.stringContaining('only support'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.record({ preprint: fc.preprintDoi() })])("when we can't see if the preprint exists", async body => {
      const actual = await _.reviewAPreprint({ body, method: 'POST' })({
        doesPreprintExist: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.record({ preprint: fc.nonPreprintDoi() })])('with a non-preprint DOI', async body => {
      const actual = await _.reviewAPreprint({ body, method: 'POST' })({ doesPreprintExist: shouldNotBeCalled })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.BadRequest,
        title: expect.stringContaining('support this DOI'),
        main: expect.stringContaining('support this DOI'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.record({ preprint: fc.string() }, { withDeletedKeys: true })])('with a non-DOI', async body => {
    const actual = await _.reviewAPreprint({ body, method: 'POST' })({ doesPreprintExist: shouldNotBeCalled })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(reviewAPreprintMatch.formatter, {}),
      status: Status.BadRequest,
      title: expect.stringContaining('Error:'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('Which preprint'),
      skipToLabel: 'form',
      js: ['error-summary.js'],
    })
  })
})
