import { pipe } from 'effect'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { getClubDetails, type ClubId } from '../Clubs/index.ts'
import { havingProblemsPage } from '../http-error.ts'
import type { SupportedLocale } from '../locales/index.ts'
import type { PageResponse } from '../Response/index.ts'
import { createPage } from './club-profile-page.ts'
import { getPrereviews, type GetPrereviewsEnv } from './prereviews.ts'

export { type GetPrereviewsEnv } from './prereviews.ts'

export const clubProfile = (id: ClubId, locale: SupportedLocale): RT.ReaderTask<GetPrereviewsEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('prereviews', getPrereviews(id)),
    RTE.let('club', () => getClubDetails(id)),
    RTE.let('locale', () => locale),
    RTE.match(() => havingProblemsPage(locale), createPage),
  )
