import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getClubDetails } from '../club-details.js'
import { havingProblemsPage } from '../http-error.js'
import type { PageResponse } from '../response.js'
import type { ClubId } from '../types/club-id.js'
import { createPage } from './club-profile-page.js'
import { type GetPrereviewsEnv, getPrereviews } from './prereviews.js'

export { GetPrereviewsEnv } from './prereviews.js'

export const clubProfile = (id: ClubId): RT.ReaderTask<GetPrereviewsEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('prereviews', getPrereviews(id)),
    RTE.let('club', () => getClubDetails(id)),
    RTE.match(() => havingProblemsPage, createPage),
  )
