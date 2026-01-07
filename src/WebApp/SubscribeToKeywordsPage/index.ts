import { UrlParams } from '@effect/platform'
import { Array, Effect, Schema } from 'effect'
import { format } from 'fp-ts-routing'
import * as Prereviewers from '../../Prereviewers/index.ts'
import * as Routes from '../../routes.ts'
import { Keyword, NonEmptyString } from '../../types/index.ts'
import { KeywordIdSchema } from '../../types/Keyword.ts'
import { LoggedInUser } from '../../user.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { RedirectResponse } from '../Response/index.ts'
import { SubscribeToKeywordsPage as MakeResponse } from './SubscribeToKeywordsPage.ts'

export const SubscribeToKeywordsPage = Effect.succeed(MakeResponse())

export const SubscribeToKeywordsSubmission = ({ body }: { body: UrlParams.UrlParams }) =>
  Effect.gen(function* () {
    const { search } = yield* Schema.decode(SearchFormSchema)(body)

    return MakeResponse(Keyword.search(search))
  }).pipe(
    Effect.orElse(() =>
      Effect.gen(function* () {
        const user = yield* LoggedInUser
        const { keywords } = yield* Schema.decode(SubscribeFormSchema)(body)

        yield* Effect.forEach(Array.ensure(keywords), keywordId =>
          Prereviewers.subscribeToAKeyword({ prereviewerId: user.orcid, keywordId }),
        )

        return RedirectResponse({ location: format(Routes.myDetailsMatch.formatter, {}) })
      }),
    ),
    Effect.orElse(() => HavingProblemsPage),
  )

const SearchFormSchema = UrlParams.schemaRecord(
  Schema.Struct({
    search: NonEmptyString.NonEmptyStringSchema,
  }),
)

const SubscribeFormSchema = UrlParams.schemaRecord(
  Schema.Struct({
    keywords: Schema.Union(KeywordIdSchema, Schema.NonEmptyArray(KeywordIdSchema)),
  }),
)
