import { describe, expect, it } from '../vitest.ts'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.ts'
import { LanguageDetection } from '../../src/ExternalInteractions/index.ts'
import { html } from '../../src/html.ts'
import * as _ from '../../src/PreprintReviews/legacy-publish-review.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import * as fc from '../WebApp/write-review/fc.ts'

describe('completedFormToNewPrereview', () => {
  it.effect.prop(
    'includes details of the use of AI',
    [
      fc.completedForm({ generativeAiIdeas: fc.constant('yes'), generativeAiIdeasDetails: fc.nonEmptyString() }),
      fc.orcidId(),
      fc.preprintTitle(),
      fc.supportedLocale(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
    ],
    ([form, orcidId, preprint, locale, publicPersona, pseudonymPersona]) =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<
          LanguageDetection.LanguageDetection | Locale | Prereviewers.Prereviewers
        >()

        const actual = yield* Effect.promise(_.completedFormToNewPrereview({ form, orcidId, preprint })({ runtime }))

        expect(actual).toStrictEqual(
          expect.objectContaining({
            right: expect.objectContaining({
              review: expect.htmlContaining(html`<p>${form.generativeAiIdeasDetails}</p>`),
            }),
          }),
        )
      }).pipe(
        Effect.provide([
          LanguageDetection.layerCld,
          Layer.succeed(Locale, locale),
          Layer.mock(Prereviewers.Prereviewers, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ]),
      ),
  )
})
