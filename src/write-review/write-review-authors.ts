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
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
  writeReviewPersonaMatch,
} from '../routes'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, showNextForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewAuthors = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      RM.right({ preprint }),
      RM.apS('user', getUserFromSession()),
      RM.bindW(
        'form',
        RM.fromReaderTaskK(({ user }) => getForm(user.orcid, preprint.doi)),
      ),
      RM.apSW('method', RM.fromMiddleware(getMethod)),
      RM.ichainW(state => match(state).with({ method: 'POST' }, handleAuthorsForm).otherwise(showAuthorsForm)),
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

const showAuthorsForm = flow(
  fromReaderK(({ form, preprint }: { form: Form; preprint: Preprint }) =>
    authorsForm(preprint, { moreAuthors: E.right(form.moreAuthors) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showAuthorsErrorForm = (preprint: Preprint) =>
  flow(
    fromReaderK((form: AuthorsForm) => authorsForm(preprint, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleAuthorsForm = ({ form, preprint, user }: { form: Form; preprint: Preprint; user: User }) =>
  pipe(
    RM.decodeBody(body => E.right({ moreAuthors: pipe(MoreAuthorsFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('moreAuthors', fields.moreAuthors),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(updateForm(form)),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.bindTo('form'),
    RM.ichainMiddlewareKW(state =>
      match(state)
        .with({ form: { moreAuthors: 'yes' } }, () =>
          seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })),
        )
        .otherwise(flow(({ form }) => form, showNextForm(preprint.doi))),
    ),
    RM.orElseW(showAuthorsErrorForm(preprint)),
  )

const MoreAuthorsFieldD = pipe(
  D.struct({
    moreAuthors: D.literal('yes', 'no'),
  }),
  D.map(get('moreAuthors')),
)

type AuthorsForm = {
  readonly moreAuthors: E.Either<MissingE, 'yes' | 'no' | undefined>
}

function authorsForm(preprint: Preprint, form: AuthorsForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Did you write the PREreview with anyone else? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(writeReviewPersonaMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main id="form">
        <form method="post" action="${format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })}" novalidate>
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.moreAuthors)
                      ? html`
                          <li>
                            <a href="#more-authors-no">
                              ${match(form.moreAuthors.left)
                                .with(
                                  { _tag: 'MissingE' },
                                  () => 'Select yes if you wrote the PREreview with someone else',
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

          <div ${rawHtml(E.isLeft(form.moreAuthors) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(E.isLeft(form.moreAuthors) ? 'aria-invalid="true" aria-errormessage="more-authors-error"' : '')}
            >
              <legend>
                <h1>Did you write the PREreview with anyone&nbsp;else?</h1>
              </legend>

              ${E.isLeft(form.moreAuthors)
                ? html`
                    <div class="error-message" id="more-authors-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.moreAuthors.left)
                        .with({ _tag: 'MissingE' }, () => 'Select yes if you wrote the PREreview with someone else')
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      id="more-authors-no"
                      type="radio"
                      value="no"
                      ${match(form.moreAuthors)
                        .with(E.right('no' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No, by myself</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      type="radio"
                      value="yes"
                      ${match(form.moreAuthors)
                        .with(E.right('yes' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
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
