import { Effect } from 'effect'
import { havingProblemsPage } from '../../http-error.js'

export const EnterFeedbackPage = () => Effect.succeed(havingProblemsPage)
