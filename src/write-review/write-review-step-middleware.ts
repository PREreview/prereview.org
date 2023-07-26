import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import type * as R from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { P, match } from 'ts-pattern/dist'
import { canRapidReview } from '../feature-flags'
import { type Html, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import type { FathomEnv, PhaseEnv } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import { writeReviewMatch, writeReviewReviewTypeMatch } from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export type Step<F> = {
  notFeaturedFlaggedByRapidReview: boolean
  questionIsAnswerable: (form: Form) => boolean
  decoderThing: (body: unknown) => E.Either<F, Form>
  renderStepFormPage: (preprint: PreprintTitle, stepForm: F, user: User) => R.Reader<FathomEnv & PhaseEnv, Html>
  formToStepForm: (form: Form) => F
  whatIsTheNextStep: (user: User) => string
}
export const writeReviewStepMiddleware = <F>(step: Step<F>) =>
  flow(
    RM.fromReaderTaskEitherK(getPreprintTitle),
    RM.ichainW(preprint =>
      pipe(
        RM.right({ preprint }),
        RM.apS('user', getUser),
        RM.bindW(
          'form',
          RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
        ),
        RM.bindW(
          'canRapidReview',
          flow(
            fromReaderK(({ user }) => canRapidReview(user)),
            RM.filterOrElse(
              canRapidReview => canRapidReview || step.notFeaturedFlaggedByRapidReview,
              () => 'not-found' as const,
            ),
          ),
        ),
        RM.apSW('method', RM.fromMiddleware(getMethod)),
        RM.filterOrElseW(
          state => step.questionIsAnswerable(state.form),
          () => 'not-answerable' as const,
        ),
        RM.ichainW(state =>
          match(state)
            .with({ method: 'POST' }, handleSubmittedStep(step.decoderThing, step.renderStepFormPage))
            .otherwise(showFindingsNextStepsForm(step.renderStepFormPage, step.formToStepForm)),
        ),
        RM.orElseW(error =>
          match(error)
            .with(
              'not-answerable',
              fromMiddlewareK(() => seeOther(format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }))),
            )
            .with(
              'no-form',
              'no-session',
              fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
            )
            .with('not-found', () => notFound)
            .with('form-unavailable', P.instanceOf(Error), () => serviceUnavailable)
            .exhaustive(),
        ),
      ),
    ),
    RM.orElseW(error =>
      match(error)
        .with('not-found', () => notFound)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )
const showFindingsNextStepsForm = <F>(
  renderPage: (preprint: PreprintTitle, stepForm: F, user: User) => R.Reader<FathomEnv & PhaseEnv, Html>,
  formToStepForm: (form: Form) => F,
) =>
  flow(
    fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
      renderPage(preprint, formToStepForm(form), user),
    ),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareK(sendHtml),
  )
const handleSubmittedStep =
  <F>(
    decoderThing: (body: unknown) => E.Either<F, Form>,
    renderErrorPage: (preprint: PreprintTitle, stepForm: F, user: User) => R.Reader<FathomEnv & PhaseEnv, Html>,
  ) =>
  ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    pipe(
      RM.decodeBody(E.right),
      RM.chainEitherK(
        flow(
          decoderThing,
          E.mapLeft(stepForm => ({ type: 'form-decode-problem-thing' as const, stepForm })),
        ),
      ),
      RM.map(updateForm(form)),
      RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
      RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
      RM.orElseW(error =>
        match(error)
          .with('form-unavailable', () => serviceUnavailable)
          .with({ type: 'form-decode-problem-thing' }, ({ stepForm }) =>
            pipe(
              RM.rightReader(renderErrorPage(preprint, stepForm, user)),
              RM.ichainFirst(() => RM.status(Status.BadRequest)),
              RM.ichainMiddlewareK(sendHtml),
            ),
          )
          .exhaustive(),
      ),
    )
// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
