import { describe, expect, it } from '../vitest.ts'
import * as E from 'fp-ts/lib/Either.js'
import { CompletedFormC } from '../../src/PreprintReviews/index.ts'
import * as fc from '../WebApp/write-review/fc.ts'

describe('CompletedFormC', () => {
  it.prop('round-trips a completed form', [fc.completedForm()], ([form]) => {
    expect(CompletedFormC.decode(CompletedFormC.encode(form))).toEqual(E.right(form))
  })

  it.prop(
    'keeps details of the use of AI when it was used',
    [fc.completedForm({ generativeAiIdeas: fc.constant('yes') }), fc.nonEmptyString()],
    ([form, generativeAiIdeasDetails]) => {
      const actual = CompletedFormC.decode({ ...CompletedFormC.encode(form), generativeAiIdeasDetails })

      expect(actual).toEqual(E.right(expect.objectContaining({ generativeAiIdeasDetails })))
    },
  )

  it.prop(
    'ignores details of the use of AI when it was not used',
    [fc.completedForm({ generativeAiIdeas: fc.constant('no') }), fc.nonEmptyString()],
    ([form, generativeAiIdeasDetails]) => {
      const actual = CompletedFormC.decode({ ...CompletedFormC.encode(form), generativeAiIdeasDetails })

      expect(actual).toEqual(E.right(expect.not.objectContaining({ generativeAiIdeasDetails: expect.anything() })))
    },
  )
})
