import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import * as Events from '../../../../src/Domain/Events/Events.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/Prereviews/SearchPrereviews/ListMatchingPrereviewIds.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'
import type { TopicId } from '../../../../src/types/Topic.ts'
import { expect, test } from '../../../vitest.ts'

const preprintReviewImported = ({
  id,
  published,
  language = 'en',
  topics = [],
}: {
  id: number
  published: Temporal.Instant | Temporal.PlainDate
  language?: LanguageCode
  topics?: ReadonlyArray<TopicId>
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
    language,
    content: { _tag: 'Full', text: html`<p>Hello</p>` },
    topics,
  })

const datasetReviewWasPublished = (
  datasetReviewId: Uuid.Uuid,
  publicationDate: Temporal.Instant | Temporal.PlainDate,
) => new Events.DatasetReviewWasPublished({ datasetReviewId, publicationDate })

const datasetReviewId = Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753')

const sevenReviews = Array.makeBy(7, index =>
  preprintReviewImported({
    id: index + 1,
    published: Temporal.Instant.from('2026-11-01T00:00:00Z').add({ hours: index }),
  }),
)

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', { page: 1 }, [], Result.fail(new _.PageNotFound())],
  [
    'preprint and dataset reviews mixed by publication time',
    { page: 1 },
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
      datasetReviewWasPublished(datasetReviewId, Temporal.Instant.from('2026-11-02T09:00:00Z')),
      preprintReviewImported({ id: 2, published: Temporal.PlainDate.from('2026-11-03') }),
    ],
    Result.succeed({
      currentPage: 1,
      totalPages: 1,
      ids: [
        _.MatchingPrereviewId.PreprintReview({ id: 2 }),
        _.MatchingPrereviewId.DatasetReview({ id: datasetReviewId }),
        _.MatchingPrereviewId.PreprintReview({ id: 1 }),
      ],
    }),
  ],
  [
    'the first page',
    { page: 1 },
    sevenReviews,
    Result.succeed({
      currentPage: 1,
      totalPages: 2,
      ids: [
        _.MatchingPrereviewId.PreprintReview({ id: 7 }),
        _.MatchingPrereviewId.PreprintReview({ id: 6 }),
        _.MatchingPrereviewId.PreprintReview({ id: 5 }),
        _.MatchingPrereviewId.PreprintReview({ id: 4 }),
        _.MatchingPrereviewId.PreprintReview({ id: 3 }),
      ],
    }),
  ],
  [
    'the last page',
    { page: 2 },
    sevenReviews,
    Result.succeed({
      currentPage: 2,
      totalPages: 2,
      ids: [_.MatchingPrereviewId.PreprintReview({ id: 2 }), _.MatchingPrereviewId.PreprintReview({ id: 1 })],
    }),
  ],
  ['a page after the last', { page: 3 }, sevenReviews, Result.fail(new _.PageNotFound())],
  ['a page before the first', { page: 0 }, sevenReviews, Result.fail(new _.PageNotFound())],
  [
    'filtered by field',
    { field: '27', page: 1 },
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z'), topics: ['11251'] }),
      preprintReviewImported({
        id: 2,
        published: Temporal.Instant.from('2026-11-02T09:00:00Z'),
        topics: ['12030', '11251'],
      }),
      preprintReviewImported({ id: 3, published: Temporal.Instant.from('2026-11-03T09:00:00Z'), topics: ['12030'] }),
      datasetReviewWasPublished(datasetReviewId, Temporal.Instant.from('2026-11-04T09:00:00Z')),
    ],
    Result.succeed({
      currentPage: 1,
      totalPages: 1,
      ids: [_.MatchingPrereviewId.PreprintReview({ id: 2 }), _.MatchingPrereviewId.PreprintReview({ id: 1 })],
    }),
  ],
  [
    'filtered by language',
    { language: 'pt', page: 1 },
    [
      preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z'), language: 'pt' }),
      preprintReviewImported({ id: 2, published: Temporal.Instant.from('2026-11-02T09:00:00Z'), language: 'en' }),
      datasetReviewWasPublished(datasetReviewId, Temporal.Instant.from('2026-11-03T09:00:00Z')),
    ],
    Result.succeed({ currentPage: 1, totalPages: 1, ids: [_.MatchingPrereviewId.PreprintReview({ id: 1 })] }),
  ],
  [
    'filtered by field and language',
    { field: '27', language: 'pt', page: 1 },
    [
      preprintReviewImported({
        id: 1,
        published: Temporal.Instant.from('2026-11-01T09:00:00Z'),
        language: 'pt',
        topics: ['11251'],
      }),
      preprintReviewImported({
        id: 2,
        published: Temporal.Instant.from('2026-11-02T09:00:00Z'),
        language: 'en',
        topics: ['11251'],
      }),
      preprintReviewImported({
        id: 3,
        published: Temporal.Instant.from('2026-11-03T09:00:00Z'),
        language: 'pt',
        topics: ['12030'],
      }),
    ],
    Result.succeed({ currentPage: 1, totalPages: 1, ids: [_.MatchingPrereviewId.PreprintReview({ id: 1 })] }),
  ],
  [
    'nothing matching the filters',
    { field: '19', page: 1 },
    [preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z'), topics: ['11251'] })],
    Result.fail(new _.PageNotFound()),
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListMatchingPrereviewIds(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(expected)
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListMatchingPrereviewIds(id => id === 7)

  const state = updateStateWithEvents(initialState, sevenReviews)

  const actual = query(state, { page: 1 })

  expect(actual).toStrictEqual(
    Result.succeed({
      currentPage: 1,
      totalPages: 2,
      ids: [
        _.MatchingPrereviewId.PreprintReview({ id: 6 }),
        _.MatchingPrereviewId.PreprintReview({ id: 5 }),
        _.MatchingPrereviewId.PreprintReview({ id: 4 }),
        _.MatchingPrereviewId.PreprintReview({ id: 3 }),
        _.MatchingPrereviewId.PreprintReview({ id: 2 }),
      ],
    }),
  )
})
