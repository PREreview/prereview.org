import type { UrlParams } from '@effect/platform'
import type { Effect } from 'effect'
import type { Locale } from '../../../Context.ts'
import type { PreprintReviews } from '../../../PreprintReviews/index.ts'
import type { IndeterminatePreprintId, Preprints } from '../../../Preprints/index.ts'
import type { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'

export const AddToAClubPage = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preprintId,
}: {
  preprintId: IndeterminatePreprintId
}): Effect.Effect<Response, never, Locale | LoggedInUser | Preprints | PreprintReviews> => HavingProblemsPage

export const AddToAClubSubmission = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  body,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preprintId,
}: {
  body: UrlParams.UrlParams
  preprintId: IndeterminatePreprintId
}): Effect.Effect<Response, never, Locale | LoggedInUser | Preprints | PreprintReviews> => HavingProblemsPage
