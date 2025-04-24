import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { DefaultLocale } from '../../src/locales/index.js'
import { NotAPreprint, PreprintIsUnavailable, type DoesPreprintExistEnv } from '../../src/preprint.js'
import * as _ from '../../src/review-a-preprint-page/index.js'
import { reviewAPreprintMatch, writeReviewMatch } from '../../src/routes.js'
import { fromPreprintDoi } from '../../src/types/preprint-id.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('reviewAPreprint', () => {
  test.prop([fc.supportedLocale(), fc.requestMethod().filter(method => method !== 'POST'), fc.anything()])(
    'with a GET request',
    async (locale, method, body) => {
      const actual = await _.reviewAPreprint({ locale, method, body })({ doesPreprintExist: shouldNotBeCalled })()

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
        fc.supportedLocale(),
        fc
          .preprintDoi()
          .chain(preprint => fc.tuple(fc.constant(preprint), fc.constant({ preprint: preprint.toString() }))),
      ],
      {
        examples: [
          [
            DefaultLocale,
            [Doi('10.1101/2021.06.18.21258689'), { preprint: 'https://doi.org/10.1101/2021.06.18.21258689' }], // doi.org URL,
          ],
          [
            DefaultLocale,
            [Doi('10.1101/2021.06.18.21258689'), { preprint: ' https://doi.org/10.1101/2021.06.18.21258689 ' }], // doi.org URL with whitespace,
          ],
          [
            DefaultLocale,
            [
              Doi('10.1101/2021.06.18.21258689'),
              { preprint: 'https://www.biorxiv.org/content/10.1101/2021.06.18.21258689' },
            ], // biorxiv.org URL,
          ],
          [
            DefaultLocale,
            [
              Doi('10.1101/2021.06.18.21258689'),
              { preprint: ' http://www.biorxiv.org/content/10.1101/2021.06.18.21258689 ' },
            ], // biorxiv.org URL with whitespace,
          ],
        ],
      },
    )('with a preprint DOI', async (locale, [doi, body]) => {
      const id = fromPreprintDoi(doi)
      const doesPreprintExist = jest.fn<DoesPreprintExistEnv['doesPreprintExist']>(_ => TE.of(true))

      const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({ doesPreprintExist })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id }),
      })
      expect(doesPreprintExist).toHaveBeenCalledWith(expect.objectContaining({ value: id.value }))
    })

    test.prop([fc.supportedLocale(), fc.record({ preprint: fc.preprintDoi() })])(
      "with a preprint DOI that doesn't exist",
      async (locale, body) => {
        const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({
          doesPreprintExist: () => TE.of(false),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.BadRequest,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.supportedLocale(), fc.record({ preprint: fc.preprintDoi() })])(
      'when it is not a preprint',
      async (locale, body) => {
        const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({
          doesPreprintExist: () => TE.left(new NotAPreprint({})),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.BadRequest,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.supportedLocale(), fc.record({ preprint: fc.preprintDoi() })])(
      "when we can't see if the preprint exists",
      async (locale, body) => {
        const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({
          doesPreprintExist: () => TE.left(new PreprintIsUnavailable({})),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.supportedLocale(), fc.record({ preprint: fc.nonPreprintDoi() })])(
      'with a non-preprint DOI',
      async (locale, body) => {
        const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({
          doesPreprintExist: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.BadRequest,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )

    test.prop([fc.supportedLocale(), fc.record({ preprint: fc.nonPreprintUrl().map(url => url.href) })])(
      'with a non-preprint URL',
      async (locale, body) => {
        const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({
          doesPreprintExist: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.BadRequest,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.supportedLocale(), fc.record({ preprint: fc.string() }, { requiredKeys: [] })])(
    'with a non-DOI',
    async (locale, body) => {
      const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({
        doesPreprintExist: shouldNotBeCalled,
      })()

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
    },
  )
})
