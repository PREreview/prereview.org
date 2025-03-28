import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
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
  match(decision)
    .with({ _tag: 'BeginFlow', preprint: P.select() }, preprint =>
      Response.RedirectResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }),
    )
    .with({ _tag: 'ShowError' }, () => havingProblemsPage(locale))
    .with({ _tag: 'ShowFormWithErrors' }, ({ form }) => requestAPrereviewPage(form, locale))
    .with({ _tag: 'ShowNotAPreprint' }, () => notAPreprintPage(locale))
    .with({ _tag: 'ShowUnknownPreprint' }, ({ preprint }) => unknownPreprintPage(preprint, locale))
    .with({ _tag: 'ShowUnsupportedDoi' }, () => unsupportedDoiPage(locale))
    .with({ _tag: 'ShowUnsupportedPreprint' }, ({ preprint }) => unsupportedPreprintPage(preprint, locale))
    .with({ _tag: 'ShowUnsupportedUrl' }, () => unsupportedUrlPage(locale))
    .with({ _tag: 'ShowEmptyForm' }, () => requestAPrereviewPage(Form.EmptyForm, locale))
    .exhaustive()
