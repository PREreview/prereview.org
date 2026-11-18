import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Datasets from '../../../../src/Domain/Datasets/index.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/Prereviews/GetPrereviewsForProfile/ListProfilePrereviewIds.ts'
import * as Events from '../../../../src/Events.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

const orcidId = OrcidId.OrcidId('0000-0002-1825-0097')
const otherOrcidId = OrcidId.OrcidId('0000-0002-6109-0367')

const preprintReviewImported = ({
  id,
  published,
  authors,
}: {
  id: number
  published: Temporal.Instant | Temporal.PlainDate
  authors: Events.PreprintReviewImported['authors']
}) =>
  new Events.PreprintReviewImported({
    authors,
    otherAuthors: 0,
    doi: Doi.Doi(`10.5281/zenodo.${id}`),
    id,
    license: 'CC-BY-4.0',
    published,
    preprint: new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') }),
    live: false,
    useOfAi: { _tag: 'No' },
    competingInterests: { _tag: 'No' },
    language: 'en',
    content: { _tag: 'Full', text: html`<p>Hello</p>` },
    topics: [],
  })

const publicPersona = (orcidId: OrcidId.OrcidId) => ({ _tag: 'PublicPersona', name: Option.none(), orcidId }) as const

const pseudonymPersona = (orcidId: OrcidId.OrcidId) => ({ _tag: 'PseudonymPersona', orcidId }) as const

const unknownAuthor = { _tag: 'Unknown', name: Option.none() } as const

const authorChoicesForAReviewImported = (reviewId: number, orcidId: OrcidId.OrcidId, persona: 'public' | 'pseudonym') =>
  new Events.AuthorChoicesForAReviewImported({
    reviewId,
    orcidId,
    persona,
    confirmedAt: Temporal.Instant.from('2026-11-10T09:00:00Z'),
  })

const datasetReviewId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })
const invitationId = Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a')

const datasetReviewWasStarted = (authorId: OrcidId.OrcidId) =>
  new Events.DatasetReviewWasStarted({ authorId, datasetId, datasetReviewId })

const personaForDatasetReviewWasChosen = (persona: 'public' | 'pseudonym') =>
  new Events.PersonaForDatasetReviewWasChosen({ datasetReviewId, persona })

const answeredIfOthersNeedToBeListedOnTheReview = new Events.AnsweredIfOthersNeedToBeListedOnTheReview({
  datasetReviewId,
  answer: 'yes',
})

const authorInviteAccepted = (orcidId: OrcidId.OrcidId) =>
  new Events.AuthorInviteAccepted({
    invitationId,
    reviewId: datasetReviewId,
    orcidId,
    acceptedAt: Temporal.Instant.from('2026-11-01T12:00:00Z'),
  })

const personaForAReviewChosen = (orcidId: OrcidId.OrcidId, persona: 'public' | 'pseudonym') =>
  new Events.PersonaForAReviewChosen({ reviewId: datasetReviewId, orcidId, persona })

const authorChoicesForAReviewConfirmed = (orcidId: OrcidId.OrcidId) =>
  new Events.AuthorChoicesForAReviewConfirmed({
    reviewId: datasetReviewId,
    orcidId,
    confirmedAt: Temporal.Instant.from('2026-11-01T13:00:00Z'),
  })

const datasetReviewWasPublished = new Events.DatasetReviewWasPublished({
  datasetReviewId,
  publicationDate: Temporal.Instant.from('2026-11-02T12:00:00Z'),
})

const coAuthoredDatasetReview = (persona: 'public' | 'pseudonym') => [
  datasetReviewWasStarted(otherOrcidId),
  answeredIfOthersNeedToBeListedOnTheReview,
  authorInviteAccepted(orcidId),
  personaForAReviewChosen(orcidId, persona),
  authorChoicesForAReviewConfirmed(orcidId),
  datasetReviewWasPublished,
]

const reviews = Array.make(
  preprintReviewImported({
    id: 1,
    published: Temporal.Instant.from('2026-11-01T09:00:00Z'),
    authors: [publicPersona(orcidId)],
  }),
  preprintReviewImported({
    id: 2,
    published: Temporal.PlainDate.from('2026-11-02'),
    authors: [pseudonymPersona(orcidId)],
  }),
  preprintReviewImported({
    id: 3,
    published: Temporal.Instant.from('2026-11-03T09:00:00Z'),
    authors: [publicPersona(otherOrcidId), unknownAuthor],
  }),
  preprintReviewImported({
    id: 4,
    published: Temporal.Instant.from('2026-11-04T09:00:00Z'),
    authors: [pseudonymPersona(otherOrcidId), publicPersona(orcidId)],
  }),
)

