import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Array, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import {
  BiorxivOrMedrxivPreprintId,
  BiorxivPreprintId,
  fromPreprintDoi,
  type IndeterminatePreprintId,
  MedrxivPreprintId,
  NotAPreprint,
  OsfOrLifecycleJournalPreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
  PreprintIsNotFound,
  PreprintIsUnavailable,
} from '../../src/Preprints/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import type { ResolvePreprintIdEnv } from '../../src/preprint.ts'
import * as _ from '../../src/review-a-preprint-page/index.ts'
import { reviewAPreprintMatch, writeReviewMatch } from '../../src/routes.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('reviewAPreprint', () => {
  test.prop([fc.supportedLocale(), fc.requestMethod().filter(method => method !== 'POST'), fc.anything()])(
    'with a GET request',
    async (locale, method, body) => {
      const actual = await _.reviewAPreprint({ locale, method, body })({ resolvePreprintId: shouldNotBeCalled })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(reviewAPreprintMatch.formatter, {}),
        status: StatusCodes.OK,
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
          fc
            .preprintDoi()
            .map(doi =>
              Tuple.make<[string, Array.NonEmptyReadonlyArray<IndeterminatePreprintId>]>(
                doi.toString(),
                Array.of(fromPreprintDoi(doi)),
              ),
            ),
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
        status: StatusCodes.SeeOther,
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
          status: StatusCodes.BadRequest,
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
          status: StatusCodes.BadRequest,
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
          status: StatusCodes.ServiceUnavailable,
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
          status: StatusCodes.BadRequest,
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
          status: StatusCodes.BadRequest,
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
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    },
  )
})
