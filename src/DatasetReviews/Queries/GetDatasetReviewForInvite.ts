import { Array, Either, HashMap, Match, MutableHashSet, Option, pipe } from 'effect'
import type { DatasetId } from '../../Datasets/index.ts'
import type * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import { type Doi, type OrcidId, Temporal, type Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export type Input = Uuid.Uuid

export interface DatasetReviewForInvite {
  author: {
    orcidId: OrcidId.OrcidId
    persona: 'public' | 'pseudonym'
  }
  otherAuthors: ReadonlyArray<{
    orcidId: OrcidId.OrcidId
    persona: 'public' | 'pseudonym'
  }>
  anonymousAuthors: number
  doi: Doi.Doi
  id: Uuid.Uuid
  published: Temporal.PlainDate
  dataset: DatasetId
}

export type Result = Either.Either<
  DatasetReviewForInvite,
  Errors.DatasetReviewInvitationNotInList | Errors.DatasetReviewHasNotBeenPublished
>

interface State {
  readonly datasetReviewIdForInvitationIds: HashMap.HashMap<Uuid.Uuid, Uuid.Uuid>
  readonly datasetReviews: HashMap.HashMap<
    Uuid.Uuid,
    {
      authorOrcidId: OrcidId.OrcidId
      authorPersona?: 'public' | 'pseudonym'
      invitedAuthors: MutableHashSet.MutableHashSet<Uuid.Uuid>
      doi?: Doi.Doi
      published?: Temporal.PlainDate
      datasetId: DatasetId
    }
  >
}

const initialState: State = {
  datasetReviewIdForInvitationIds: HashMap.empty(),
  datasetReviews: HashMap.empty(),
}

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State => {
  const datasetReviewIdForInvitationIds = HashMap.beginMutation(state.datasetReviewIdForInvitationIds)
  const datasetReviews = HashMap.beginMutation(state.datasetReviews)

  Array.forEach(
    events,
    pipe(
      Match.type<Events.Event>(),
      Match.tag('DatasetReviewWasStarted', event => {
        HashMap.set(datasetReviews, event.datasetReviewId, {
          authorOrcidId: event.authorId,
          invitedAuthors: MutableHashSet.empty(),
          datasetId: event.datasetId,
        })
      }),
      Match.tag('PersonaForDatasetReviewWasChosen', event => {
        HashMap.modify(datasetReviews, event.datasetReviewId, datasetReview => ({
          ...datasetReview,
          authorPersona: event.persona,
        }))
      }),
      Match.tag('InvitationToAppearOnADatasetReviewAddedToTheList', event => {
        HashMap.set(datasetReviewIdForInvitationIds, event.invitationId, event.datasetReviewId)
        HashMap.modify(datasetReviews, event.datasetReviewId, datasetReview => ({
          ...datasetReview,
          invitedAuthors: MutableHashSet.add(datasetReview.invitedAuthors, event.invitationId),
        }))
      }),
      Match.tag('InvitationToAppearOnADatasetReviewRemovedFromTheList', event => {
        HashMap.remove(datasetReviewIdForInvitationIds, event.invitationId)
        HashMap.modify(datasetReviews, event.datasetReviewId, datasetReview => ({
          ...datasetReview,
          invitedAuthors: MutableHashSet.remove(datasetReview.invitedAuthors, event.invitationId),
        }))
      }),
      Match.tag('DatasetReviewWasAssignedADoi', event => {
        HashMap.modify(datasetReviews, event.datasetReviewId, datasetReview => ({
          ...datasetReview,
          doi: event.doi,
        }))
      }),
      Match.tag('DatasetReviewWasPublished', event => {
        HashMap.modify(datasetReviews, event.datasetReviewId, datasetReview => ({
          ...datasetReview,
          published:
            event.publicationDate instanceof Temporal.Instant
              ? event.publicationDate.toZonedDateTimeISO('UTC').toPlainDate()
              : event.publicationDate,
        }))
      }),
      Match.orElse(() => {
        // Do nothing
      }),
    ),
  )

  return {
    datasetReviewIdForInvitationIds: HashMap.endMutation(datasetReviewIdForInvitationIds),
    datasetReviews: HashMap.endMutation(datasetReviews),
  }
}

const query = (state: State, invitationId: Input): Result => {
  if (!HashMap.has(state.datasetReviewIdForInvitationIds, invitationId)) {
    return Either.left(new Errors.DatasetReviewInvitationNotInList())
  }

  const datasetReviewId = HashMap.get(state.datasetReviewIdForInvitationIds, invitationId)

  if (Option.isNone(datasetReviewId)) {
    return Either.left(new Errors.DatasetReviewInvitationNotInList())
  }

  const datasetReview = HashMap.get(state.datasetReviews, datasetReviewId.value)

  if (Option.isNone(datasetReview)) {
    return Either.left(new Errors.DatasetReviewHasNotBeenPublished({ cause: 'Unexpected case' }))
  }

  if (datasetReview.value.published === undefined) {
    return Either.left(new Errors.DatasetReviewHasNotBeenPublished({ cause: 'Dataset review has not been published' }))
  }

  if (typeof datasetReview.value.authorPersona !== 'string') {
    return Either.left(new Errors.DatasetReviewHasNotBeenPublished({ cause: 'Author persona is missing' }))
  }

  if (typeof datasetReview.value.doi !== 'string') {
    return Either.left(new Errors.DatasetReviewHasNotBeenPublished({ cause: 'DOI is missing' }))
  }

  return Either.right({
    author: {
      orcidId: datasetReview.value.authorOrcidId,
      persona: datasetReview.value.authorPersona,
    },
    otherAuthors: [],
    anonymousAuthors: MutableHashSet.size(datasetReview.value.invitedAuthors),
    doi: datasetReview.value.doi,
    id: datasetReviewId.value,
    published: datasetReview.value.published,
    dataset: datasetReview.value.datasetId,
  })
}

export const GetDatasetReviewForInvite: Queries.StatefulQuery<
  [Input],
  Either.Either.Right<Result>,
  Either.Either.Left<Result>,
  State
> = Queries.StatefulQuery({
  name: 'DatasetReviews.getDatasetReviewForInvite',
  initialState,
  updateStateWithEvents,
  query,
})
