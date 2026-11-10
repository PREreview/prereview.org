import { type Result, type Option, Data } from 'effect'
import * as Commands from '../Commands.ts'
import type * as Events from '../Events.ts'

export type Input = Omit<typeof Events.PreprintReviewImported.Type, '_tag'>

export class UnexpectedPreviousImport extends Data.TaggedError('UnexpectedPreviousImport')<{
  difference: keyof Input
}> {}

export type Error = UnexpectedPreviousImport

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