test.each<[string, ReadonlyArray<Events.Event>, _.Input, _.Result]>([
  ['no events', [], { orcidId, persona: 'public' }, []],
  [
    'only their public reviews',
    reviews,
    { orcidId, persona: 'public' },
    [_.ProfilePrereviewId.PreprintReview({ id: 4 }), _.ProfilePrereviewId.PreprintReview({ id: 1 })],
  ],
  [
    'only their pseudonymous reviews',
    reviews,
    { orcidId, persona: 'pseudonym' },
    [_.ProfilePrereviewId.PreprintReview({ id: 2 })],
  ],
  [
    'a review they were invited to',
    [...reviews, authorChoicesForAReviewImported(3, orcidId, 'pseudonym')],
    { orcidId, persona: 'pseudonym' },
    [_.ProfilePrereviewId.PreprintReview({ id: 3 }), _.ProfilePrereviewId.PreprintReview({ id: 2 })],
  ],
  [
    'a review they were invited to, with another persona',
    [...reviews, authorChoicesForAReviewImported(3, orcidId, 'pseudonym')],
    { orcidId, persona: 'public' },
    [_.ProfilePrereviewId.PreprintReview({ id: 4 }), _.ProfilePrereviewId.PreprintReview({ id: 1 })],
  ],
  [
    'author choices recorded before the review was imported',
    [authorChoicesForAReviewImported(3, orcidId, 'public'), ...reviews],
    { orcidId, persona: 'public' },
    [
      _.ProfilePrereviewId.PreprintReview({ id: 4 }),
      _.ProfilePrereviewId.PreprintReview({ id: 3 }),
      _.ProfilePrereviewId.PreprintReview({ id: 1 }),
    ],
  ],
  [
    'author choices for a review that was not imported',
    [authorChoicesForAReviewImported(5, orcidId, 'public')],
    { orcidId, persona: 'public' },
    [],
  ],
  ['someone with no reviews', reviews, { orcidId: OrcidId.OrcidId('0000-0003-4921-6155'), persona: 'public' }, []],
  [
    'a dataset review they started, mixed with preprint reviews by publication time',
    [...reviews, datasetReviewWasStarted(orcidId), datasetReviewWasPublished],
    { orcidId, persona: 'public' },
    [
      _.ProfilePrereviewId.PreprintReview({ id: 4 }),
      _.ProfilePrereviewId.DatasetReview({ id: datasetReviewId }),
      _.ProfilePrereviewId.PreprintReview({ id: 1 }),
    ],
  ],
  [
    'a dataset review they started with a pseudonym',
    [datasetReviewWasStarted(orcidId), personaForDatasetReviewWasChosen('pseudonym'), datasetReviewWasPublished],
    { orcidId, persona: 'pseudonym' },
    [_.ProfilePrereviewId.DatasetReview({ id: datasetReviewId })],
  ],
  [
    'a dataset review they started with a pseudonym, on their public profile',
    [datasetReviewWasStarted(orcidId), personaForDatasetReviewWasChosen('pseudonym'), datasetReviewWasPublished],
    { orcidId, persona: 'public' },
    [],
  ],
  [
    'a dataset review they started that is not published',
    [datasetReviewWasStarted(orcidId)],
    { orcidId, persona: 'public' },
    [],
  ],
  [
    'a dataset review they co-authored',
    coAuthoredDatasetReview('pseudonym'),
    { orcidId, persona: 'pseudonym' },
    [_.ProfilePrereviewId.DatasetReview({ id: datasetReviewId })],
  ],
  [
    'a dataset review they co-authored, with another persona',
    coAuthoredDatasetReview('pseudonym'),
    { orcidId, persona: 'public' },
    [],
  ],
  [
    'a dataset review they co-authored without confirming their choices',
    [
      datasetReviewWasStarted(otherOrcidId),
      answeredIfOthersNeedToBeListedOnTheReview,
      authorInviteAccepted(orcidId),
      personaForAReviewChosen(orcidId, 'public'),
      datasetReviewWasPublished,
    ],
    { orcidId, persona: 'public' },
    [],
  ],
  [
    'a dataset review they co-authored that does not list other authors',
    [
      datasetReviewWasStarted(otherOrcidId),
      authorInviteAccepted(orcidId),
      personaForAReviewChosen(orcidId, 'public'),
      authorChoicesForAReviewConfirmed(orcidId),
      datasetReviewWasPublished,
    ],
    { orcidId, persona: 'public' },
    [],
  ],
  [
    'a dataset review someone else started',
    [datasetReviewWasStarted(otherOrcidId), datasetReviewWasPublished],
    { orcidId, persona: 'public' },
    [],
  ],
])('%s', (_name, events, input, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListProfilePrereviewIds(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListProfilePrereviewIds(id => id === 4)

  const state = updateStateWithEvents(initialState, reviews)

  const actual = query(state, { orcidId, persona: 'public' })

  expect(actual).toStrictEqual(Result.succeed([_.ProfilePrereviewId.PreprintReview({ id: 1 })]))
})
