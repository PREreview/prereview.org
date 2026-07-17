import { Array, Either, MutableHashMap, MutableHashSet, Option, pipe, Struct, type Types } from 'effect'
import type * as Datasets from '../../Datasets/index.ts'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import { Temporal, type Doi, type NonEmptyString, type OrcidId, type Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface PublishedReview {
  author: { orcidId: OrcidId.OrcidId; persona: 'public' | 'pseudonym' }
  otherAuthors?: Array<{ orcidId: OrcidId.OrcidId; persona: 'public' | 'pseudonym' }>
  anonymousAuthors?: number
  clubId: Option.Option<Uuid.Uuid>
  dataset: Datasets.DatasetId
  doi: Doi.Doi
  id: Uuid.Uuid
  questions: {
    qualityRating: Option.Option<{
      rating: 'excellent' | 'fair' | 'poor' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetFollowsFairAndCarePrinciples: {
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }
    answerToIfTheDatasetHasEnoughMetadata: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetHasTrackedChanges: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetSupportsRelatedConclusions: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsDetailedEnough: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsErrorFree: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetMattersToItsAudience: Option.Option<{
      answer: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsReadyToBeShared: Option.Option<{
      answer: 'yes' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsMissingAnything: Option.Option<NonEmptyString.NonEmptyString>
  }
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  published: Temporal.PlainDate
}

export type Input = Uuid.Uuid

export type Error =
  Errors.DatasetReviewHasNotBeenPublished | Errors.UnknownDatasetReview | Queries.UnexpectedSequenceOfEvents

export type Result = Either.Either<PublishedReview, Error>

const createFilter = (datasetReviewId: Input) =>
  Events.EventFilter([
    {
      types: Events.DatasetReviewEventTypes,
      predicates: { datasetReviewId },
    },
    {
      types: ['AuthorInviteAccepted', 'PersonaForAReviewChosen', 'AuthorChoicesForAReviewConfirmed'],
      predicates: { reviewId: datasetReviewId },
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result => {
  const filter = createFilter(input)

  const filteredEvents = Array.filter(events, Events.matches(filter))

  const started = Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted'))

  if (Option.isNone(started)) {
    return Either.left(new Errors.UnknownDatasetReview({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (!hasEvent(filteredEvents, 'DatasetReviewWasPublished')) {
    return Either.left(
      new Errors.DatasetReviewHasNotBeenPublished({ cause: 'No DatasetReviewWasPublished event found' }),
    )
  }

  const data = Option.all({
    answerToIfTheDatasetFollowsFairAndCarePrinciples: Array.findLast(
      filteredEvents,
      hasTag('AnsweredIfTheDatasetFollowsFairAndCarePrinciples'),
    ),
    datasetReviewWasAssignedADoi: Array.findLast(filteredEvents, hasTag('DatasetReviewWasAssignedADoi')),
    datasetReviewWasPublished: Array.findLast(filteredEvents, hasTag('DatasetReviewWasPublished')),
    datasetReviewWasStarted: Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')),
  })

  const author = Array.findLast(filteredEvents, hasTag('PersonaForDatasetReviewWasChosen'))

  const ratedTheQualityOfTheDataset = Array.findLast(filteredEvents, hasTag('RatedTheQualityOfTheDataset'))

  const answerToIfTheDatasetHasEnoughMetadata = Array.findLast(
    filteredEvents,
    hasTag('AnsweredIfTheDatasetHasEnoughMetadata'),
  )

  const answerToIfTheDatasetHasTrackedChanges = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetHasTrackedChanges')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetHasDataCensoredOrDeleted = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetHasDataCensoredOrDeleted')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsAppropriateForThisKindOfResearch = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetSupportsRelatedConclusions = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetSupportsRelatedConclusions')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsDetailedEnough = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetIsDetailedEnough')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsErrorFree = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetIsErrorFree')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetMattersToItsAudience = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetMattersToItsAudience')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsReadyToBeShared = Option.map(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetIsReadyToBeShared')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsMissingAnything = Option.andThen(
    Array.findLast(filteredEvents, hasTag('AnsweredIfTheDatasetIsMissingAnything')),
    Struct.get('answer'),
  )

  const competingInterests = Option.andThen(
    Array.findLast(filteredEvents, hasTag('CompetingInterestsForADatasetReviewWereDeclared')),
    Struct.get('competingInterests'),
  )

  const clubId = Option.andThen(
    Array.findLast(filteredEvents, hasTag('DatasetReviewWasAddedToAClub')),
    Struct.get('clubId'),
  )

  const includeOtherAuthors = Array.some(filteredEvents, hasTag('AnsweredIfOthersNeedToBeListedOnTheReview'))

  const invitations = MutableHashSet.fromIterable(
    Array.filterMap(filteredEvents, event =>
      event._tag === 'InvitationToAppearOnADatasetReviewAddedToTheList'
        ? Option.some(event.invitationId)
        : Option.none(),
    ),
  )

  Array.forEach(filteredEvents, event => {
    if (event._tag !== 'InvitationToAppearOnADatasetReviewRemovedFromTheList') {
      return
    }

    MutableHashSet.remove(invitations, event.invitationId)
  })

  const namedAuthors = MutableHashMap.empty<
    OrcidId.OrcidId,
    { persona?: 'public' | 'pseudonym'; confirmedAt?: Temporal.Instant }
  >()

  Array.forEach(filteredEvents, event => {
    if (event._tag === 'AuthorInviteAccepted') {
      MutableHashSet.remove(invitations, event.invitationId)

      if (event.orcidId === started.value.authorId || MutableHashMap.has(namedAuthors, event.orcidId)) {
        return
      }

      return MutableHashMap.set(namedAuthors, event.orcidId, {})
    }

    if (event._tag === 'PersonaForAReviewChosen') {
      return MutableHashMap.modify(namedAuthors, event.orcidId, details => ({ ...details, persona: event.persona }))
    }

    if (event._tag === 'AuthorChoicesForAReviewConfirmed') {
      return MutableHashMap.modify(namedAuthors, event.orcidId, details => ({
        ...details,
        confirmedAt: event.confirmedAt,
      }))
    }
  })

  const confirmedAuthors = Array.filterMap([...namedAuthors], ([orcidId, { persona, confirmedAt }]) =>
    typeof persona === 'string' && typeof confirmedAt !== 'undefined'
      ? Option.some({ orcidId, persona, confirmedAt })
      : Option.none(),
  )

  const otherAuthors = pipe(
    Array.sortWith(confirmedAuthors, Struct.get('confirmedAt'), Temporal.OrderInstant),
    Array.map(Struct.pick('orcidId', 'persona')),
  )

  const anonymousAuthors =
    MutableHashSet.size(invitations) + (MutableHashMap.size(namedAuthors) - Array.length(otherAuthors))

  return Option.match(data, {
    onNone: () => Either.left(new Queries.UnexpectedSequenceOfEvents({})),
    onSome: data =>
      Either.right({
        author: {
          orcidId: data.datasetReviewWasStarted.authorId,
          persona: Option.match(author, { onSome: Struct.get('persona'), onNone: () => 'public' }),
        },
        otherAuthors: includeOtherAuthors ? otherAuthors : undefined,
        anonymousAuthors: includeOtherAuthors ? anonymousAuthors : undefined,
        clubId,
        dataset: data.datasetReviewWasStarted.datasetId,
        doi: data.datasetReviewWasAssignedADoi.doi,
        id: data.datasetReviewWasStarted.datasetReviewId,
        questions: {
          qualityRating: Option.andThen(ratedTheQualityOfTheDataset, Struct.pick('rating', 'detail')),
          answerToIfTheDatasetFollowsFairAndCarePrinciples: Struct.pick(
            data.answerToIfTheDatasetFollowsFairAndCarePrinciples,
            'answer',
            'detail',
          ),
          answerToIfTheDatasetHasEnoughMetadata: Option.andThen(
            answerToIfTheDatasetHasEnoughMetadata,
            Struct.pick('answer', 'detail'),
          ),
          answerToIfTheDatasetHasTrackedChanges,
          answerToIfTheDatasetHasDataCensoredOrDeleted,
          answerToIfTheDatasetIsAppropriateForThisKindOfResearch,
          answerToIfTheDatasetSupportsRelatedConclusions,
          answerToIfTheDatasetIsDetailedEnough,
          answerToIfTheDatasetIsErrorFree,
          answerToIfTheDatasetMattersToItsAudience,
          answerToIfTheDatasetIsReadyToBeShared,
          answerToIfTheDatasetIsMissingAnything,
        },
        competingInterests,
        published:
          data.datasetReviewWasPublished.publicationDate instanceof Temporal.Instant
            ? data.datasetReviewWasPublished.publicationDate.toZonedDateTimeISO('UTC').toPlainDate()
            : data.datasetReviewWasPublished.publicationDate,
      }),
  })
}

export const GetPublishedReview = Queries.OnDemandQuery({
  name: 'DatasetReviewQueries.getPublishedReview',
  createFilter,
  query,
})

function hasEvent(events: ReadonlyArray<Events.Event>, tag: Types.Tags<Events.Event>): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
