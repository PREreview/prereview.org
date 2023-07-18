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
import { type MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { type PreprintTitle, getPreprintTitle } from '../preprint'
import {
  writeReviewMatch,
  writeReviewMethodsAppropriateMatch,
  writeReviewPersonaMatch,
  writeReviewReviewMatch,
} from '../routes'
import { type User, getUser } from '../user'
import { type Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'

export const writeReviewPersona = flow(
  RM.fromReaderTaskEitherK(getPreprintTitle),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUser),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.id)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handlePersonaForm).otherwise(showPersonaForm)),
      RM.orElseW(error =>
        match(error)
          .with(
            'no-form',
            'no-session',
            fromMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { id: preprint.id }))),
          )
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

const showPersonaForm = flow(
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
    personaForm(preprint, { persona: E.right(form.persona) }, form.reviewType, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showPersonaErrorForm = (preprint: PreprintTitle, user: User, originalForm: Form) =>
  flow(
    fromReaderK((form: PersonaForm) => personaForm(preprint, form, originalForm.reviewType, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handlePersonaForm = ({ form, preprint, user }: { form: Form; preprint: PreprintTitle; user: User }) =>
  pipe(
    RM.decodeBody(body => E.right({ persona: pipe(PersonaFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('persona', fields.persona),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskEitherKW(saveForm(user.orcid, preprint.id)),
    RM.ichainW(form => redirectToNextForm(preprint.id)(form, user)),
    RM.orElseW(error =>
      match(error)
        .with('form-unavailable', () => serviceUnavailable)
        .with({ persona: P.any }, showPersonaErrorForm(preprint, user, form))
        .exhaustive(),
    ),
  )

const PersonaFieldD = pipe(
  D.struct({
    persona: D.literal('public', 'pseudonym'),
  }),
  D.map(get('persona')),
)

type PersonaForm = {
  readonly persona: E.Either<MissingE, 'public' | 'pseudonym' | undefined>
}

function personaForm(
  preprint: PreprintTitle,
  form: PersonaForm,
  reviewType: 'freeform' | 'questions' | undefined,
  user: User,
) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}What name would you like to use? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a
          href="${format(
            (reviewType === 'questions' ? writeReviewMethodsAppropriateMatch : writeReviewReviewMatch).formatter,
            { id: preprint.id },
          )}"
          class="back"
          >Back</a
        >
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.persona)
                      ? html`
                          <li>
                            <a href="#persona-public">
                              ${match(form.persona.left)
                                .with({ _tag: 'MissingE' }, () => 'Select the name that you would like to use')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.persona) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              aria-describedby="persona-tip"
              ${rawHtml(E.isLeft(form.persona) ? 'aria-invalid="true" aria-errormessage="persona-error"' : '')}
            >
              <legend>
                <h1>What name would you like to use?</h1>
              </legend>

              <p id="persona-tip" role="note">
                You can choose between the name on your ORCID&nbsp;profile or your PREreview&nbsp;pseudonym.
              </p>

              <details>
                <summary><span>What is a PREreview&nbsp;pseudonym?</span></summary>

                <div>
                  <p>
                    A <dfn>PREreview&nbsp;pseudonym</dfn> is an alternate name you can use instead of your
                    real&nbsp;name. It is unique and combines a random color and animal. Your pseudonym is
                    ‘${rawHtml(user.pseudonym.replace(' ', '&nbsp;'))}.’
                  </p>

                  <p>
                    Using your pseudonym, you can contribute to open preprint review without fearing retribution or
                    judgment that may occur when using your real name. However, using a pseudonym retains an element of
                    accountability.
                  </p>
                </div>
              </details>

              ${E.isLeft(form.persona)
                ? html`
                    <div class="error-message" id="persona-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.persona.left)
                        .with({ _tag: 'MissingE' }, () => 'Select the name that you would like to use')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="persona"
                      id="persona-public"
                      type="radio"
                      value="public"
                      aria-describedby="persona-tip-public"
                      ${match(form.persona)
                        .with({ right: 'public' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${user.name}</span>
                  </label>
                  <p id="persona-tip-public" role="note">We’ll link your PREreview to your ORCID&nbsp;iD.</p>
                </li>
                <li>
                  <label>
                    <input
                      name="persona"
                      type="radio"
                      value="pseudonym"
                      aria-describedby="persona-tip-pseudonym"
                      ${match(form.persona)
                        .with({ right: 'pseudonym' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${user.pseudonym}</span>
                  </label>
                  <p id="persona-tip-pseudonym" role="note">
                    We’ll only link your PREreview to others that also use your pseudonym.
                  </p>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Save and continue</button>
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
