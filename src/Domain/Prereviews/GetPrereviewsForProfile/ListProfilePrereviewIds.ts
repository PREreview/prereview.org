import { Array, Data, Filter, flow, HashMap, Match, Option, Order, pipe, Result, Schema, Struct } from 'effect'
import { Queries } from '../../../EventSourcing/index.ts'
import { OrcidId, Temporal, type Uuid } from '../../../types/index.ts'
import * as Events from '../../Events/index.ts'

export type Input = typeof Input.Type

const Input = Schema.Struct({
  orcidId: OrcidId.OrcidIdSchema,
  persona: Schema.Literals(['public', 'pseudonym']),
})

export type ProfilePrereviewId = Data.TaggedEnum<{
  PreprintReview: { readonly id: number }
  DatasetReview: { readonly id: Uuid.Uuid }
}>

export const ProfilePrereviewId = Data.taggedEnum<ProfilePrereviewId>()

export type Result = ReadonlyArray<ProfilePrereviewId>

type PertinentEvent = Events.EventsForFilter<typeof filter>

const filter = Events.EventFilter({
  types: [
    'PreprintReviewImported',
    'AuthorChoicesForAReviewImported',
    'DatasetReviewWasStarted',
    'PersonaForDatasetReviewWasChosen',
    'AnsweredIfOthersNeedToBeListedOnTheReview',
    'AuthorInviteAccepted',
    'PersonaForAReviewChosen',
    'AuthorChoicesForAReviewConfirmed',
    'DatasetReviewWasPublished',
  ],
})

type Persona = 'public' | 'pseudonym'

interface Author {
  readonly orcidId: OrcidId.OrcidId
  readonly persona: Persona
}

interface PreprintReview {
  readonly published: Temporal.Instant
  readonly authors: ReadonlyArray<Author>
}

interface InvitedAuthor {
  readonly persona?: Persona
  readonly confirmed: boolean
}

interface DatasetReview {
  readonly author: Author
  readonly listsOtherAuthors: boolean
  readonly invitedAuthors: HashMap.HashMap<OrcidId.OrcidId, InvitedAuthor>
  readonly published?: Temporal.Instant
}

interface State {
  readonly preprintReviews: HashMap.HashMap<number, PreprintReview>
  readonly authorChoices: HashMap.HashMap<number, ReadonlyArray<Author>>
  readonly datasetReviews: HashMap.HashMap<Uuid.Uuid, DatasetReview>
}

const initialState: State = {
  preprintReviews: HashMap.empty(),
  authorChoices: HashMap.empty(),
  datasetReviews: HashMap.empty(),
}

const toInstant = (published: Temporal.Instant | Temporal.PlainDate): Temporal.Instant =>
  published instanceof Temporal.Instant ? published : published.toZonedDateTime({ timeZone: 'UTC' }).toInstant()

const toAuthor = (author: Events.PreprintReviewImported['authors'][number]): Option.Option<Author> =>
  Match.valueTags(author, {
    PublicPersona: ({ orcidId }) => Option.some({ orcidId, persona: 'public' } as const),
    PseudonymPersona: ({ orcidId }) => Option.some({ orcidId, persona: 'pseudonym' } as const),
    Unknown: () => Option.none(),
  })

const updateDatasetReview = (
  state: State,
  datasetReviewId: Uuid.Uuid,
  f: (datasetReview: DatasetReview) => DatasetReview,
): State => ({ ...state, datasetReviews: HashMap.modify(state.datasetReviews, datasetReviewId, f) })

const updateInvitedAuthor = (
  datasetReview: DatasetReview,
  orcidId: OrcidId.OrcidId,
  f: (invitedAuthor: InvitedAuthor) => InvitedAuthor,
): DatasetReview => ({ ...datasetReview, invitedAuthors: HashMap.modify(datasetReview.invitedAuthors, orcidId, f) })

