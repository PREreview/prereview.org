import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Doi } from 'doi-ts'
import { Array, Tuple } from 'effect'
import * as TE from 'fp-ts/lib/TaskEither.js'
import {
  NotAPreprint,
  PreprintIsNotFound,
  PreprintIsUnavailable,
  type ResolvePreprintIdEnv,
} from '../../src/preprint.js'
import {
  BiorxivOrMedrxivPreprintId,
  BiorxivPreprintId,
  fromPreprintDoi,
  type IndeterminatePreprintId,
  MedrxivPreprintId,
  OsfOrLifecycleJournalPreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
} from '../../src/Preprints/index.js'
import * as _ from '../../src/request-a-prereview-page/make-decision.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('makeDecision', () => {
  describe('when the form has been submitted', () => {
    test.prop(
      [
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
        fc.reviewRequestPreprintId(),
      ],
      {
        examples: [
          [
            [
              'https://doi.org/10.1101/2021.06.18.21258689', // doi.org URL
              [new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new MedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            [
              ' https://doi.org/10.1101/2021.06.18.21258689 ', // doi.org URL with whitespace
              [new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new MedrxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            [
              'https://www.biorxiv.org/content/10.1101/2021.06.18.21258689', // biorxiv.org URL
              [new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
            [
              ' http://www.biorxiv.org/content/10.1101/2021.06.18.21258689 ', // biorxiv.org URL with whitespace
              [new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') })],
            ],
            new BiorxivPreprintId({ value: Doi('10.1101/2021.06.18.21258689') }),
          ],
          [
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
    )('when the form is valid', async ([value, expected], preprintId) => {
      const resolvePreprintId = jest.fn<ResolvePreprintIdEnv['resolvePreprintId']>(_ => TE.of(preprintId))

      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({ resolvePreprintId })()

      expect(actual).toStrictEqual({ _tag: 'BeginFlow', preprint: preprintId })
      expect(resolvePreprintId).toHaveBeenCalledWith(...expected)
    })

    test.prop([
      fc.oneof(
        fc.preprintDoi(),
        fc.supportedPreprintUrl().map(([url]) => url.href),
      ),
      fc.notAReviewRequestPreprintId(),
    ])('when the preprint is not supported', async (value, preprintId) => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: () => TE.of(preprintId),
      })()

      expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedPreprint', preprint: preprintId })
    })

    test.prop([
      fc.oneof(
        fc.indeterminatePreprintIdWithDoi().map(id => Tuple.make(id.value, Array.of(id))),
        fc.supportedPreprintUrl().map(([url, id]) => Tuple.make(url.href, id)),
      ),
    ])('when the preprint is not found', async ([value, preprint]) => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: () => TE.left(new PreprintIsNotFound({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'ShowUnknownPreprint',
        preprint: expect.objectContaining({ value: preprint[0].value }),
      })
    })

    test.prop([
      fc.oneof(
        fc.indeterminatePreprintIdWithDoi().map(id => id.value),
        fc.supportedPreprintUrl().map(([url]) => url.href),
      ),
    ])('when it is not a preprint', async value => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: () => TE.left(new NotAPreprint({})),
      })()

      expect(actual).toStrictEqual({ _tag: 'ShowNotAPreprint' })
    })

    test.prop([
      fc.oneof(
        fc.preprintDoi(),
        fc.supportedPreprintUrl().map(([url]) => url.href),
      ),
    ])("when the preprint can't be loaded", async value => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: () => TE.left(new PreprintIsUnavailable({})),
      })()

      expect(actual).toStrictEqual({ _tag: 'ShowError' })
    })

    test.prop([fc.nonPreprintDoi()])('when it is not a supported DOI', async value => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedDoi' })
    })

    test.prop([fc.nonPreprintUrl().map(url => url.href)])('when it is not a supported URL', async value => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({ _tag: 'ShowUnsupportedUrl' })
    })

    test.prop([
      fc
        .string()
        .filter(
          string =>
            (!string.startsWith('10.') && !string.startsWith('http')) || !string.includes('.') || !string.includes('/'),
        ),
    ])('when the form is invalid', async value => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({ _tag: 'ShowFormWithErrors', form: { _tag: 'InvalidForm', value } })
    })
  })

  test.prop([fc.anything(), fc.string().filter(method => method !== 'POST')])(
    'when the form needs submitting',
    async (body, method) => {
      const actual = await _.makeDecision({ body, method })({
        resolvePreprintId: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({ _tag: 'ShowEmptyForm' })
    },
  )
})
