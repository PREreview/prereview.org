import { Effect } from 'effect'
import { pageNotFound } from '../../http-error.js'

export const WriteFeedbackPage = Effect.succeed(pageNotFound)
