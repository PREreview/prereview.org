import { Array, Data, Either, Equal, Match, Option, Schema } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type * as Preprints from '../Preprints/index.ts'
import type { NonEmptyString, OrcidId, Temporal, Uuid } from '../types/index.ts'

export interface Input {
  author: {
    persona: 'public' | 'pseudonym'
    orcidId: OrcidId.OrcidId
  }
  publishedAt: Temporal.Instant
  preprintId: Preprints.IndeterminatePreprintId
  rapidPrereviewId: Uuid.Uuid
  questions: {
    availableCode: 'yes' | 'unsure' | 'not applicable' | 'no'
    availableData: 'yes' | 'unsure' | 'not applicable' | 'no'
    coherent: 'yes' | 'unsure' | 'not applicable' | 'no'
    dataLink: Option.Option<NonEmptyString.NonEmptyString>
    ethics: 'yes' | 'unsure' | 'not applicable' | 'no'
    future: 'yes' | 'unsure' | 'not applicable' | 'no'
    limitations: 'yes' | 'unsure' | 'not applicable' | 'no'
    methods: 'yes' | 'unsure' | 'not applicable' | 'no'
    newData: 'yes' | 'unsure' | 'not applicable' | 'no'
    novel: 'yes' | 'unsure' | 'not applicable' | 'no'
    peerReview: 'yes' | 'unsure' | 'not applicable' | 'no'
    recommend: 'yes' | 'unsure' | 'not applicable' | 'no'
    reproducibility: 'yes' | 'unsure' | 'not applicable' | 'no'
    technicalComments: Option.Option<NonEmptyString.NonEmptyString>
    editorialComments: Option.Option<NonEmptyString.NonEmptyString>
  }
}

export const ImportRapidPrereviewInput: Schema.Schema<Input> = Schema.typeSchema(Events.RapidPrereviewImported).pipe(
  Schema.omit('_tag'),
)

type State = RapidPrereviewDoesNotExist | RapidPrereviewAlreadyExists

class RapidPrereviewDoesNotExist extends Data.TaggedClass('RapidPrereviewDoesNotExist') {}

class RapidPrereviewAlreadyExists extends Data.TaggedClass('RapidPrereviewAlreadyExists')<{
  author: {
    persona: 'public' | 'pseudonym'
    orcidId: OrcidId.OrcidId
  }
  publishedAt: Temporal.Instant
  preprintId: Preprints.IndeterminatePreprintId
  rapidPrereviewId: Uuid.Uuid
  questions: {
    availableCode: 'yes' | 'unsure' | 'not applicable' | 'no'
    availableData: 'yes' | 'unsure' | 'not applicable' | 'no'
    coherent: 'yes' | 'unsure' | 'not applicable' | 'no'
    dataLink: Option.Option<NonEmptyString.NonEmptyString>
    ethics: 'yes' | 'unsure' | 'not applicable' | 'no'
    future: 'yes' | 'unsure' | 'not applicable' | 'no'
    limitations: 'yes' | 'unsure' | 'not applicable' | 'no'
    methods: 'yes' | 'unsure' | 'not applicable' | 'no'
    newData: 'yes' | 'unsure' | 'not applicable' | 'no'
    novel: 'yes' | 'unsure' | 'not applicable' | 'no'
    peerReview: 'yes' | 'unsure' | 'not applicable' | 'no'
    recommend: 'yes' | 'unsure' | 'not applicable' | 'no'
    reproducibility: 'yes' | 'unsure' | 'not applicable' | 'no'
    technicalComments: Option.Option<NonEmptyString.NonEmptyString>
    editorialComments: Option.Option<NonEmptyString.NonEmptyString>
  }
}> {}

export class MismatchWithExistingData extends Data.TaggedError('MismatchWithExistingData')<{
  author: {
    persona: 'public' | 'pseudonym'
    orcidId: OrcidId.OrcidId
  }
  publishedAt: Temporal.Instant
  preprintId: Preprints.IndeterminatePreprintId
  rapidPrereviewId: Uuid.Uuid
  questions: {
    availableCode: 'yes' | 'unsure' | 'not applicable' | 'no'
    availableData: 'yes' | 'unsure' | 'not applicable' | 'no'
    coherent: 'yes' | 'unsure' | 'not applicable' | 'no'
    dataLink: Option.Option<NonEmptyString.NonEmptyString>
    ethics: 'yes' | 'unsure' | 'not applicable' | 'no'
    future: 'yes' | 'unsure' | 'not applicable' | 'no'
    limitations: 'yes' | 'unsure' | 'not applicable' | 'no'
    methods: 'yes' | 'unsure' | 'not applicable' | 'no'
    newData: 'yes' | 'unsure' | 'not applicable' | 'no'
    novel: 'yes' | 'unsure' | 'not applicable' | 'no'
    peerReview: 'yes' | 'unsure' | 'not applicable' | 'no'
    recommend: 'yes' | 'unsure' | 'not applicable' | 'no'
    reproducibility: 'yes' | 'unsure' | 'not applicable' | 'no'
    technicalComments: Option.Option<NonEmptyString.NonEmptyString>
    editorialComments: Option.Option<NonEmptyString.NonEmptyString>
  }
}> {}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: ['RapidPrereviewImported'],
    predicates: { rapidPrereviewId: input.rapidPrereviewId },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const importedEvent = Array.head(filteredEvents)

  if (Option.isSome(importedEvent)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _tag, ...data } = importedEvent.value

    return new RapidPrereviewAlreadyExists(data)
  }

  return new RapidPrereviewDoesNotExist()
}

const decide = (state: State, input: Input) =>
  Match.valueTags(state, {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    RapidPrereviewAlreadyExists: ({ _tag, ...existing }) => {
      if (
        !Equal.equals(
          Data.struct({
            ...existing,
            publishedAt: undefined,
            author: Data.struct(existing.author),
            questions: Data.struct({
              ...existing.questions,
              dataLink: undefined,
              technicalComments: undefined,
              editorialComments: undefined,
            }),
          }),
          Data.struct({
            ...input,
            publishedAt: undefined,
            author: Data.struct(input.author),
            questions: Data.struct({
              ...input.questions,
              dataLink: undefined,
              technicalComments: undefined,
              editorialComments: undefined,
            }),
          }),
        )
      ) {
        return Either.left(new MismatchWithExistingData(existing))
      }

      return Either.right(Option.none())
    },
    RapidPrereviewDoesNotExist: () => Either.right(Option.some(new Events.RapidPrereviewImported(input))),
  })

export const ImportRapidPrereview = Commands.Command({
  name: 'PreprintReviews.importRapidPrereview',
  createFilter,
  foldState,
  decide,
})
