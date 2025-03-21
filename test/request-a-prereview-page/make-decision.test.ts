import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { NotAPreprint, PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import * as _ from '../../src/request-a-prereview-page/make-decision.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('makeDecision', () => {
  describe('when the form has been submitted', () => {
    test.prop([
      fc.oneof(
        fc.preprintDoi(),
        fc.supportedPreprintUrl().map(([url]) => url.href),
      ),
      fc.reviewRequestPreprintId(),
    ])('when the form is valid', async (value, preprintId) => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: () => TE.of(preprintId),
      })()

      expect(actual).toStrictEqual({ _tag: 'BeginFlow', preprint: preprintId })
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
        fc.indeterminatePreprintIdWithDoi().map(id => [id.value, id] as const),
        fc.supportedPreprintUrl().map(([url, id]) => [url.href, id] as const),
      ),
    ])('when the preprint is not found', async ([value, preprint]) => {
      const actual = await _.makeDecision({ body: { preprint: value }, method: 'POST' })({
        resolvePreprintId: () => TE.left(new PreprintIsNotFound({})),
      })()

      expect(actual).toStrictEqual({
        _tag: 'ShowUnknownPreprint',
        preprint: expect.objectContaining({ value: preprint.value }),
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
