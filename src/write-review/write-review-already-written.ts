import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Option } from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import { Lazy, flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import { getSession } from 'hyper-ts-session'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { preprintMatch, writeReviewAlreadyWrittenMatch, writeReviewMatch, writeReviewReviewMatch } from '../routes'
import { User, getUserFromSession } from '../user'
import { Form, createForm, getForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAlreadyWritten = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', pipe(getSession(), chainOptionKW(() => 'no-session' as const)(getUserFromSession))),
      RM.bindW(
        'form',
        flow(
          RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.doi)),
          RM.orElse(() => RM.of(createForm())),
        ),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state =>
        match(state).with({ method: 'POST' }, handleAlreadyWrittenForm).otherwise(showAlreadyWrittenForm),
      ),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
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
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
    alreadyWrittenForm(preprint, { alreadyWritten: E.right(form.alreadyWritten) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAlreadyWrittenErrorForm = (preprint: Preprint, user: User) =>
  flow(
    fromReaderK((form: AlreadyWrittenForm) => alreadyWrittenForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleAlreadyWrittenForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
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
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareK(() => seeOther(format(writeReviewReviewMatch.formatter, { doi: preprint.doi }))),
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

function alreadyWrittenForm(preprint: Preprint, form: AlreadyWrittenForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Have you already written your PREreview? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(preprintMatch.formatter, { doi: preprint.doi })}" class="back">Back to preprint</a>
      </nav>

      <main id="form">
        <form
          method="post"
          action="${format(writeReviewAlreadyWrittenMatch.formatter, { doi: preprint.doi })}"
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
    user,
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/80
function chainOptionKW<E2>(
  onNone: Lazy<E2>,
): <A, B>(
  f: (a: A) => Option<B>,
) => <R, I, E1>(ma: RM.ReaderMiddleware<R, I, I, E1, A>) => RM.ReaderMiddleware<R, I, I, E1 | E2, B> {
  return f => RM.ichainMiddlewareKW((...a) => M.fromOption(onNone)(f(...a)))
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
