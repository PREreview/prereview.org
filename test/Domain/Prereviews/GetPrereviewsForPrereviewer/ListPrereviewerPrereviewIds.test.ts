import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Datasets from '../../../../src/Domain/Datasets/index.ts'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/Prereviews/GetPrereviewsForPrereviewer/ListPrereviewerPrereviewIds.ts'
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

const id = (prereviewId: number | Uuid.Uuid) =>
  typeof prereviewId === 'number'
    ? _.PrereviewerPrereviewId.PreprintReview({ id: prereviewId })
    : _.PrereviewerPrereviewId.DatasetReview({ id: prereviewId })

test.each<[string, ReadonlyArray<Events.Event>, _.Input, _.Result]>([
  ['no events', [], orcidId, []],
  ['all their preprint reviews, whatever the persona, newest first', reviews, orcidId, [id(4), id(2), id(1)]],
  [
    'a preprint review they were invited to',
    [...reviews, authorChoicesForAReviewImported(3, orcidId, 'pseudonym')],
    orcidId,
    [id(4), id(3), id(2), id(1)],
  ],
  [
    'author choices recorded before the preprint review was imported',
    [authorChoicesForAReviewImported(3, orcidId, 'public'), ...reviews],
    orcidId,
    [id(4), id(3), id(2), id(1)],
  ],
  [
    'author choices for a preprint review that was not imported',
    [authorChoicesForAReviewImported(5, orcidId, 'public')],
    orcidId,
    [],
  ],
  [
    'a dataset review they started, mixed with preprint reviews by publication time',
    [...reviews, datasetReviewWasStarted(orcidId), datasetReviewWasPublished],
    orcidId,
    [id(4), id(datasetReviewId), id(2), id(1)],
  ],
  [
    'a dataset review they started with a pseudonym',
    [datasetReviewWasStarted(orcidId), personaForDatasetReviewWasChosen('pseudonym'), datasetReviewWasPublished],
    orcidId,
    [id(datasetReviewId)],
  ],
  ['a dataset review they started that is not published', [datasetReviewWasStarted(orcidId)], orcidId, []],
  ['a dataset review they co-authored', coAuthoredDatasetReview('pseudonym'), orcidId, [id(datasetReviewId)]],
  [
    'a dataset review they co-authored without confirming their choices',
    [
      datasetReviewWasStarted(otherOrcidId),
      answeredIfOthersNeedToBeListedOnTheReview,
      authorInviteAccepted(orcidId),
      personaForAReviewChosen(orcidId, 'public'),
      datasetReviewWasPublished,
    ],
    orcidId,
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
    orcidId,
    [],
  ],
  [
    'a dataset review someone else started',
    [datasetReviewWasStarted(otherOrcidId), datasetReviewWasPublished],
    orcidId,
    [],
  ],
  ['someone with no reviews', reviews, OrcidId.OrcidId('0000-0003-4921-6155'), []],
])('%s', (_name, events, input, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListPrereviewerPrereviewIds(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListPrereviewerPrereviewIds(id => id === 4)

  const state = updateStateWithEvents(initialState, reviews)

  const actual = query(state, orcidId)

  expect(actual).toStrictEqual(Result.succeed([id(2), id(1)]))
})
