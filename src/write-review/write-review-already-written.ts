import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import type * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canRapidReview } from '../feature-flags'
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  preprintReviewsMatch,
  writeReviewAlreadyWrittenMatch,
  writeReviewMatch,
  writeReviewReviewMatch,
  writeReviewReviewTypeMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, createForm, getForm, saveForm, updateForm } from './form'

export const writeReviewAlreadyWritten = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        flow(
          RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
          RM.orElse(() => RM.of(createForm())),
        ),
      ),
      RM.bindW(
        'canRapidReview',
        fromReaderK(({ user }) => canRapidReview(user)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleAlreadyWrittenForm).otherwise(showAlreadyWrittenForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
          .with(P.instanceOf(Error), () => serviceUnavailable)
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

const showAlreadyWrittenForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    alreadyWrittenForm(preprint, { alreadyWritten: E.right(form.alreadyWritten) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAlreadyWrittenErrorForm = (preprint: PreprintTitle, user: User) =>
  flow(
    fromReaderK((form: AlreadyWrittenForm) => alreadyWrittenForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleAlreadyWrittenForm = ({
  canRapidReview,
  form,
  preprint,
  user,
}: {
  canRapidReview: boolean
  form: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    RM.decodeBody(body => E.right({ alreadyWritten: pipe(AlreadyWrittenFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('alreadyWritten', fields.alreadyWritten),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainMiddlewareK(form =>
      seeOther(
        format(
          (canRapidReview && form.alreadyWritten === 'no' ? writeReviewReviewTypeMatch : writeReviewReviewMatch)
            .formatter,
          { id: preprint.id },
        ),
      ),
    ),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ alreadyWritten: P.any }, showAlreadyWrittenErrorForm(preprint, user))
        .exhaustive(),
    ),
  )

const AlreadyWrittenFieldD = pipe(
  D.struct({
    alreadyWritten: D.literal('yes', 'no'),
  }),
  D.map(get('alreadyWritten')),
)

type AlreadyWrittenForm = {
  readonly alreadyWritten: E.Either<MissingE, 'yes' | 'no' | undefined>
}

function alreadyWrittenForm(preprint: PreprintTitle, form: AlreadyWrittenForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Have you already written your PREreview? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back">Back to preprint</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewAlreadyWrittenMatch.formatter, { id: preprint.id })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.alreadyWritten)
                      ? html`
                          <li>
                            <a href="#already-written-no">
                              ${match(form.alreadyWritten.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select yes if you have already written your PREreview',
                                )
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.alreadyWritten) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.alreadyWritten) ? 'aria-invalid="true" aria-errormessage="already-written-error"' : '',
              )}
            >
              <legend>
                <h1>Have you already written your PREreview?</h1>
              </legend>

              ${E.isLeft(form.alreadyWritten)
                ? html`
                    <div class="error-message" id="already-written-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.alreadyWritten.left)
                        .with({ _tag: 'MissingE' }, () => 'Select yes if you have already written your PREreview')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="alreadyWritten"
                      id="already-written-no"
                      type="radio"
                      value="no"
                      ${match(form.alreadyWritten)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="alreadyWritten"
                      type="radio"
                      value="yes"
                      ${match(form.alreadyWritten)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    user,
  })
}

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
