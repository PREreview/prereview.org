import { Array, Data, Equal, type Equivalence, Match, Option, Result, Struct } from 'effect'
import * as Events from '../../Events.ts'
import { Commands } from '../../EventSourcing/index.ts'
import { SensitiveData } from '../../SensitiveData/index.ts'
import { Temporal } from '../../types/index.ts'
import * as Preprints from '../Preprints/index.ts'

export type Input = Omit<typeof Events.PreprintReviewImported.Type, '_tag'>

export class UnexpectedPreviousImport extends Data.TaggedError('UnexpectedPreviousImport')<{
  difference: keyof Input
}> {}

export type Error = UnexpectedPreviousImport

type State = NotImported | AlreadyImported

class NotImported extends Data.TaggedClass('NotImported') {}
class AlreadyImported extends Data.TaggedClass('AlreadyImported')<{ event: Events.PreprintReviewImported }> {}

const createFilter = (input: Input) =>
  Events.EventFilter({
    types: ['PreprintReviewImported'],
    predicates: { id: input.id },
  })

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State =>
  Option.match(Array.findLast(events, Events.matches(createFilter(input))), {
    onNone: () => new NotImported(),
    onSome: event => new AlreadyImported({ event }),
  })

const decide = (state: State, input: Input): Result.Result<Option.Option<Events.Event>, Error> => {
  const event = new Events.PreprintReviewImported({ ...input, preprint: toIndeterminatePreprintId(input.preprint) })

  return Match.valueTags(state, {
    NotImported: () => Result.succeedSome(event),
    AlreadyImported: ({ event: previous }) =>
      Option.match(findDifference(previous, event), {
        onNone: () => Result.succeedNone,
        onSome: difference => Result.fail(new UnexpectedPreviousImport({ difference })),
      }),
  })
}

export const ImportPreprintReview = Commands.Command({
  name: 'PreprintReviews.importPreprintReview',
  createFilter,
  foldState,
  decide,
})

const toIndeterminatePreprintId = (id: Preprints.IndeterminatePreprintId): Preprints.IndeterminatePreprintId =>
  id._tag === 'PhilsciPreprintId' ? id : Preprints.fromPreprintDoi(id.value)

const findDifference = (
  previous: Events.PreprintReviewImported,
  current: Events.PreprintReviewImported,
): Option.Option<keyof Input> =>
  Array.findFirst(Struct.keys(Struct.omit(Events.PreprintReviewImported.fields, ['_tag'])), key => {
    if (key === 'published') {
      return !PublishedEquivalence(previous.published, current.published)
    }

    if (key === 'authors') {
      return !AuthorsEquivalence(previous.authors, current.authors)
    }

    return !Equal.equals(previous[key], current[key])
  })

const AuthorEquivalence: Equivalence.Equivalence<Input['authors'][number]> = (a, b) => {
  if (
    'name' in a &&
    'name' in b &&
    (a.name instanceof SensitiveData.SensitiveDataReference || b.name instanceof SensitiveData.SensitiveDataReference)
  ) {
    return Equal.equals(Struct.omit(a, ['name']), Struct.omit(b, ['name']))
  }

  return Equal.equals(a, b)
}

const AuthorsEquivalence = Array.makeEquivalence(AuthorEquivalence)

const PublishedEquivalence: Equivalence.Equivalence<Input['published']> = (a, b) => {
  if (a instanceof Temporal.Instant && b instanceof Temporal.Instant) {
    return a.equals(b)
  }

  if (a instanceof Temporal.PlainDate && b instanceof Temporal.PlainDate) {
    return a.equals(b)
  }

  return false
}
