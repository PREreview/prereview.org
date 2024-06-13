import * as RT from 'fp-ts/lib/ReaderTask.js'
import { flow } from 'fp-ts/lib/function.js'
import { handleDecision } from './handle-decision.js'
import { makeDecision } from './make-decision.js'

export const requestAPrereview = flow(makeDecision, RT.map(handleDecision))
