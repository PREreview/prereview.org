import { format } from 'fp-ts-routing'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error'
import * as Response from '../response'
import { requestAPrereviewMatch } from '../routes'
import type * as Decision from './decision'
import { requestAPrereviewPage } from './request-a-prereview-page'

export const handleDecision = (decision: Decision.Decision): Response.Response =>
  match(decision)
    .with({ _tag: 'DenyAccess' }, () => pageNotFound)
    .with({ _tag: 'RequireLogIn' }, () =>
      Response.LogInResponse({ location: format(requestAPrereviewMatch.formatter, {}) }),
    )
    .with({ _tag: 'ShowError' }, () => havingProblemsPage)
    .with({ _tag: 'ShowForm' }, () => requestAPrereviewPage)
    .exhaustive()
