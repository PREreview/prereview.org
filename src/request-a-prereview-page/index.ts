import * as RT from 'fp-ts/ReaderTask'
import { flow } from 'fp-ts/function'
import { handleDecision } from './handle-decision.js'
import { makeDecision } from './make-decision.js'

export const requestAPrereview = flow(makeDecision, RT.map(handleDecision))
