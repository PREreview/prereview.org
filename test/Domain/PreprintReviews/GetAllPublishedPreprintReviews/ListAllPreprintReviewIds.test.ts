import { expect, test } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as _ from '../../../../src/Domain/PreprintReviews/GetAllPublishedPreprintReviews/ListAllPreprintReviewIds.ts'
import * as Events from '../../../../src/Events.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId, Uuid } from '../../../../src/types/index.ts'

const preprintReviewImported = ({ id, published }: { id: number; published: Temporal.Instant | Temporal.PlainDate }) =>
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

const reviews = Array.make(
  preprintReviewImported({ id: 1, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
  preprintReviewImported({ id: 2, published: Temporal.PlainDate.from('2026-11-03') }),
  preprintReviewImported({ id: 3, published: Temporal.Instant.from('2026-11-02T09:00:00Z') }),
)

test.each<[string, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', [], []],
  ['all preprint reviews, newest first', reviews, [2, 3, 1]],
  [
    'ignores dataset reviews',
    [
      new Events.DatasetReviewWasPublished({
        datasetReviewId: Uuid.Uuid('475434b4-3c0d-4b70-a5f4-8af7baf55753'),
        publicationDate: Temporal.Instant.from('2026-11-04T09:00:00Z'),
      }),
    ],
    [],
  ],
])('%s', (_name, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListAllPreprintReviewIds(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed preprint reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListAllPreprintReviewIds(id => id === 3)

  const state = updateStateWithEvents(initialState, reviews)

  const actual = query(state)

  expect(actual).toStrictEqual(Result.succeed([2, 1]))
})
