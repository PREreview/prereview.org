import type { UrlParams } from 'effect/http'
import { Effect, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../Context.ts'
import { LanguagesStore } from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { LanguagesPage as CreatePage } from './LanguagesPage.ts'
import * as LanguagesForm from './LanguagesForm.ts'

export const LanguagesPage: Effect.Effect<Response, never, LanguagesStore.Store | Locale | LoggedInUser> = Effect.gen(
  function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const languages = yield* Effect.option(LanguagesStore.get(user.orcid))

    return CreatePage(languages, locale)
  },
).pipe(Effect.withSpan('MyDetails.LanguagesPage'))

export const LanguagesSubmission: (
  body: UrlParams.UrlParams,
) => Effect.Effect<Response, never, LanguagesStore.Store | Locale | LoggedInUser> = Effect.fn(
  'MyDetails.LanguagesSubmission',
)(
  function* (body) {
    const form = yield* LanguagesForm.fromBody(body)
    const user = yield* LoggedInUser

    if (form._tag === 'EmptyForm') {
      yield* LanguagesStore.remove(user.orcid)

      return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
    }

    const visibility = yield* pipe(
      LanguagesStore.get(user.orcid),
      Effect.map(Struct.get('visibility')),
      Effect.catchTag('LanguagesNotFound', () => Effect.succeed('restricted' as const)),
    )

    yield* LanguagesStore.save(user.orcid, { value: form.languages, visibility })

    return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
  },
  Effect.catchTag('LanguagesUnavailable', () => HavingProblemsPage),
)