const updateStateWithPertinentEvent = (state: State, event: PertinentEvent): State =>
  Match.valueTags(event, {
    PreprintReviewImported: event => ({
      ...state,
      preprintReviews: HashMap.set(state.preprintReviews, event.id, {
        published: toInstant(event.published),
        authors: Array.filterMap(event.authors, Filter.fromPredicateOption(toAuthor)),
      }),
    }),
    AuthorChoicesForAReviewImported: event => ({
      ...state,
      authorChoices: HashMap.set(
        state.authorChoices,
        event.reviewId,
        Array.append(Option.getOrElse(HashMap.get(state.authorChoices, event.reviewId), Array.empty), {
          orcidId: event.orcidId,
          persona: event.persona,
        }),
      ),
    }),
    DatasetReviewWasStarted: event => ({
      ...state,
      datasetReviews: HashMap.set(state.datasetReviews, event.datasetReviewId, {
        author: { orcidId: event.authorId, persona: 'public' },
        listsOtherAuthors: false,
        invitedAuthors: HashMap.empty(),
      }),
    }),
    PersonaForDatasetReviewWasChosen: event =>
      updateDatasetReview(state, event.datasetReviewId, datasetReview => ({
        ...datasetReview,
        author: { ...datasetReview.author, persona: event.persona },
      })),
    AnsweredIfOthersNeedToBeListedOnTheReview: event =>
      updateDatasetReview(state, event.datasetReviewId, datasetReview => ({
        ...datasetReview,
        listsOtherAuthors: true,
      })),
    AuthorInviteAccepted: event =>
      updateDatasetReview(state, event.reviewId, datasetReview => {
        if (
          event.orcidId === datasetReview.author.orcidId ||
          HashMap.has(datasetReview.invitedAuthors, event.orcidId)
        ) {
          return datasetReview
        }

        return {
          ...datasetReview,
          invitedAuthors: HashMap.set(datasetReview.invitedAuthors, event.orcidId, { confirmed: false }),
        }
      }),
    PersonaForAReviewChosen: event =>
      updateDatasetReview(state, event.reviewId, datasetReview =>
        updateInvitedAuthor(datasetReview, event.orcidId, invitedAuthor => ({
          ...invitedAuthor,
          persona: event.persona,
        })),
      ),
    AuthorChoicesForAReviewConfirmed: event =>
      updateDatasetReview(state, event.reviewId, datasetReview =>
        updateInvitedAuthor(datasetReview, event.orcidId, invitedAuthor => ({ ...invitedAuthor, confirmed: true })),
      ),
    DatasetReviewWasPublished: event =>
      updateDatasetReview(state, event.datasetReviewId, datasetReview => ({
        ...datasetReview,
        published: toInstant(event.publicationDate),
      })),
  })

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  Array.reduce(events, state, (currentState, event) => {
    if (!Events.matches(event, filter)) {
      return currentState
    }

    return updateStateWithPertinentEvent(currentState, event)
  })

const isTheProfilesAuthor =
  (input: Input) =>
  (author: Author): boolean =>
    author.orcidId === input.orcidId && author.persona === input.persona

const isAnInvitedAuthorOnTheProfile = (input: Input, datasetReview: DatasetReview): boolean =>
  datasetReview.listsOtherAuthors &&
  Option.exists(
    HashMap.get(datasetReview.invitedAuthors, input.orcidId),
    invitedAuthor => invitedAuthor.confirmed && invitedAuthor.persona === input.persona,
  )

interface Entry {
  readonly prereview: ProfilePrereviewId
  readonly published: Temporal.Instant
}

const query =
  (wasPrereviewRemoved: (id: number) => boolean) =>
  (state: State, input: Input): Result => {
    const preprintReviews = pipe(
      Array.fromIterable(state.preprintReviews),
      Array.filter(
        ([id, review]) =>
          !wasPrereviewRemoved(id) &&
          Array.some(
            Array.appendAll(review.authors, Option.getOrElse(HashMap.get(state.authorChoices, id), Array.empty)),
            isTheProfilesAuthor(input),
          ),
      ),
      Array.map(([id, { published }]): Entry => ({ prereview: ProfilePrereviewId.PreprintReview({ id }), published })),
    )

    const datasetReviews = pipe(
      Array.fromIterable(state.datasetReviews),
      Array.filter(
        ([, datasetReview]) =>
          isTheProfilesAuthor(input)(datasetReview.author) || isAnInvitedAuthorOnTheProfile(input, datasetReview),
      ),
      Array.flatMap(([id, { published }]) =>
        published === undefined ? [] : [{ prereview: ProfilePrereviewId.DatasetReview({ id }), published }],
      ),
    )

    return pipe(
      Array.appendAll(preprintReviews, datasetReviews),
      Array.sortWith(Struct.get('published'), Order.flip(Temporal.OrderInstant)),
      Array.map(Struct.get('prereview')),
    )
  }

export const ListProfilePrereviewIds = (wasPrereviewRemoved: (id: number) => boolean) =>
  Queries.StatefulQuery({
    name: 'Prereviews.getPrereviewsForProfile.ListProfilePrereviewIds',
    inputSchema: Input,
    initialState,
    updateStateWithEvents,
    query: flow(query(wasPrereviewRemoved), Result.succeed),
  })
