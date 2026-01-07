import { Match } from 'effect'
import { format } from 'fp-ts-routing'
import { havingProblemsPage } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import * as Response from '../../Response/index.ts'
import { requestReviewMatch } from '../../routes.ts'
import type * as Decision from './decision.ts'
import * as Form from './form.ts'
import { notAPreprintPage } from './not-a-preprint-page.ts'
import { requestAPrereviewPage } from './request-a-prereview-page.ts'
import { unknownPreprintPage } from './unknown-preprint-page.ts'
import { unsupportedDoiPage } from './unsupported-doi-page.ts'
import { unsupportedPreprintPage } from './unsupported-preprint-page.ts'
import { unsupportedUrlPage } from './unsupported-url-page.ts'

export const handleDecision = (decision: Decision.Decision, locale: SupportedLocale): Response.Response =>
  Match.valueTags(decision, {
    BeginFlow: ({ preprint }) =>
      Response.RedirectResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }),
    ShowError: () => havingProblemsPage(locale),
    ShowFormWithErrors: ({ form }) => requestAPrereviewPage(form, locale),
    ShowNotAPreprint: () => notAPreprintPage(locale),
    ShowUnknownPreprint: ({ preprint }) => unknownPreprintPage(preprint, locale),
    ShowUnsupportedDoi: () => unsupportedDoiPage(locale),
    ShowUnsupportedPreprint: ({ preprint }) => unsupportedPreprintPage(preprint, locale),
    ShowUnsupportedUrl: () => unsupportedUrlPage(locale),
    ShowEmptyForm: () => requestAPrereviewPage(Form.EmptyForm, locale),
  })
