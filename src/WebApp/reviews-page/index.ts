import { Match, pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { SupportedLocale } from '../../locales/index.ts'
import type { FieldId } from '../../types/field.ts'
import { pageNotFound } from '../http-error.ts'
import type { PageResponse } from '../Response/index.ts'
import { failureMessage } from './failure-message.ts'
import { getRecentPrereviews, type GetRecentPrereviewsEnv } from './recent-prereviews.ts'
import { createPage, emptyPage } from './reviews-page.ts'

export type { GetRecentPrereviewsEnv } from './recent-prereviews.ts'

export const reviewsPage = ({
  field,
  language,
  locale,
  page,
}: {
  field?: FieldId
  language?: LanguageCode
  locale: SupportedLocale
  page: number
}): RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> =>
  pipe(
    getRecentPrereviews({ field, language, page }),
    RTE.matchW(
      error =>
        Match.value(error).pipe(
          Match.literalsExhaustive({
            'not-found': () => (page === 1 ? emptyPage({ field, language }, locale) : pageNotFound(locale)),
            unavailable: () => failureMessage(locale),
          }),
        ),
      prereviews => createPage(prereviews, locale),
    ),
  )
