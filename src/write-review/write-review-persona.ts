import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { writeReviewMatch, writeReviewPersonaMatch, writeReviewReviewMatch } from '../routes'
import { User, getUserFromSession } from '../user'
import { Form, getForm, redirectToNextForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewPersona = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'form',
        RM.fromReaderTaskEitherK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handlePersonaForm).otherwise(showPersonaForm)),
      RM.orElseMiddlewareK(() => seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi }))),
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
  fromReaderK(({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
    personaForm(preprint, { persona: E.right(form.persona) }, user),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showPersonaErrorForm = (preprint: Preprint, user: User) =>
  flow(
    fromReaderK((form: PersonaForm) => personaForm(preprint, form, user)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handlePersonaForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
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
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareKW(redirectToNextForm(preprint.doi)),
    RM.orElseW(showPersonaErrorForm(preprint, user)),
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

function personaForm(preprint: Preprint, form: PersonaForm, user: User) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}What name would you like to use? – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewReviewMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewPersonaMatch.formatter, { doi: preprint.doi })}" novalidate>
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

              <div id="persona-tip" role="note">
                You can choose between the name on your ORCID&nbsp;profile or your PREreview&nbsp;pseudonym.
              </div>

              <details>
                <summary>What is a PREreview&nbsp;pseudonym?</summary>

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
                        .with(E.right('public' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${user.name}</span>
                  </label>
                  <div id="persona-tip-public" role="note">We’ll link your PREreview to your ORCID&nbsp;iD.</div>
                </li>
                <li>
                  <label>
                    <input
                      name="persona"
                      type="radio"
                      value="pseudonym"
                      aria-describedby="persona-tip-pseudonym"
                      ${match(form.persona)
                        .with(E.right('pseudonym' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${user.pseudonym}</span>
                  </label>
                  <div id="persona-tip-pseudonym" role="note">
                    We’ll only link your PREreview to others that also use your pseudonym.
                  </div>
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
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
