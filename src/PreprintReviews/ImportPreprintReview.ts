import type { Result, Option } from 'effect'
import * as Commands from '../Commands.ts'
import type * as Events from '../Events.ts'

export type Input = unknown

export type Error = unknown

type State = unknown

declare const createFilter: (input: Input) => Events.EventFilter

declare const foldState: (events: ReadonlyArray<Events.Event>, input: Input) => State

declare const decide: (state: State, input: Input) => Result.Result<Option.Option<Events.Event>, Error>

export const ImportPreprintReview = Commands.Command({
  name: 'PreprintReviews.importPreprintReview',
  createFilter,
  foldState,
  decide,
})
