import { UrlParams } from '@effect/platform'
import { Effect, Schema } from 'effect'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { Keyword, NonEmptyString } from '../types/index.ts'
import { SubscribeToKeywordsPage as MakeResponse } from './SubscribeToKeywordsPage.ts'

export const SubscribeToKeywordsPage = Effect.succeed(MakeResponse())

export const SubscribeToKeywordsSubmission = ({ body }: { body: UrlParams.UrlParams }) =>
  Effect.gen(function* () {
    const { search } = yield* Schema.decode(SearchFormSchema)(body)

    return MakeResponse(Keyword.search(search))
  }).pipe(Effect.orElse(() => HavingProblemsPage))

const SearchFormSchema = UrlParams.schemaRecord(
  Schema.Struct({
    search: NonEmptyString.NonEmptyStringSchema,
  }),
)
