import { Array, Filter, flow, HashMap, Match, Option, Order, pipe, Result } from 'effect'
import { Queries } from '../../../EventSourcing/index.ts'
import type { Doi } from '../../../types/Doi.ts'
import { Temporal } from '../../../types/index.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import * as Events from '../../Events/index.ts'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'

export interface PreprintReviewForReviewsData {
  readonly authors: ReadonlyArray<{ orcidId: OrcidId; persona: 'public' | 'pseudonym' }>
  readonly club: Uuid | undefined
  readonly doi: Doi
  readonly id: number
  readonly language: Events.PreprintReviewImported['language']
  readonly live: boolean
  readonly preprint: IndeterminatePreprintId
  readonly published: Temporal.Instant | Temporal.PlainDate
  readonly structured: boolean
  readonly topics: Events.PreprintReviewImported['topics']
}

export type Result = ReadonlyArray<PreprintReviewForReviewsData>

const filter = Events.EventFilter({
  types: ['PreprintReviewImported', 'AuthorChoicesForAReviewImported', 'PreprintReviewWasAddedToAClub'],
})

interface State {
  readonly reviews: HashMap.HashMap<number, PreprintReviewForReviewsData>
  readonly authorChoices: HashMap.HashMap<number, PreprintReviewForReviewsData['authors']>
}

const initialState: State = { reviews: HashMap.empty(), authorChoices: HashMap.empty() }

const toNamedAuthor = Match.typeTags<
  Events.PreprintReviewImported['authors'][number],
  Option.Option<PreprintReviewForReviewsData['authors'][number]>
>()({
  PublicPersona: ({ orcidId }) => Option.some({ orcidId, persona: 'public' }),
  PseudonymPersona: ({ orcidId }) => Option.some({ orcidId, persona: 'pseudonym' }),
  Unknown: () => Option.none(),
})

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  Array.reduce(events, state, (currentState, event) => {
    if (!Events.matches(event, filter)) {
      return currentState
    }

    return Match.valueTags(event, {
      PreprintReviewImported: imported => ({
        ...currentState,
        reviews: HashMap.set(currentState.reviews, imported.id, {
          authors: Array.filterMap(imported.authors, Filter.fromPredicateOption(toNamedAuthor)),
          club: imported.club,
          doi: imported.doi,
          id: imported.id,
          language: imported.language,
          live: imported.live,
          preprint: imported.preprint,
          published: imported.published,
          structured: imported.content._tag === 'Structured',
          topics: imported.topics,
        }),
        authorChoices: HashMap.remove(currentState.authorChoices, imported.id),
      }),
      AuthorChoicesForAReviewImported: authorChoice => ({
        ...currentState,
        authorChoices: HashMap.set(
          currentState.authorChoices,
          authorChoice.reviewId,
          Array.append(Option.getOrElse(HashMap.get(currentState.authorChoices, authorChoice.reviewId), Array.empty), {
            orcidId: authorChoice.orcidId,
            persona: authorChoice.persona,
          }),
        ),
      }),
      PreprintReviewWasAddedToAClub: added => ({
        ...currentState,
        reviews: HashMap.modify(currentState.reviews, added.preprintReviewId, review => ({
          ...review,
          club: added.clubId,
        })),
      }),
    })
  })

const toInstant = (published: Temporal.Instant | Temporal.PlainDate): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const byPublished: Order.Order<PreprintReviewForReviewsData> = Order.mapInput(
  Order.flip(Temporal.OrderInstant),
  review => toInstant(review.published),
)

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State): Result =>
    pipe(
      Array.fromIterable(HashMap.values(state.reviews)),
      Array.filter(review => !wasPrereviewRemoved(review.id)),
      Array.map(review => ({
        ...review,
        authors: Array.appendAll(
          review.authors,
          Option.getOrElse(HashMap.get(state.authorChoices, review.id), Array.empty),
        ),
      })),
      Array.sort(byPublished),
    )

export const ListPreprintReviewsForReviewsData = (wasPrereviewRemoved: (id: number) => boolean) =>
  Queries.StatefulQuery({
    name: 'PreprintReviews.getAllPublishedPreprintReviewsForReviewsData.ListPreprintReviewsForReviewsData',
    initialState,
    updateStateWithEvents,
    query: flow(query(wasPrereviewRemoved), Result.succeed),
  })
