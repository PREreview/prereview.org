import { Array, Schema, Struct } from 'effect'
import * as Datasets from '../Datasets/index.ts'
import { SensitiveData } from '../SensitiveData.ts'
import { Doi, EmailAddress, Name, NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'

export type DatasetReviewEvent = typeof DatasetReviewEvent.Type

export class DatasetReviewWasStarted extends Schema.TaggedClass<DatasetReviewWasStarted>()('DatasetReviewWasStarted', {
  authorId: OrcidId.OrcidIdSchema,
  datasetId: Datasets.DatasetIdFromString,
  datasetReviewId: Uuid.UuidSchema,
}) {}

export class RatedTheQualityOfTheDataset extends Schema.TaggedClass<RatedTheQualityOfTheDataset>()(
  'RatedTheQualityOfTheDataset',
  {
    rating: Schema.Literal('excellent', 'fair', 'poor', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetFollowsFairAndCarePrinciples extends Schema.TaggedClass<AnsweredIfTheDatasetFollowsFairAndCarePrinciples>()(
  'AnsweredIfTheDatasetFollowsFairAndCarePrinciples',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetHasEnoughMetadata extends Schema.TaggedClass<AnsweredIfTheDatasetHasEnoughMetadata>()(
  'AnsweredIfTheDatasetHasEnoughMetadata',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetHasTrackedChanges extends Schema.TaggedClass<AnsweredIfTheDatasetHasTrackedChanges>()(
  'AnsweredIfTheDatasetHasTrackedChanges',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetHasDataCensoredOrDeleted extends Schema.TaggedClass<AnsweredIfTheDatasetHasDataCensoredOrDeleted>()(
  'AnsweredIfTheDatasetHasDataCensoredOrDeleted',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch extends Schema.TaggedClass<AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch>()(
  'AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetSupportsRelatedConclusions extends Schema.TaggedClass<AnsweredIfTheDatasetSupportsRelatedConclusions>()(
  'AnsweredIfTheDatasetSupportsRelatedConclusions',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetIsErrorFree extends Schema.TaggedClass<AnsweredIfTheDatasetIsErrorFree>()(
  'AnsweredIfTheDatasetIsErrorFree',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetIsDetailedEnough extends Schema.TaggedClass<AnsweredIfTheDatasetIsDetailedEnough>()(
  'AnsweredIfTheDatasetIsDetailedEnough',
  {
    answer: Schema.Literal('yes', 'partly', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetMattersToItsAudience extends Schema.TaggedClass<AnsweredIfTheDatasetMattersToItsAudience>()(
  'AnsweredIfTheDatasetMattersToItsAudience',
  {
    answer: Schema.Literal('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetIsReadyToBeShared extends Schema.TaggedClass<AnsweredIfTheDatasetIsReadyToBeShared>()(
  'AnsweredIfTheDatasetIsReadyToBeShared',
  {
    answer: Schema.Literal('yes', 'no', 'unsure'),
    detail: Schema.OptionFromUndefinedOr(NonEmptyString.NonEmptyStringSchema),
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class AnsweredIfTheDatasetIsMissingAnything extends Schema.TaggedClass<AnsweredIfTheDatasetIsMissingAnything>()(
  'AnsweredIfTheDatasetIsMissingAnything',
  { answer: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema), datasetReviewId: Uuid.UuidSchema },
) {}

export class DeclaredThatTheCodeOfConductWasFollowedForADatasetReview extends Schema.TaggedClass<DeclaredThatTheCodeOfConductWasFollowedForADatasetReview>()(
  'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview',
  {
    datasetReviewId: Uuid.UuidSchema,
    timestamp: Temporal.InstantSchema,
  },
) {}

export class PersonaForDatasetReviewWasChosen extends Schema.TaggedClass<PersonaForDatasetReviewWasChosen>()(
  'PersonaForDatasetReviewWasChosen',
  {
    datasetReviewId: Uuid.UuidSchema,
    persona: Schema.Literal('public', 'pseudonym'),
  },
) {}

export class AnsweredIfOthersNeedToBeListedOnTheReview extends Schema.TaggedClass<AnsweredIfOthersNeedToBeListedOnTheReview>()(
  'AnsweredIfOthersNeedToBeListedOnTheReview',
  {
    datasetReviewId: Uuid.UuidSchema,
    answer: Schema.Literal('no', 'yes'),
  },
) {}

export class InvitationToAppearOnADatasetReviewAddedToTheList extends Schema.TaggedClass<InvitationToAppearOnADatasetReviewAddedToTheList>()(
  'InvitationToAppearOnADatasetReviewAddedToTheList',
  {
    datasetReviewId: Uuid.UuidSchema,
    invitationId: Uuid.UuidSchema,
    contactDetails: SensitiveData(
      Schema.Struct({
        name: Name.NameSchema,
        emailAddress: EmailAddress.EmailAddressSchema,
      }),
    ),
  },
) {}

export class InvitationToAppearOnADatasetReviewRemovedFromTheList extends Schema.TaggedClass<InvitationToAppearOnADatasetReviewRemovedFromTheList>()(
  'InvitationToAppearOnADatasetReviewRemovedFromTheList',
  {
    datasetReviewId: Uuid.UuidSchema,
    invitationId: Uuid.UuidSchema,
  },
) {}

export class CompetingInterestsForADatasetReviewWereDeclared extends Schema.TaggedClass<CompetingInterestsForADatasetReviewWereDeclared>()(
  'CompetingInterestsForADatasetReviewWereDeclared',
  {
    datasetReviewId: Uuid.UuidSchema,
    competingInterests: Schema.OptionFromNullOr(NonEmptyString.NonEmptyStringSchema),
  },
) {}

export class PublicationOfDatasetReviewWasRequested extends Schema.TaggedClass<PublicationOfDatasetReviewWasRequested>()(
  'PublicationOfDatasetReviewWasRequested',
  { datasetReviewId: Uuid.UuidSchema, requestedAt: Schema.optional(Temporal.InstantSchema) },
) {}

export class ZenodoRecordForDatasetReviewWasCreated extends Schema.TaggedClass<ZenodoRecordForDatasetReviewWasCreated>()(
  'ZenodoRecordForDatasetReviewWasCreated',
  {
    recordId: Schema.Number,
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class DatasetReviewWasAssignedADoi extends Schema.TaggedClass<DatasetReviewWasAssignedADoi>()(
  'DatasetReviewWasAssignedADoi',
  {
    doi: Doi.DoiSchema,
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class DatasetReviewWasAddedToAClub extends Schema.TaggedClass<DatasetReviewWasAddedToAClub>()(
  'DatasetReviewWasAddedToAClub',
  {
    clubId: Uuid.UuidSchema,
    datasetReviewId: Uuid.UuidSchema,
  },
) {}

export class DatasetReviewWasPublished extends Schema.TaggedClass<DatasetReviewWasPublished>()(
  'DatasetReviewWasPublished',
  { datasetReviewId: Uuid.UuidSchema, publicationDate: Schema.Union(Temporal.InstantSchema, Temporal.PlainDateSchema) },
) {}

export class ZenodoRecordForDatasetReviewWasPublished extends Schema.TaggedClass<ZenodoRecordForDatasetReviewWasPublished>()(
  'ZenodoRecordForDatasetReviewWasPublished',
  { datasetReviewId: Uuid.UuidSchema },
) {}

export class DatasetReviewDoiWasActivated extends Schema.TaggedClass<DatasetReviewDoiWasActivated>()(
  'DatasetReviewDoiWasActivated',
  { datasetReviewId: Uuid.UuidSchema },
) {}

export const DatasetReviewEvent = Schema.Union(
  DatasetReviewWasStarted,
  RatedTheQualityOfTheDataset,
  AnsweredIfTheDatasetFollowsFairAndCarePrinciples,
  AnsweredIfTheDatasetHasEnoughMetadata,
  AnsweredIfTheDatasetHasTrackedChanges,
  AnsweredIfTheDatasetHasDataCensoredOrDeleted,
  AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch,
  AnsweredIfTheDatasetSupportsRelatedConclusions,
  AnsweredIfTheDatasetIsDetailedEnough,
  AnsweredIfTheDatasetMattersToItsAudience,
  AnsweredIfTheDatasetIsErrorFree,
  AnsweredIfTheDatasetIsReadyToBeShared,
  AnsweredIfTheDatasetIsMissingAnything,
  PublicationOfDatasetReviewWasRequested,
  ZenodoRecordForDatasetReviewWasCreated,
  DeclaredThatTheCodeOfConductWasFollowedForADatasetReview,
  PersonaForDatasetReviewWasChosen,
  AnsweredIfOthersNeedToBeListedOnTheReview,
  InvitationToAppearOnADatasetReviewAddedToTheList,
  InvitationToAppearOnADatasetReviewRemovedFromTheList,
  CompetingInterestsForADatasetReviewWereDeclared,
  DatasetReviewWasAssignedADoi,
  DatasetReviewWasAddedToAClub,
  DatasetReviewWasPublished,
  ZenodoRecordForDatasetReviewWasPublished,
  DatasetReviewDoiWasActivated,
)

export const DatasetReviewEventTypes = Array.map(DatasetReviewEvent.members, Struct.get('_tag'))
