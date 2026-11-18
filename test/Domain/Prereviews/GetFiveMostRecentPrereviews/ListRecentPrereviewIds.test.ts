import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/Prereviews/GetFiveMostRecentPrereviews/ListRecentPrereviewIds.ts'
import * as Events from '../../../../src/Events.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'
import { expect, test } from '../../../vitest.ts'

const preprintReviewImported = (id: number, published: Temporal.Instant | Temporal.PlainDate) =>
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
  })

const datasetReviewWasPublished = (
  datasetReviewId: Uuid.Uuid,
  publicationDate: Temporal.Instant | Temporal.PlainDate,
) => new Events.DatasetReviewWasPublished({ datasetReviewId, publicationDate })

const datasetReviewId1 = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')
const datasetReviewId2 = Uuid.Uuid('7bb629bd-9616-4e0f-bab7-f2ab07b95340')

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', 5, [], []],
  [
    'preprint reviews, newest first',
    5,
    [
      preprintReviewImported(1, Temporal.Instant.from('2026-11-01T09:00:00Z')),
      preprintReviewImported(2, Temporal.Instant.from('2026-11-03T09:00:00Z')),
      preprintReviewImported(3, Temporal.Instant.from('2026-11-02T09:00:00Z')),
    ],
    [
      _.RecentPrereviewId.PreprintReview({ id: 2 }),
      _.RecentPrereviewId.PreprintReview({ id: 3 }),
      _.RecentPrereviewId.PreprintReview({ id: 1 }),
    ],
  ],
  [
    'preprint and dataset reviews mixed by publication time',
    5,
    [
      preprintReviewImported(1, Temporal.Instant.from('2026-11-01T09:00:00Z')),
      datasetReviewWasPublished(datasetReviewId1, Temporal.Instant.from('2026-11-02T09:00:00Z')),
      preprintReviewImported(2, Temporal.Instant.from('2026-11-03T09:00:00Z')),
      datasetReviewWasPublished(datasetReviewId2, Temporal.Instant.from('2026-11-04T09:00:00Z')),
    ],
    [
      _.RecentPrereviewId.DatasetReview({ id: datasetReviewId2 }),
      _.RecentPrereviewId.PreprintReview({ id: 2 }),
      _.RecentPrereviewId.DatasetReview({ id: datasetReviewId1 }),
      _.RecentPrereviewId.PreprintReview({ id: 1 }),
    ],
  ],
  [
    'a date-only review sorts as the start of its day',
    5,
    [
      preprintReviewImported(1, Temporal.Instant.from('2026-11-02T09:00:00Z')),
      datasetReviewWasPublished(datasetReviewId1, Temporal.PlainDate.from('2026-11-02')),
    ],
    [_.RecentPrereviewId.PreprintReview({ id: 1 }), _.RecentPrereviewId.DatasetReview({ id: datasetReviewId1 })],
  ],
  [
    'only the newest up to the limit',
    2,
    Array.makeBy(4, index =>
      preprintReviewImported(index + 1, Temporal.Instant.from('2026-11-01T00:00:00Z').add({ hours: index })),
    ),
    [_.RecentPrereviewId.PreprintReview({ id: 4 }), _.RecentPrereviewId.PreprintReview({ id: 3 })],
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListRecentPrereviewIds(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListRecentPrereviewIds(id => id === 3)

  const state = updateStateWithEvents(initialState, [
    preprintReviewImported(1, Temporal.Instant.from('2026-11-01T09:00:00Z')),
    preprintReviewImported(2, Temporal.Instant.from('2026-11-02T09:00:00Z')),
    preprintReviewImported(3, Temporal.Instant.from('2026-11-03T09:00:00Z')),
  ])

  const actual = query(state, 2)

  expect(actual).toStrictEqual(
    Result.succeed([_.RecentPrereviewId.PreprintReview({ id: 2 }), _.RecentPrereviewId.PreprintReview({ id: 1 })]),
  )
})
