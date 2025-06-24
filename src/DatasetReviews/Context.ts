import { Context } from 'effect'
import type { EventStore } from '../EventStore.js'
import type { DatasetReviewEvent } from './Events.js'

export class DatasetReviewsEventStore extends Context.Tag('DatasetReviewsEventStore')<
  DatasetReviewsEventStore,
  EventStore<DatasetReviewEvent>
>() {}
