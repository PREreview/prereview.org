import type { UrlParams } from 'effect/http'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { LanguagesStore } from '../../../Domain/Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import * as LanguagesVisibilityForm from './LanguagesVisibilityForm.ts'
import { LanguagesVisibilityPage as CreatePage } from './LanguagesVisibilityPage.ts'

export const LanguagesVisibilityPage: Effect.Effect<Response, never, LanguagesStore.Store | Locale | LoggedInUser> =
  Effect.gen(function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const languages = yield* LanguagesStore.get(user.orcid)

    return CreatePage({ languages, locale })
  }).pipe(
    Effect.catchTags({
      LanguagesNotFound: () =>
        Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
      LanguagesUnavailable: () => HavingProblemsPage,
    }),
    Effect.withSpan('MyDetails.LanguagesVisibilityPage'),
  )

export const LanguagesVisibilitySubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, LanguagesStore.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.LanguagesVisibilitySubmission',
)(
  function* (body) {
    const form = yield* LanguagesVisibilityForm.fromBody(body)
    const user = yield* LoggedInUser

    const languages = yield* LanguagesStore.get(user.orcid)

    yield* LanguagesStore.save(user.orcid, {
      ...languages,
      visibility: form.languagesVisibility,
    })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTags({
    LanguagesNotFound: () =>
      Effect.succeed(RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })),
    LanguagesUnavailable: () => HavingProblemsPage,
  }),
)
