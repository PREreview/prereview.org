import { Match } from 'effect'
import { format } from 'fp-ts-routing'
import { havingProblemsPage } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import * as Response from '../response.js'
import { requestReviewMatch } from '../routes.js'
import type * as Decision from './decision.js'
import * as Form from './form.js'
import { notAPreprintPage } from './not-a-preprint-page.js'
import { requestAPrereviewPage } from './request-a-prereview-page.js'
import { unknownPreprintPage } from './unknown-preprint-page.js'
import { unsupportedDoiPage } from './unsupported-doi-page.js'
import { unsupportedPreprintPage } from './unsupported-preprint-page.js'
import { unsupportedUrlPage } from './unsupported-url-page.js'

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
