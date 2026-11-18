import { FetchHttpClient } from 'effect/http'
import { Array, Context, Effect, flow, type Result, Layer, Option, pipe, Redacted, Scope, Struct } from 'effect'
import { Clubs } from '../Clubs/index.ts'
import * as Commands from '../../Commands.ts'
import { MakeDeprecatedLoggerEnv } from '../../DeprecatedServices.ts'
import { Zenodo } from '../../ExternalApis/index.ts'
import { ZenodoRecords } from '../../ExternalInteractions/index.ts'
import { FeatureFlags } from '../../FeatureFlags.ts'
import type { IndeterminatePreprintId, PreprintId, Preprints } from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import * as Queries from '../../Queries.ts'
import { EffectToFpts, FptsToEffect } from '../../RefactoringUtilities/index.ts'
import { AddReviewToAClub } from './AddReviewToAClub.ts'
import * as Errors from './Errors.ts'
import {
  GetPublishedPreprintReview,
  type PrereviewIsNotFound,
  type PrereviewIsUnavailable,
  type PrereviewWasRemoved,
} from './GetPublishedPreprintReview/index.ts'
import { GetAllPublishedPreprintReviews } from './GetAllPublishedPreprintReviews/index.ts'
import {
  GetAllPublishedPreprintReviewsForSciety,
  type PublishedPreprintReviewForSciety,
} from './GetAllPublishedPreprintReviewsForSciety/index.ts'
import {
  GetAllPublishedPreprintReviewsForReviewsData,
  type PublishedPreprintReviewForReviewsData,
} from './GetAllPublishedPreprintReviewsForReviewsData/index.ts'
import { GetPublishedPreprintReviewsForAPreprint } from './GetPublishedPreprintReviewsForAPreprint/index.ts'
import * as FormStore from './FormStore.ts'
import * as CheckIfUserCanAddToAClub from './CheckIfUserCanAddToAClub.ts'
import { DeclareUseOfAi } from './DeclareUseOfAi.ts'
import * as GetNextExpectedCommand from './GetNextExpectedCommand.ts'
import { GetRapidPrereviewsForAPreprint, type RapidPrereviewForAPreprint } from './GetRapidPrereviewsForAPreprint.ts'
import * as GetUseOfAiDetails from './GetUseOfAiDetails.ts'
import { HasAPrereviewerBeenNotifiedOfAReview } from './HasAPrereviewerBeenNotifiedOfAReview.ts'
import { MarkReviewAsNotInAClub } from './MarkReviewAsNotInAClub.ts'
import { RecordEmailSentToNotifyPrereviewerOfAPrereview } from './RecordEmailSentToNotifyPrereviewerOfAPrereview.ts'
import { ImportPreprintReview } from './ImportPreprintReview.ts'
import { WasPrereviewRemoved } from './WasPrereviewRemoved.ts'
import { fromPublishedPreprintReview, toPreprintPrereview } from './FromPublishedPreprintReview.ts'
import type { PreprintPrereview, Prereview } from './Prereview.ts'

export interface RapidPrereview {
  readonly author: Prereviewers.Persona
  readonly questions: Omit<
    RapidPrereviewForAPreprint['questions'],
    'dataLink' | 'technicalComments' | 'editorialComments'
  >
}

