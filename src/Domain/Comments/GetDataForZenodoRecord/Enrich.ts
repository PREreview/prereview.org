import { Effect, Option } from 'effect'
import { LanguageDetection } from '../../../ExternalInteractions/index.ts'
import { isUserSelectableLanguage, UserSelectableLanguages } from '../../../locales/index.ts'
import * as PublicUrl from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import * as PreprintReviews from '../../PreprintReviews/index.ts'
import { Prereviewers } from '../../Prereviewers/index.ts'
import type { DataForZenodoRecordDetails } from './Query.ts'
import type { DataForZenodoRecord } from './Types.ts'

export const Enrich = Effect.fn('Comments.getDataForZenodoRecord.Enrich')(function* (
  details: DataForZenodoRecordDetails,
) {
  const { author, prereview, language } = yield* Effect.all(
    {
      author: Prereviewers.getPersona({ orcidId: details.authorId, persona: details.persona }),
      prereview: PreprintReviews.getPreprintReview(details.prereviewId),
      language: Effect.option(LanguageDetection.detectLanguageFrom([...UserSelectableLanguages], details.comment)),
    },
    { concurrency: 'unbounded' },
  )

  const url = yield* PublicUrl.forRoute(Routes.Review, { id: prereview.id })

  return {
    author,
    comment: details.comment,
    competingInterests: details.competingInterests,
    language: Option.filter(language, isUserSelectableLanguage),
    prereview: {
      doi: prereview.doi,
      url,
      preprint: { id: prereview.preprint.id, title: prereview.preprint.title },
    },
  } satisfies DataForZenodoRecord
})
