import { expect, test } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/PreprintReviews/ImportRapidPrereview.ts'
import { BiorxivOrMedrxivPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Uuid } from '../../src/types/uuid.ts'

const input = {
  author: {
    persona: 'public',
    orcidId: OrcidId('0000-0002-1825-0097'),
  },
  publishedAt: Temporal.Now.instant(),
  preprintId: new BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
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
} satisfies _.Input

const imported = new Events.RapidPrereviewImported(input)

const importedDifferentId = new Events.RapidPrereviewImported({
  ...input,
  rapidPrereviewId: Uuid('123e4567-e89b-12d3-a456-426614174001'),
})

const importedDifferentPersona = new Events.RapidPrereviewImported({
  ...input,
  author: {
    ...input.author,
    persona: 'pseudonym',
  },
})

const importedDifferentAnswer1 = new Events.RapidPrereviewImported({
  ...input,
  questions: {
    ...input.questions,
    availableCode: 'no',
  },
})

const importedDifferentAnswer2 = new Events.RapidPrereviewImported({
  ...input,
  questions: {
    ...input.questions,
    reproducibility: 'yes',
  },
})

test.each<
  [string, ReadonlyArray<Events.Event>, _.Input, Either.Either<Option.Option<Events.Event>, _.MismatchWithExistingData>]
>([
  ['no events', [], input, Either.right(Option.some(new Events.RapidPrereviewImported(input)))],
  [
    'different Rapid PREreview imported',
    [importedDifferentId],
    input,
    Either.right(Option.some(new Events.RapidPrereviewImported(input))),
  ],
  ['already imported, same details', [imported], input, Either.right(Option.none())],
  [
    'already imported, different persona',
    [importedDifferentPersona],
    input,
    Either.left(new _.MismatchWithExistingData({ ...input, author: importedDifferentPersona.author })),
  ],
  [
    'already imported, different answer 1',
    [importedDifferentAnswer1],
    input,
    Either.left(new _.MismatchWithExistingData({ ...input, questions: importedDifferentAnswer1.questions })),
  ],
  [
    'already imported, different answer 2',
    [importedDifferentAnswer2],
    input,
    Either.left(new _.MismatchWithExistingData({ ...input, questions: importedDifferentAnswer2.questions })),
  ],
])('%s', (_name, events, input, expected) => {
  const { foldState, decide } = _.ImportRapidPrereview

  const state = foldState(events, input)

  const actual = decide(state, input)

  expect(actual).toStrictEqual(expected)
})
