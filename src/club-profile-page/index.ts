import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { getClubDetails } from '../club-details'
import { havingProblemsPage } from '../http-error'
import type { PageResponse } from '../response'
import type { ClubId } from '../types/club-id'
import { createPage } from './club-profile-page'
import { type GetPrereviewsEnv, getPrereviews } from './prereviews'

export { GetPrereviewsEnv } from './prereviews'

export const clubProfile = (id: ClubId): RT.ReaderTask<GetPrereviewsEnv, PageResponse> =>
  pipe(
    RTE.Do,
    RTE.let('id', () => id),
    RTE.apS('prereviews', getPrereviews(id)),
    RTE.let('club', () => getClubDetails(id)),
    RTE.match(() => havingProblemsPage, createPage),
  )
