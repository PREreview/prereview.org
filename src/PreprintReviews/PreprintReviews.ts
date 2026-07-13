import { Array, Context, Effect, type Either, Layer, pipe } from 'effect'
import * as Commands from '../Commands.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import * as Queries from '../Queries.ts'
import type * as CheckIfUserCanAddToAClub from './CheckIfUserCanAddToAClub.ts'
import { GetRapidPrereviewsForAPreprint, type RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
import { HasAPrereviewerBeenNotifiedOfAReview } from './HasAPrereviewerBeenNotifiedOfAReview.ts'
import { RecordEmailSentToNotifyPrereviewerOfAPrereview } from './RecordEmailSentToNotifyPrereviewerOfAPrereview.ts'

export interface RapidPrereview {
  readonly author: Prereviewers.Persona
  readonly questions: Omit<
    RapidPrereviewForAPreprint['questions'],
    'dataLink' | 'technicalComments' | 'editorialComments'
  >
}

export class PreprintReviews extends Context.Tag('PreprintReviews')<
  PreprintReviews,
  {
    getRapidPrereviewsForAPreprint: (
      preprintId: IndeterminatePreprintId,
    ) => Effect.Effect<ReadonlyArray<RapidPrereview>, Queries.UnableToQuery>
    recordEmailSentToNotifyPrereviewerOfAPrereview: Commands.FromStatelessCommand<
      typeof RecordEmailSentToNotifyPrereviewerOfAPrereview
    >
    hasAPrereviewerBeenNotifiedOfAReview: Queries.FromOnDemandQuery<typeof HasAPrereviewerBeenNotifiedOfAReview>
    checkIfUserCanAddToAClub: (
      input: CheckIfUserCanAddToAClub.Input,
    ) => Effect.Effect<
      Either.Either<CheckIfUserCanAddToAClub.Result>,
      Either.Either.Left<CheckIfUserCanAddToAClub.Result> | Queries.UnableToQuery
    >
  }
>() {}

export const {
  getRapidPrereviewsForAPreprint,
  recordEmailSentToNotifyPrereviewerOfAPrereview,
  hasAPrereviewerBeenNotifiedOfAReview,
  checkIfUserCanAddToAClub,
} = Effect.serviceFunctions(PreprintReviews)

export const layer = Layer.effect(
  PreprintReviews,
  Effect.gen(function* () {
    const personas = yield* Prereviewers.Prereviewers

    const getRapidPrereviewsForAPreprint = yield* Queries.makeOnDemandQuery(GetRapidPrereviewsForAPreprint)

    return {
      getRapidPrereviewsForAPreprint: id =>
        pipe(
          getRapidPrereviewsForAPreprint(id),
          Effect.andThen(
            Array.map(
              Effect.fnUntraced(
                function* (rapidPrereview) {
                  const persona = yield* Prereviewers.getPersona(rapidPrereview.author)

                  return { ...rapidPrereview, author: persona } satisfies RapidPrereview
                },
                Effect.provideService(Prereviewers.Prereviewers, personas),
              ),
            ),
          ),
          Effect.andThen(Effect.allWith({ concurrency: 'inherit' })),
          Effect.catchTag('UnableToGetPersona', error => new Queries.UnableToQuery({ cause: error })),
          Effect.withSpan('PreprintReviews.getRapidPrereviewsForAPreprint', { attributes: { id } }),
        ),
      recordEmailSentToNotifyPrereviewerOfAPrereview: yield* Commands.makeStatelessCommand(
        RecordEmailSentToNotifyPrereviewerOfAPrereview,
      ),
      hasAPrereviewerBeenNotifiedOfAReview: yield* Queries.makeOnDemandQuery(HasAPrereviewerBeenNotifiedOfAReview),
      checkIfUserCanAddToAClub: () => new Queries.UnableToQuery({ cause: 'not implemented' }),
    }
  }),
)
