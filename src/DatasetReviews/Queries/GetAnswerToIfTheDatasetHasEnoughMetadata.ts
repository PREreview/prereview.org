import { Option } from 'effect'
import type * as Events from '../Events.js'

export const GetAnswerToIfTheDatasetHasEnoughMetadata: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Option.Option<Events.AnsweredIfTheDatasetHasEnoughMetadata['answer']> = Option.none
