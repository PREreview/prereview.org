import { Effect, Match } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Routes from '../../../routes.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import * as Response from '../../Response/index.ts'
import type * as Decision from './Decision.ts'
import { NotAPreprintPage } from './NotAPreprintPage.ts'
import { RequestAPrereviewPage } from './RequestAPrereviewPage.ts'
import * as RequestAReviewForm from './RequestAReviewForm.ts'
import { UnknownPreprintPage } from './UnknownPreprintPage.ts'
import { UnsupportedDoiPage } from './UnsupportedDoiPage.ts'
import { UnsupportedUrlPage } from './UnsupportedUrlPage.ts'

export const handleDecision = Match.typeTags<Decision.Decision, Effect.Effect<Response.Response, never, Locale>>()({
  BeginFlow: ({ preprint }) =>
    Effect.succeed(
      Response.RedirectResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
    ),
  ShowError: () => HavingProblemsPage,
  ShowFormWithErrors: ({ form }) => Effect.andThen(Locale, locale => RequestAPrereviewPage(form, locale)),
  ShowNotAPreprint: () => Effect.andThen(Locale, locale => NotAPreprintPage(locale)),
  ShowUnknownPreprint: ({ preprint }) => Effect.andThen(Locale, locale => UnknownPreprintPage(preprint, locale)),
  ShowUnsupportedDoi: () => Effect.andThen(Locale, UnsupportedDoiPage),
  ShowUnsupportedUrl: () => Effect.andThen(Locale, UnsupportedUrlPage),
  ShowEmptyForm: () =>
    Effect.andThen(Locale, locale => RequestAPrereviewPage(new RequestAReviewForm.EmptyForm(), locale)),
})
