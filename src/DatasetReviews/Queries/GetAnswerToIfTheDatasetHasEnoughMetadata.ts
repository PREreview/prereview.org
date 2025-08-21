import type { Option } from 'effect'
import type * as Events from '../Events.js'

export declare const GetAnswerToIfTheDatasetHasEnoughMetadata: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Option.Option<Events.AnsweredIfTheDatasetHasEnoughMetadata['answer']>
