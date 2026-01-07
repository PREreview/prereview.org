import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import { pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import type { PageResponse } from '../../Response/index.ts'
import type { FieldId } from '../../types/field.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { failureMessage } from './failure-message.ts'
import { type GetRecentPrereviewsEnv, getRecentPrereviews } from './recent-prereviews.ts'
import { createPage, emptyPage } from './reviews-page.ts'

export type { GetRecentPrereviewsEnv } from './recent-prereviews.ts'

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
          .with('not-found', () => (page === 1 ? emptyPage({ field, language, query }, locale) : pageNotFound(locale)))
          .with('unavailable', () => failureMessage(locale))
          .exhaustive(),
      prereviews => createPage(prereviews, locale),
    ),
  )
