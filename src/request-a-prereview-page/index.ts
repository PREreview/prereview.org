import * as R from 'fp-ts/Reader'
import { flow } from 'fp-ts/function'
import { handleDecision } from './handle-decision'
import { makeDecision } from './make-decision'

export const requestAPrereview = flow(makeDecision, R.map(handleDecision))
