import { Array, flow, Option, Struct } from 'effect'
import type * as Events from '../Events.js'

export const GetAnswerToIfTheDatasetHasTrackedChanges: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Option.Option<Events.AnsweredIfTheDatasetHasTrackedChanges['answer']> = flow(
  Array.findLast(hasTag('AnsweredIfTheDatasetHasTrackedChanges')),
  Option.map(Struct.get('answer')),
)

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
