import { expect, test } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option } from 'effect'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/DatasetReviews/Queries/GetDatasetReviewForInvite.ts'
import { DryadDatasetId } from '../../../src/Datasets/index.ts'
import * as Events from '../../../src/Events.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Uuid } from '../../../src/types/Uuid.ts'

const input: _.Input = Uuid('2742d27a-e9cc-4794-8269-7f42581c3b93')

const inputWithOtherInvitationId: _.Input = Uuid('27e67c27-ab7a-4fd8-b1fe-162e8ad5caa4')

const datasetReviewId = Uuid('491f661c-fd27-41ce-81c4-7bff3c6129c3')

const authorAdded = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: input,
  contactDetails: Option.none(),
})

const authorRemoved = new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId,
  invitationId: authorAdded.invitationId,
})

const anonymousAuthorAdded = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid('a3878fb9-3851-4a90-a05e-4c9bfca57c62'),
  contactDetails: Option.none(),
})

const secondAnonymousAuthorAdded = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid('d5eaaca7-0b32-4a6c-b17e-a77be4714074'),
  contactDetails: Option.none(),
})

const secondAnonymousAuthorRemoved = new Events.InvitationToAppearOnADatasetReviewRemovedFromTheList({
  datasetReviewId,
  invitationId: secondAnonymousAuthorAdded.invitationId,
})

const incompleteAcceptedAuthorAdded = new Events.InvitationToAppearOnADatasetReviewAddedToTheList({
  datasetReviewId,
  invitationId: Uuid('3f4ca554-d111-43fd-acdf-68e98067a1d3'),
  contactDetails: Option.none(),
})

const incompleteAcceptedAuthorAccepted = new Events.AuthorInviteAccepted({
  invitationId: incompleteAcceptedAuthorAdded.invitationId,
  orcidId: OrcidId('0000-0002-6109-0367'),
  reviewId: datasetReviewId,
  acceptedAt: Temporal.Now.instant(),
})

const incompleteAcceptedAuthorPersona = new Events.PersonaForAReviewChosen({
  reviewId: datasetReviewId,
  orcidId: incompleteAcceptedAuthorAccepted.orcidId,
  persona: 'public',
})

const started = new DatasetReviews.DatasetReviewWasStarted({
  datasetReviewId,
  authorId: OrcidId('0000-0002-1825-0097'),
  datasetId: new DryadDatasetId({ value: Doi('10.5061/dryad.12345') }),
})

const persona = new DatasetReviews.PersonaForDatasetReviewWasChosen({
  datasetReviewId,
  persona: 'public',
})

const doi = new DatasetReviews.DatasetReviewWasAssignedADoi({
  doi: Doi('10.1000/12345'),
  datasetReviewId,
})

const publication = new Events.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.Now.plainDateISO(),
})

test.each<[string, ReadonlyArray<Events.Event>, _.Input, _.Result]>([
  ['no events', [], input, Either.left(new DatasetReviews.DatasetReviewInvitationNotInList())],
  [
    'invitation ID not in list',
    [started, authorAdded],
    inputWithOtherInvitationId,
    Either.left(new DatasetReviews.DatasetReviewInvitationNotInList()),
  ],
  [
    'review not published',
    [started, authorAdded],
    input,
    Either.left(new DatasetReviews.DatasetReviewHasNotBeenPublished({})),
  ],
  [
    'review has published event, but details missing',
    [started, authorAdded, publication],
    input,
    Either.left(new DatasetReviews.DatasetReviewHasNotBeenPublished({})),
  ],
  [
    'review published, only author added',
    [started, persona, authorAdded, doi, publication],
    input,
    Either.right({
      author: {
        orcidId: started.authorId,
        persona: persona.persona,
      },
      otherAuthors: [],
      anonymousAuthors: 1,
      doi: doi.doi,
      id: datasetReviewId,
      published: publication.publicationDate,
      dataset: started.datasetId,
    }),
  ],
  [
    'review published, only author added and removed',
    [started, persona, authorAdded, authorRemoved, doi, publication],
    input,
    Either.left(new DatasetReviews.DatasetReviewInvitationNotInList()),
  ],
  [
    'review published, other authors added',
    [
      started,
      persona,
      authorAdded,
      anonymousAuthorAdded,
      secondAnonymousAuthorAdded,
      secondAnonymousAuthorRemoved,
      incompleteAcceptedAuthorAdded,
      incompleteAcceptedAuthorAccepted,
      incompleteAcceptedAuthorPersona,
      doi,
      publication,
    ],
    input,
    Either.right({
      author: {
        orcidId: started.authorId,
        persona: persona.persona,
      },
      otherAuthors: [],
      anonymousAuthors: 3,
      doi: doi.doi,
      id: datasetReviewId,
      published: publication.publicationDate,
      dataset: started.datasetId,
    }),
  ],
])('%s', (_name, events, input, expected) => {
  const { initialState, updateStateWithEvents, query } = _.GetDatasetReviewForInvite

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})
