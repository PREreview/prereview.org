import { Option } from 'effect'
import type * as Events from '../Events.js'

export const GetAnswerToIfTheDatasetHasTrackedChanges: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Option.Option<Events.AnsweredIfTheDatasetHasTrackedChanges['answer']> = Option.none
