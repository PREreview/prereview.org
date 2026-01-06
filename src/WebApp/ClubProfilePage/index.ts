import { Effect } from 'effect'
import * as Clubs from '../../Clubs/index.ts'
import { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import { createPage } from './ClubProfilePage.ts'

export const ClubProfilePage = Effect.fn(
  function* ({ id }: { id: Clubs.ClubId }) {
    const club = Clubs.getClubDetails(id)
    const locale = yield* Locale
    const prereviews = yield* Prereviews.getForClub(id)

    return createPage({ club, id, prereviews, locale })
  },
  Effect.catchTag('PrereviewsAreUnavailable', () => HavingProblemsPage),
)
