import { Data } from 'effect'

export class ReviewRequestHasAlreadyBeenReceived extends Data.TaggedError('ReviewRequestHasAlreadyBeenReceived') {}
