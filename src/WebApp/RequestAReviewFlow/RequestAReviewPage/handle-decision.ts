import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import * as Response from '../../Response/index.ts'
import type * as Decision from './decision.ts'
import { notAPreprintPage } from './not-a-preprint-page.ts'
import { requestAPrereviewPage } from './request-a-prereview-page.ts'
import * as RequestAReviewForm from './RequestAReviewForm.ts'
import { unknownPreprintPage } from './unknown-preprint-page.ts'
import { unsupportedDoiPage } from './unsupported-doi-page.ts'
import { unsupportedUrlPage } from './unsupported-url-page.ts'

export const handleDecision = Match.typeTags<Decision.Decision, Effect.Effect<Response.Response, never, Locale>>()({
  BeginFlow: ({ preprint }) =>
    Effect.succeed(
      Response.RedirectResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
    ),
  ShowError: () => HavingProblemsPage,
  ShowFormWithErrors: ({ form }) => Effect.andThen(Locale, locale => requestAPrereviewPage(form, locale)),
  ShowNotAPreprint: () => Effect.andThen(Locale, locale => notAPreprintPage(locale)),
  ShowUnknownPreprint: ({ preprint }) => Effect.andThen(Locale, locale => unknownPreprintPage(preprint, locale)),
  ShowUnsupportedDoi: () => Effect.andThen(Locale, unsupportedDoiPage),
  ShowUnsupportedUrl: () => Effect.andThen(Locale, unsupportedUrlPage),
  ShowEmptyForm: () =>
    Effect.andThen(Locale, locale => requestAPrereviewPage(new RequestAReviewForm.EmptyForm(), locale)),
})