export class PreprintReviews extends Context.Service<
  PreprintReviews,
  {
    getAllPublishedPreprintReviews: Effect.Effect<ReadonlyArray<Prereview>, Errors.PrereviewsAreUnavailable>
    getAllPublishedPreprintReviewsForReviewsData: Effect.Effect<
      ReadonlyArray<PublishedPreprintReviewForReviewsData>,
      Errors.PrereviewsAreUnavailable
    >
    getAllPublishedPreprintReviewsForSciety: Effect.Effect<
      ReadonlyArray<PublishedPreprintReviewForSciety>,
      Errors.PrereviewsAreUnavailable
    >
    getForPreprint: (id: PreprintId) => Effect.Effect<ReadonlyArray<PreprintPrereview>, Errors.PrereviewsAreUnavailable>
    getPreprintReview: (
      id: number,
    ) => Effect.Effect<Prereview, PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved>
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
      Result.Result.Success<CheckIfUserCanAddToAClub.Result>,
      Result.Result.Failure<CheckIfUserCanAddToAClub.Result> | Queries.UnableToQuery
    >
    getNextExpectedCommand: (
      input: GetNextExpectedCommand.Input,
    ) => Effect.Effect<
      Result.Result.Success<GetNextExpectedCommand.Result>,
      Result.Result.Failure<GetNextExpectedCommand.Result> | Queries.UnableToQuery
    >
    getUseOfAiDetails: (
      input: GetUseOfAiDetails.Input,
    ) => Effect.Effect<
      Result.Result.Success<GetUseOfAiDetails.Result>,
      Result.Result.Failure<GetUseOfAiDetails.Result> | Queries.UnableToQuery
    >
    addReviewToAClub: ReturnType<typeof AddReviewToAClub>
    markReviewAsNotInAClub: ReturnType<typeof MarkReviewAsNotInAClub>
    declareUseOfAi: ReturnType<typeof DeclareUseOfAi>
    importPreprintReview: Commands.FromCommand<typeof ImportPreprintReview>
  }
>()('PreprintReviews') {
  static readonly getAllPublishedPreprintReviews = Effect.suspend(() =>
    PreprintReviews.use(service => service.getAllPublishedPreprintReviews),
  )

  static readonly getAllPublishedPreprintReviewsForReviewsData = Effect.suspend(() =>
    PreprintReviews.use(service => service.getAllPublishedPreprintReviewsForReviewsData),
  )

  static readonly getAllPublishedPreprintReviewsForSciety = Effect.suspend(() =>
    PreprintReviews.use(service => service.getAllPublishedPreprintReviewsForSciety),
  )
}

export const getForPreprint = (...args: Parameters<(typeof PreprintReviews.Service)['getForPreprint']>) =>
  PreprintReviews.use(service => service.getForPreprint(...args))

export const getPreprintReview = (...args: Parameters<(typeof PreprintReviews.Service)['getPreprintReview']>) =>
  PreprintReviews.use(service => service.getPreprintReview(...args))

export const getRapidPrereviewsForAPreprint = (
  ...args: Parameters<(typeof PreprintReviews.Service)['getRapidPrereviewsForAPreprint']>
) => PreprintReviews.use(service => service.getRapidPrereviewsForAPreprint(...args))

export const recordEmailSentToNotifyPrereviewerOfAPrereview = (
  ...args: Parameters<(typeof PreprintReviews.Service)['recordEmailSentToNotifyPrereviewerOfAPrereview']>
) => PreprintReviews.use(service => service.recordEmailSentToNotifyPrereviewerOfAPrereview(...args))

export const hasAPrereviewerBeenNotifiedOfAReview = (
  ...args: Parameters<(typeof PreprintReviews.Service)['hasAPrereviewerBeenNotifiedOfAReview']>
) => PreprintReviews.use(service => service.hasAPrereviewerBeenNotifiedOfAReview(...args))

export const checkIfUserCanAddToAClub = (
  ...args: Parameters<(typeof PreprintReviews.Service)['checkIfUserCanAddToAClub']>
) => PreprintReviews.use(service => service.checkIfUserCanAddToAClub(...args))

export const getNextExpectedCommand = (
  ...args: Parameters<(typeof PreprintReviews.Service)['getNextExpectedCommand']>
) => PreprintReviews.use(service => service.getNextExpectedCommand(...args))

export const getUseOfAiDetails = (...args: Parameters<(typeof PreprintReviews.Service)['getUseOfAiDetails']>) =>
  PreprintReviews.use(service => service.getUseOfAiDetails(...args))

