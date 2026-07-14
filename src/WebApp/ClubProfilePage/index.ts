import { Array, Effect, pipe } from 'effect'
import * as Clubs from '../../Clubs/index.ts'
import { Locale } from '../../Context.ts'
import { OrcidRecords } from '../../ExternalInteractions/index.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { createPage } from './ClubProfilePage.ts'

export const ClubProfilePage = Effect.fn(
  function* ({ id }: { id: Clubs.ClubId }) {
    const locale = yield* Locale

    const { club, prereviews } = yield* Effect.all(
      {
        club: pipe(Clubs.getClubDetails(id), club =>
          pipe(
            Array.map(
              club.leads,
              Effect.fnUntraced(function* ({ orcid }) {
                const name = yield* OrcidRecords.getName(orcid)

                return { name, orcid }
              }),
            ),
            Effect.allWith({ concurrency: 'inherit' }),
            Effect.andThen(leads => ({ ...club, leads })),
          ),
        ),
        prereviews: Prereviews.getForClub(id),
      },
      { concurrency: 'inherit' },
    )

    return createPage({ club, id, prereviews, locale })
  },
  Effect.catchTag('PrereviewsAreUnavailable', () => HavingProblemsPage),
)
