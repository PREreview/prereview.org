import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import { pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import type { PageResponse } from '../response.js'
import type { FieldId } from '../types/field.js'
import type { NonEmptyString } from '../types/string.js'
import { failureMessage } from './failure-message.js'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews.js'
import { createPage, emptyPage } from './reviews-page.js'

export type { GetRecentPrereviewsEnv, RecentPrereviews } from './recent-prereviews.js'

export const reviewsPage = ({
  field,
  language,
  locale,
  page,
  query,
}: {
  field?: FieldId
  language?: LanguageCode
  locale: SupportedLocale
  page: number
  query?: NonEmptyString
}): RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    getRecentPrereviews({ field, language, page, query }),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () => (page === 1 ? emptyPage({ field, language, query }, locale) : pageNotFound))
          .with('unavailable', () => failureMessage)
          .exhaustive(),
      prereviews => createPage(prereviews, locale),
    ),
  )
