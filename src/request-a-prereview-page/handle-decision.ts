import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error'
import * as Response from '../response'
import { requestAPrereviewMatch, requestReviewMatch } from '../routes'
import type * as Decision from './decision'
import * as Form from './form'
import { notAPreprintPage } from './not-a-preprint-page'
import { requestAPrereviewPage } from './request-a-prereview-page'
import { unknownPreprintPage } from './unknown-preprint-page'
import { unsupportedDoiPage } from './unsupported-doi-page'
import { unsupportedPreprintPage } from './unsupported-preprint-page'
import { unsupportedUrlPage } from './unsupported-url-page'

export const handleDecision = (decision: Decision.Decision): Response.Response =>
  match(decision)
    .with({ _tag: 'BeginFlow', preprint: P.select() }, preprint =>
      Response.RedirectResponse({ location: format(requestReviewMatch.formatter, { id: preprint }) }),
    )
    .with({ _tag: 'DenyAccess' }, () => pageNotFound)
    .with({ _tag: 'RequireLogIn' }, () =>
      Response.LogInResponse({ location: format(requestAPrereviewMatch.formatter, {}) }),
    )
    .with({ _tag: 'ShowError' }, () => havingProblemsPage)
    .with({ _tag: 'ShowFormWithErrors', form: P.select() }, requestAPrereviewPage)
    .with({ _tag: 'ShowNotAPreprint' }, () => notAPreprintPage)
    .with({ _tag: 'ShowUnknownPreprint', preprint: P.select() }, unknownPreprintPage)
    .with({ _tag: 'ShowUnsupportedDoi' }, () => unsupportedDoiPage)
    .with({ _tag: 'ShowUnsupportedPreprint', preprint: P.select() }, unsupportedPreprintPage)
    .with({ _tag: 'ShowUnsupportedUrl' }, () => unsupportedUrlPage)
    .with({ _tag: 'ShowEmptyForm' }, () => requestAPrereviewPage(Form.EmptyForm))
    .exhaustive()
