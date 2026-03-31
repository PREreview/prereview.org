import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type { SupportedLocale } from '../../locales/index.ts'
import * as Decision from './decision.ts'
import { handleDecision } from './handle-decision.ts'
import { makeDecision } from './make-decision.ts'

export const requestAPrereview = ({ locale }: { locale: SupportedLocale }) =>
  RT.of(handleDecision(Decision.ShowEmptyForm, locale))

export const requestAPrereviewSubmission = ({ body, locale }: { body: unknown; locale: SupportedLocale }) =>
  pipe(
    makeDecision({ body, method: 'POST' }),
    RT.map(decision => handleDecision(decision, locale)),
  )
