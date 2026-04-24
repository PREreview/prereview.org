import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/PreprintReviews/GetRapidPrereviewsForAPreprint.ts'
import { BiorxivOrMedrxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/uuid.ts'

const input = new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') })

const imported1 = new Events.RapidPrereviewImported({
  author: {
    persona: 'public',
    orcidId: OrcidId('0000-0002-1825-0097'),
  },
  publishedAt: Temporal.Now.instant(),
  preprintId: input,
  rapidPrereviewId: Uuid('123e4567-e89b-12d3-a456-426614174000'),
  questions: {
    availableCode: 'yes',
    availableData: 'unsure',
    coherent: 'not applicable',
    dataLink: Option.none(),
    ethics: 'no',
    future: 'yes',
    limitations: 'unsure',
    methods: 'not applicable',
    newData: 'no',
    novel: 'yes',
    peerReview: 'unsure',
    recommend: 'not applicable',
    reproducibility: 'no',
    technicalComments: Option.none(),
    editorialComments: Option.none(),
  },
})

const imported2 = new Events.RapidPrereviewImported({
  author: {
    persona: 'pseudonym',
    orcidId: OrcidId('0000-0002-6109-0367'),
  },
  publishedAt: Temporal.Now.instant().subtract({ hours: 2 }),
  preprintId: input,
  rapidPrereviewId: Uuid('123e4567-e89b-12d3-a456-426614174001'),
  questions: {
    availableCode: 'yes',
    availableData: 'unsure',
    coherent: 'not applicable',
    dataLink: Option.none(),
    ethics: 'no',
    future: 'yes',
    limitations: 'unsure',
    methods: 'not applicable',
    newData: 'no',
    novel: 'yes',
    peerReview: 'unsure',
    recommend: 'not applicable',
    reproducibility: 'no',
    technicalComments: Option.none(),
    editorialComments: Option.none(),
  },
})

const imported3 = new Events.RapidPrereviewImported({
  author: {
    persona: 'public',
    orcidId: OrcidId('0000-0002-6109-0367'),
  },
  publishedAt: Temporal.Now.instant().subtract({ hours: 1 }),
  preprintId: input,
  rapidPrereviewId: Uuid('123e4567-e89b-12d3-a456-426614174002'),
  questions: {
    availableCode: 'yes',
    availableData: 'unsure',
    coherent: 'not applicable',
    dataLink: Option.none(),
    ethics: 'no',
    future: 'yes',
    limitations: 'unsure',
    methods: 'not applicable',
    newData: 'no',
    novel: 'yes',
    peerReview: 'unsure',
    recommend: 'not applicable',
    reproducibility: 'no',
    technicalComments: Option.none(),
    editorialComments: Option.none(),
  },
})

const importedDifferentPreprintId = new Events.RapidPrereviewImported({
  author: {
    persona: 'public',
    orcidId: OrcidId('0000-0002-1825-0097'),
  },
  publishedAt: Temporal.Now.instant(),
  preprintId: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2022.01.13.476202') }),
  rapidPrereviewId: Uuid('123e4567-e89b-12d3-a456-426614174003'),
  questions: {
    availableCode: 'yes',
    availableData: 'unsure',
    coherent: 'not applicable',
    dataLink: Option.none(),
    ethics: 'no',
    future: 'yes',
    limitations: 'unsure',
    methods: 'not applicable',
    newData: 'no',
    novel: 'yes',
    peerReview: 'unsure',
    recommend: 'not applicable',
    reproducibility: 'no',
    technicalComments: Option.none(),
    editorialComments: Option.none(),
  },
})

test.failing.each<[string, _.Input, ReadonlyArray<Events.Event>, ReadonlyArray<Uuid>]>([
  ['no events', input, [], []],
  ['imported', input, [imported1], [imported1.rapidPrereviewId]],
  ['different preprint ID', input, [importedDifferentPreprintId], []],
  [
    'multiple imported',
    input,
    [imported1, imported2, imported3],
    [imported2.rapidPrereviewId, imported3.rapidPrereviewId, imported1.rapidPrereviewId],
  ],
])('%s', (_name, input, events, expected) => {
  const { query } = _.GetRapidPrereviewsForAPreprint

  const actual = query(events, input)

  expect(actual).toStrictEqual(
    Either.right(expected.map(rapidPrereviewId => expect.objectContaining({ rapidPrereviewId }))),
  )
})
