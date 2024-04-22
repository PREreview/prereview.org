import { format } from 'fp-ts-routing'
import { P, match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error'
import * as Response from '../response'
import { requestAPrereviewMatch } from '../routes'
import type * as Decision from './decision'
import { notAPreprintPage } from './not-a-preprint-page'
import { requestAPrereviewPage } from './request-a-prereview-page'
import { unsupportedDoiPage } from './unsupported-doi-page'
import { unsupportedUrlPage } from './unsupported-url-page'

export const handleDecision = (decision: Decision.Decision): Response.Response =>
  match(decision)
    .with({ _tag: 'DenyAccess' }, () => pageNotFound)
    .with({ _tag: 'RequireLogIn' }, () =>
      Response.LogInResponse({ location: format(requestAPrereviewMatch.formatter, {}) }),
    )
    .with({ _tag: 'ShowError' }, () => havingProblemsPage)
    .with({ _tag: 'ShowForm', form: P.select() }, requestAPrereviewPage)
    .with({ _tag: 'ShowNotAPreprint' }, () => notAPreprintPage)
    .with({ _tag: 'ShowUnsupportedDoi' }, () => unsupportedDoiPage)
    .with({ _tag: 'ShowUnsupportedUrl' }, () => unsupportedUrlPage)
    .exhaustive()
