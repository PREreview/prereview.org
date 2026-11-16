import { expect, test } from '../../../vitest.ts'
import { Temporal } from '@js-temporal/polyfill'
import { Array, Option, Result } from 'effect'
import * as _ from '../../../../src/Domain/PreprintReviews/GetPublishedPreprintReviewsForAPreprint/ListPreprintReviewIds.ts'
import * as Preprints from '../../../../src/Domain/Preprints/index.ts'
import * as Events from '../../../../src/Events.ts'
import { html } from '../../../../src/html.ts'
import { Doi, OrcidId } from '../../../../src/types/index.ts'

const preprintId = new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const indeterminatePreprintId = new Preprints.BiorxivOrMedrxivPreprintId({ value: Doi.Doi('10.1101/12345') })
const otherPreprintId = new Preprints.MedrxivPreprintId({ value: Doi.Doi('10.1101/67890') })
const philsciPreprintId = new Preprints.PhilsciPreprintId({ value: 12345 })

const reviewImported = ({
  id,
  preprint,
  published,
}: {
  id: number
  preprint: Preprints.IndeterminatePreprintId
  published: Temporal.Instant | Temporal.PlainDate
}) =>
  new Events.PreprintReviewImported({
    authors: [{ _tag: 'PublicPersona', name: Option.none(), orcidId: OrcidId.OrcidId('0000-0002-1825-0097') }],
    otherAuthors: 0,
    doi: Doi.Doi(`10.5281/zenodo.${id}`),
    id,
    license: 'CC-BY-4.0',
    published,
    preprint,
    live: false,
    useOfAi: { _tag: 'No' },
    competingInterests: { _tag: 'No' },
    language: 'en',
    content: { _tag: 'Full', text: html`<p>Hello</p>` },
  })

test.each<[string, _.Input, ReadonlyArray<Events.Event>, _.Result]>([
  ['no events', preprintId, [], []],
  [
    'one review',
    preprintId,
    [reviewImported({ id: 1, preprint: preprintId, published: Temporal.Instant.from('2026-11-01T09:00:00Z') })],
    [1],
  ],
  [
    'several reviews, newest first',
    preprintId,
    [
      reviewImported({ id: 1, preprint: preprintId, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
      reviewImported({ id: 2, preprint: preprintId, published: Temporal.Instant.from('2026-11-03T09:00:00Z') }),
      reviewImported({ id: 3, preprint: preprintId, published: Temporal.PlainDate.from('2026-11-02') }),
    ],
    [2, 3, 1],
  ],
  [
    'a date-only review sorts as the start of its day',
    preprintId,
    [
      reviewImported({ id: 1, preprint: preprintId, published: Temporal.Instant.from('2026-11-02T09:00:00Z') }),
      reviewImported({ id: 2, preprint: preprintId, published: Temporal.PlainDate.from('2026-11-02') }),
    ],
    [1, 2],
  ],
  [
    'reviews of other preprints',
    preprintId,
    [
      reviewImported({ id: 1, preprint: otherPreprintId, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
      reviewImported({ id: 2, preprint: preprintId, published: Temporal.Instant.from('2026-11-02T09:00:00Z') }),
    ],
    [2],
  ],
  [
    'a review recorded against an indeterminate preprint ID',
    preprintId,
    [
      reviewImported({
        id: 1,
        preprint: indeterminatePreprintId,
        published: Temporal.Instant.from('2026-11-01T09:00:00Z'),
      }),
    ],
    [1],
  ],
  [
    'a preprint without a DOI',
    philsciPreprintId,
    [reviewImported({ id: 1, preprint: philsciPreprintId, published: Temporal.Instant.from('2026-11-01T09:00:00Z') })],
    [1],
  ],
  [
    'many reviews',
    preprintId,
    Array.makeBy(150, index =>
      reviewImported({
        id: index + 1,
        preprint: preprintId,
        published: Temporal.Instant.from('2026-01-01T00:00:00Z').add({ hours: index }),
      }),
    ),
    Array.reverse(Array.makeBy(150, index => index + 1)),
  ],
])('%s', (_name, input, events, expected) => {
  const { initialState, updateStateWithEvents, query } = _.ListPreprintReviewIds(() => false)

  const state = Array.match(events, {
    onNonEmpty: events => updateStateWithEvents(initialState, events),
    onEmpty: () => initialState,
  })

  const actual = query(state, input)

  expect(actual).toStrictEqual(Result.succeed(expected))
})

test('leaves out removed reviews', () => {
  const { initialState, updateStateWithEvents, query } = _.ListPreprintReviewIds(id => id === 2)

  const state = updateStateWithEvents(initialState, [
    reviewImported({ id: 1, preprint: preprintId, published: Temporal.Instant.from('2026-11-01T09:00:00Z') }),
    reviewImported({ id: 2, preprint: preprintId, published: Temporal.Instant.from('2026-11-02T09:00:00Z') }),
    reviewImported({ id: 3, preprint: preprintId, published: Temporal.Instant.from('2026-11-03T09:00:00Z') }),
  ])

  const actual = query(state, preprintId)

  expect(actual).toStrictEqual(Result.succeed([3, 1]))
})
