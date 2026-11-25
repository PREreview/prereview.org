import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/Prereviews/GetPrereviewsForClub/ListClubPrereviewIds.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

const preprintReviewImported = ({
  id,
  published,
  club,
}: {
  id: number
  published: Temporal.Instant | Temporal.PlainDate
  club?: Uuid.Uuid
}) =>
  new Events.PreprintReviewImported({
    authors: [{ _tag: 'PublicPersona', name: Option.none(), orcidId: OrcidId.OrcidId('0000-0002-1825-0097') }],
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
    ...(club !== undefined ? { club } : {}),
  })

const preprintReviewWasAddedToAClub = (preprintReviewId: number, clubId: Uuid.Uuid) =>
  new Events.PreprintReviewWasAddedToAClub({ preprintReviewId, clubId })

const datasetReviewWasAddedToAClub = (datasetReviewId: Uuid.Uuid, clubId: Uuid.Uuid) =>
  new Events.DatasetReviewWasAddedToAClub({ datasetReviewId, clubId })

const datasetReviewWasPublished = (
  datasetReviewId: Uuid.Uuid,
  publicationDate: Temporal.Instant | Temporal.PlainDate,
) => new Events.DatasetReviewWasPublished({ datasetReviewId, publicationDate })

const clubId = Uuid.Uuid('4f8076fc-2219-49fc-be5f-6682ca7cc009')
const otherClubId = Uuid.Uuid('998f32b4-ced9-49f8-8042-ce8fe41e62ec')
const datasetReviewId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], []],
  [
    "only the club's preprint reviews, newest first",
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z'), club: clubId }),
      preprintReviewImported({ id: 2, published: Temporal.Instant.from('2026-11-02T09:00:00Z'), club: otherClubId }),
      preprintReviewImported({ id: 3, published: Temporal.Instant.from('2026-11-03T09:00:00Z') }),
      preprintReviewImported({ id: 4, published: Temporal.PlainDate.from('2026-11-04'), club: clubId }),
    ],
    [_.ClubPrereviewId.PreprintReview({ id: 4 }), _.ClubPrereviewId.PreprintReview({ id: 1 })],
  ],
  [
    'preprint and dataset reviews mixed by publication time',
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z'), club: clubId }),
      datasetReviewWasAddedToAClub(datasetReviewId, clubId),
      datasetReviewWasPublished(datasetReviewId, Temporal.Instant.from('2026-11-02T09:00:00Z')),
      preprintReviewImported({ id: 2, published: Temporal.Instant.from('2026-11-03T09:00:00Z'), club: clubId }),
    ],
    [
      _.ClubPrereviewId.PreprintReview({ id: 2 }),
      _.ClubPrereviewId.DatasetReview({ id: datasetReviewId }),
      _.ClubPrereviewId.PreprintReview({ id: 1 }),
    ],
  ],
  [
    'a preprint review added to the club',
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
      preprintReviewWasAddedToAClub(1, clubId),
    ],
    [_.ClubPrereviewId.PreprintReview({ id: 1 })],
  ],
  [
    'a preprint review added to another club',
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
      preprintReviewWasAddedToAClub(1, otherClubId),
    ],
    [],
  ],
  [
    'a preprint review moved to another club',
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z'), club: clubId }),
      preprintReviewWasAddedToAClub(1, otherClubId),
    ],
    [],
  ],
  [
    'preprint reviews added to the club mixed with others by publication time',
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
      preprintReviewImported({ id: 2, published: Temporal.Instant.from('2026-11-02T09:00:00Z'), club: clubId }),
      preprintReviewImported({ id: 3, published: Temporal.Instant.from('2026-11-03T09:00:00Z') }),
      preprintReviewWasAddedToAClub(3, clubId),
      preprintReviewWasAddedToAClub(1, clubId),
    ],
    [
      _.ClubPrereviewId.PreprintReview({ id: 3 }),
      _.ClubPrereviewId.PreprintReview({ id: 2 }),
      _.ClubPrereviewId.PreprintReview({ id: 1 }),
    ],
  ],
  ['a dataset review that is not published', [datasetReviewWasAddedToAClub(datasetReviewId, clubId)], []],
  [
    'a dataset review in another club',
    [
      datasetReviewWasAddedToAClub(datasetReviewId, otherClubId),
      datasetReviewWasPublished(datasetReviewId, Temporal.Instant.from('2026-11-02T09:00:00Z')),
    ],
    [],
  ],
  [
    'a dataset review moved to another club',
    [
      datasetReviewWasAddedToAClub(datasetReviewId, clubId),
      datasetReviewWasAddedToAClub(datasetReviewId, otherClubId),
      datasetReviewWasPublished(datasetReviewId, Temporal.Instant.from('2026-11-02T09:00:00Z')),
    ],
    [],
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListClubPrereviewIds(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, clubId)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListClubPrereviewIds(id => id === 2)

  const state = updateStateWithEvents(initialState, [
    preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z'), club: clubId }),
    preprintReviewImported({ id: 2, published: Temporal.Instant.from('2026-11-02T09:00:00Z'), club: clubId }),
  ])

  const actual = query(state, clubId)

  expect(actual).toStrictEqual(Result.succeed([_.ClubPrereviewId.PreprintReview({ id: 1 })]))
})
