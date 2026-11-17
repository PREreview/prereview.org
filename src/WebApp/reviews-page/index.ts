import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import { match } from 'ts-pattern'
import type { SupportedLocale } from '../../locales/index.ts'
import type { FieldId } from '../../types/field.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { pageNotFound } from '../http-error.ts'
import type { PageResponse } from '../Response/index.ts'
import { failureMessage } from './failure-message.ts'
import { getRecentPrereviews, type GetRecentPrereviewsEnv } from './recent-prereviews.ts'
import { createPage, emptyPage } from './reviews-page.ts'

export type { GetRecentPrereviewsEnv } from './recent-prereviews.ts'

export const reviewsPage = ({
  canSearchByText = true,
  field,
  language,
  locale,
  page,
  query: requestedQuery,
}: {
  canSearchByText?: boolean
  field?: FieldId
  language?: LanguageCode
  locale: SupportedLocale
  page: number
  query?: NonEmptyString
}): RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> => {
  const query = canSearchByText ? requestedQuery : undefined

  return pipe(
    String(query).includes('%')
      ? RTE.left('not-found' as const)
      : getRecentPrereviews({ field, language, page, query }),
    RTE.matchW(
      error =>
        match(error)
          .with('not-found', () =>
            page === 1 ? emptyPage({ field, language, query }, locale, { canSearchByText }) : pageNotFound(locale),
          )
          .with('unavailable', () => failureMessage(locale))
          .exhaustive(),
      prereviews => createPage(prereviews, locale, { canSearchByText }),
    ),
  )
}
