import { Array, Context, Effect, type Either, Layer, pipe, Struct } from 'effect'
import { Clubs } from '../Clubs/index.ts'
import * as Commands from '../Commands.ts'
import { KeyvStores } from '../keyv.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import * as Queries from '../Queries.ts'
import { AddReviewToAClub } from './AddReviewToAClub.ts'
import * as CheckIfUserCanAddToAClub from './CheckIfUserCanAddToAClub.ts'
import { DeclareUseOfAi } from './DeclareUseOfAi.ts'
import * as GetNextExpectedCommand from './GetNextExpectedCommand.ts'
import { GetRapidPrereviewsForAPreprint, type RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
import * as GetUseOfAiDetails from './GetUseOfAiDetails.ts'
import { HasAPrereviewerBeenNotifiedOfAReview } from './HasAPrereviewerBeenNotifiedOfAReview.ts'
import { MarkReviewAsNotInAClub } from './MarkReviewAsNotInAClub.ts'
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
      Either.Either.Right<CheckIfUserCanAddToAClub.Result>,
      Either.Either.Left<CheckIfUserCanAddToAClub.Result> | Queries.UnableToQuery
    >
    getNextExpectedCommand: (
      input: GetNextExpectedCommand.Input,
    ) => Effect.Effect<
      Either.Either.Right<GetNextExpectedCommand.Result>,
      Either.Either.Left<GetNextExpectedCommand.Result> | Queries.UnableToQuery
    >
    getUseOfAiDetails: (
      input: GetUseOfAiDetails.Input,
    ) => Effect.Effect<
      Either.Either.Right<GetUseOfAiDetails.Result>,
      Either.Either.Left<GetUseOfAiDetails.Result> | Queries.UnableToQuery
    >
    addReviewToAClub: ReturnType<typeof AddReviewToAClub>
    markReviewAsNotInAClub: ReturnType<typeof MarkReviewAsNotInAClub>
    declareUseOfAi: ReturnType<typeof DeclareUseOfAi>
  }
>() {}

export const {
  getRapidPrereviewsForAPreprint,
  recordEmailSentToNotifyPrereviewerOfAPrereview,
  hasAPrereviewerBeenNotifiedOfAReview,
  checkIfUserCanAddToAClub,
  getNextExpectedCommand,
  getUseOfAiDetails,
} = Effect.serviceFunctions(PreprintReviews)

export const layer = Layer.effect(
  PreprintReviews,
  Effect.gen(function* () {
    const clubs = yield* Clubs
    const personas = yield* Prereviewers.Prereviewers

    const { formStore } = yield* KeyvStores

    const getRapidPrereviewsForAPreprint = yield* Queries.makeOnDemandQuery(GetRapidPrereviewsForAPreprint)

    const clubIds = yield* Effect.map(clubs.listClubs, Array.map(Struct.get('id')))

    return {
      getRapidPrereviewsForAPreprint: id =>
        pipe(
          getRapidPrereviewsForAPreprint(id),
          Effect.map(
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
          Effect.andThen(Effect.allWith({ concurrency: 'unbounded' })),
          Effect.catchTag('UnableToGetPersona', error => new Queries.UnableToQuery({ cause: error })),
          Effect.withSpan('PreprintReviews.getRapidPrereviewsForAPreprint', { attributes: { id } }),
        ),
      recordEmailSentToNotifyPrereviewerOfAPrereview: yield* Commands.makeStatelessCommand(
        RecordEmailSentToNotifyPrereviewerOfAPrereview,
      ),
      hasAPrereviewerBeenNotifiedOfAReview: yield* Queries.makeOnDemandQuery(HasAPrereviewerBeenNotifiedOfAReview),
      checkIfUserCanAddToAClub: CheckIfUserCanAddToAClub.CheckIfUserCanAddToAClub(formStore),
      getNextExpectedCommand: GetNextExpectedCommand.GetNextExpectedCommand(formStore),
      getUseOfAiDetails: GetUseOfAiDetails.GetUseOfAiDetails(formStore),
      addReviewToAClub: AddReviewToAClub(formStore, clubIds),
      markReviewAsNotInAClub: MarkReviewAsNotInAClub(formStore),
      declareUseOfAi: DeclareUseOfAi(formStore),
    }
  }),
)
