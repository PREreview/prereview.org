import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import type { DoesPreprintExistEnv } from '../../src/preprint.js'
import * as _ from '../../src/review-a-preprint-page/index.js'
import { reviewAPreprintMatch, writeReviewMatch } from '../../src/routes.js'
import { fromPreprintDoi } from '../../src/types/preprint-id.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('reviewAPreprint', () => {
  test.prop([fc.requestMethod().filter(method => method !== 'POST'), fc.anything()])(
    'with a GET request',
    async (method, body) => {
      const actual = await _.reviewAPreprint({ method, body })({ doesPreprintExist: shouldNotBeCalled })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(reviewAPreprintMatch.formatter, {}),
        status: Status.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
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
            [Doi('10.1101/2021.06.18.21258689'), { preprint: 'https://doi.org/10.1101/2021.06.18.21258689' }], // doi.org URL,
          ],
          [
            [Doi('10.1101/2021.06.18.21258689'), { preprint: ' https://doi.org/10.1101/2021.06.18.21258689 ' }], // doi.org URL with whitespace,
          ],
          [
            [
              Doi('10.1101/2021.06.18.21258689'),
              { preprint: 'https://www.biorxiv.org/content/10.1101/2021.06.18.21258689' },
            ], // biorxiv.org URL,
          ],
          [
            [
              Doi('10.1101/2021.06.18.21258689'),
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
        title: expect.anything(),
        main: expect.anything(),
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
        title: expect.anything(),
        main: expect.anything(),
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
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.record({ preprint: fc.nonPreprintDoi() })])('with a non-preprint DOI', async body => {
      const actual = await _.reviewAPreprint({ body, method: 'POST' })({ doesPreprintExist: shouldNotBeCalled })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
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
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['error-summary.js'],
    })
  })
})