export const layer = Layer.effect(
  PreprintReviews,
  Effect.gen(function* () {
    const clubs = yield* Clubs
    const personas = yield* Prereviewers.Prereviewers

    const formStore = yield* FormStore.Store

    const getRapidPrereviewsForAPreprint = yield* Queries.makeOnDemandQuery(GetRapidPrereviewsForAPreprint)

    const clubIds = yield* Effect.map(clubs.listClubs, Array.map(Struct.get('id')))

    const context = yield* Effect.map(
      Effect.context<Clubs | Prereviewers.Prereviewers | Preprints>(),
      Context.omit(Scope.Scope),
    )
    const featureFlags = yield* FeatureFlags
    const wasPrereviewRemoved = yield* WasPrereviewRemoved
    const fetch = yield* FetchHttpClient.Fetch
    const zenodoApi = yield* Zenodo.ZenodoApi

    const getClubByName = yield* EffectToFpts.makeTaskK(
      flow(
        clubs.getClubByName,
        Effect.map(Option.some),
        Effect.catchTag('ClubNotFound', () => Effect.succeedNone),
      ),
    )

    const getPublishedPreprintReview = yield* GetPublishedPreprintReview

    const getPreprintReview = flow(getPublishedPreprintReview, Effect.map(fromPublishedPreprintReview))

    const getForPreprint = flow(
      yield* GetPublishedPreprintReviewsForAPreprint(getPublishedPreprintReview),
      Effect.map(Array.map(toPreprintPrereview)),
    )

    const getAllPublishedPreprintReviews = Effect.map(
      yield* GetAllPublishedPreprintReviews(getPublishedPreprintReview),
      Array.map(fromPublishedPreprintReview),
    )

    const getAllPublishedPreprintReviewsForReviewsData = yield* GetAllPublishedPreprintReviewsForReviewsData

    const getAllPublishedPreprintReviewsForSciety = yield* GetAllPublishedPreprintReviewsForSciety

    const getPreprintReviewFromZenodo = Effect.fn('PreprintReviews.getPreprintReviewFromZenodo')(function* (
      id: number,
    ) {
      yield* Effect.annotateCurrentSpan({ id })

      const loggerEnv = yield* MakeDeprecatedLoggerEnv

      const runtime = yield* Effect.context<Preprints>()

      return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewFromZenodo(id), {
        fetch,
        getClubByName,
        runtime,
        wasPrereviewRemoved,
        zenodoApiKey: Redacted.value(zenodoApi.key),
        zenodoUrl: zenodoApi.origin,
        ...loggerEnv,
      })
    }, Effect.provide(context))

    const getForPreprintFromZenodo = Effect.fn('PreprintReviews.getForPreprint')(
      function* (id: PreprintId) {
        yield* Effect.annotateCurrentSpan({ id })

        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(ZenodoRecords.getPrereviewsForPreprintFromZenodo(id), {
          fetch,
          getClubByName,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          ...loggerEnv,
        })
      },
      Effect.mapError(() => new Errors.PrereviewsAreUnavailable()),
    )

    return {
      getAllPublishedPreprintReviews: featureFlags.useEventsForPreprintReviews
        ? getAllPublishedPreprintReviews
        : Effect.die('Not implemented with Zenodo'),
      getAllPublishedPreprintReviewsForReviewsData: featureFlags.useEventsForPreprintReviews
        ? getAllPublishedPreprintReviewsForReviewsData
        : Effect.die('Not implemented with Zenodo'),
      getAllPublishedPreprintReviewsForSciety: featureFlags.useEventsForPreprintReviews
        ? getAllPublishedPreprintReviewsForSciety
        : Effect.die('Not implemented with Zenodo'),
      getForPreprint: featureFlags.useEventsForPreprintReviews ? getForPreprint : getForPreprintFromZenodo,
      getPreprintReview: featureFlags.useEventsForPreprintReviews ? getPreprintReview : getPreprintReviewFromZenodo,
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
          Effect.andThen(effects => Effect.all(effects, { concurrency: 'unbounded' })),
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
      importPreprintReview: yield* Commands.makeCommand(ImportPreprintReview),
    }
  }),
)
