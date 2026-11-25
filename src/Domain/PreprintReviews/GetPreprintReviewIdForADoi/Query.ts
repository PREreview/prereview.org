import { Array, HashMap, Result } from 'effect'
import * as Events from '../../../Events.ts'
import { Queries } from '../../../EventSourcing/index.ts'
import { type Doi, DoiSchema } from '../../../types/Doi.ts'
import { PrereviewIsNotFound } from './Types.ts'

export type Input = Doi

export type Result = number

const filter = Events.EventFilter({ types: ['PreprintReviewImported'] })

type State = HashMap.HashMap<string, number>

const toKey = (doi: Doi): string => doi.toLowerCase()

const updateStateWithEvents = (state: State, events: Array.NonEmptyReadonlyArray<Events.Event>): State =>
  HashMap.mutate(state, mutableState =>
    Array.reduce(events, mutableState, (currentState, event) => {
      if (!Events.matches(event, filter)) {
        return currentState
      }

      return HashMap.set(currentState, toKey(event.doi), event.id)
    }),
  )

const query = (state: State, input: Input): Result.Result<Result, PrereviewIsNotFound> =>
  Result.fromOption(HashMap.get(state, toKey(input)), () => new PrereviewIsNotFound())

export const Query = Queries.StatefulQuery({
  name: 'PreprintReviews.getPreprintReviewIdForADoi.Query',
  inputSchema: DoiSchema,
  initialState: HashMap.empty<string, number>(),
  updateStateWithEvents,
  query,
})
