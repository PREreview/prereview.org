import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Array, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import { DefaultLocale } from '../../src/locales/index.js'
import {
  NotAPreprint,
  PreprintIsNotFound,
  PreprintIsUnavailable,
  type ResolvePreprintIdEnv,
} from '../../src/preprint.js'
import * as _ from '../../src/review-a-preprint-page/index.js'
import { reviewAPreprintMatch, writeReviewMatch } from '../../src/routes.js'
import {
  BiorxivOrMedrxivPreprintId,
  BiorxivPreprintId,
  fromPreprintDoi,
  MedrxivPreprintId,
  OsfOrLifecycleJournalPreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
} from '../../src/types/preprint-id.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('reviewAPreprint', () => {
  test.prop([fc.supportedLocale(), fc.requestMethod().filter(method => method !== 'POST'), fc.anything()])(
    'with a GET request',
    async (locale, method, body) => {
      const actual = await _.reviewAPreprint({ locale, method, body })({ resolvePreprintId: shouldNotBeCalled })()

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
        fc.oneof(
          fc.preprintDoi().map(doi => Tuple.make(doi.toString(), Array.of(fromPreprintDoi(doi)))),
          fc.supportedPreprintUrl().map(([url, id]) => Tuple.make(url.href, id)),
        ),
        fc.preprintId(),
      ],
      {
        examples: [
          [
            DefaultLocale,
            [
              'https://doi.org/10.1101/2021.06.18.21258689', // doi.org URL
              [new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new MedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            DefaultLocale,
            [
              ' https://doi.org/10.1101/2021.06.18.21258689 ', // doi.org URL with whitespace
              [new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new MedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            DefaultLocale,
            [
              'https://www.biorxiv.org/content/10.1101/2021.06.18.21258689', // biorxiv.org URL
              [new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            DefaultLocale,
            [
              ' http://www.biorxiv.org/content/10.1101/2021.06.18.21258689 ', // biorxiv.org URL with whitespace
              [new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            DefaultLocale,
            [
              'https://osf.io/eq8bk/', // ambigious URL
              [
                new OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
                new OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/eq8bk') }),
              ],
            ],
            new OsfPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
          ],
        ],
      },
    )('with a preprint DOI', async (locale, [value, expected], resolved) => {
      const resolvePreprintId = jest.fn<ResolvePreprintIdEnv['resolvePreprintId']>(_ => TE.of(resolved))

      const actual = await _.reviewAPreprint({ body: { preprint: value }, locale, method: 'POST' })({
        resolvePreprintId,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(writeReviewMatch.formatter, { id: resolved }),
      })
      expect(resolvePreprintId).toHaveBeenCalledWith(...expected)
    })

    test.prop([fc.supportedLocale(), fc.record({ preprint: fc.preprintDoi() })])(
      "with a preprint DOI that doesn't exist",
      async (locale, body) => {
        const actual = await _.reviewAPreprint({ body, locale, method: 'POST' })({
          resolvePreprintId: () => TE.left(new PreprintIsNotFound({})),
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
          resolvePreprintId: () => TE.left(new NotAPreprint({})),
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
          resolvePreprintId: () => TE.left(new PreprintIsUnavailable({})),
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
          resolvePreprintId: shouldNotBeCalled,
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
          resolvePreprintId: shouldNotBeCalled,
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
        resolvePreprintId: shouldNotBeCalled,
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
