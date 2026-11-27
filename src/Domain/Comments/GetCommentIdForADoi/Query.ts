import { Array, HashMap, Result } from 'effect'
import { type Doi, DoiSchema } from '../../../types/Doi.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import * as Events from '../../Events/index.ts'
import { Queries } from '../../Events/index.ts'
import { CommentIsNotFound } from './Types.ts'

export type Input = Doi

export type Result = Uuid

const filter = Events.EventFilter({ types: ['CommentWasAssignedADoi'] })

type State = HashMap.HashMap<string, Uuid>

const toKey = (doi: Doi): string => doi.toLowerCase()

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  HashMap.mutate(state, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return HashMap.set(currentState, toKey(event.doi), event.commentId)
    }),
  )

const query = (state: State, input: Input): Result.Result<Result, CommentIsNotFound> =>
  Result.fromOption(HashMap.get(state, toKey(input)), () => new CommentIsNotFound())

export const Query = Queries.StatefulQuery({
  name: 'Comments.getCommentIdForADoi.Query',
  inputSchema: DoiSchema,
  initialState: HashMap.empty<string, Uuid>(),
  updateStateWithEvents,
  query,
})
