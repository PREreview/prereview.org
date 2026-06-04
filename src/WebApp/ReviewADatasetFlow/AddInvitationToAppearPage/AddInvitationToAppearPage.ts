import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as AddInvitationToAppearForm from './AddInvitationToAppearForm.ts'

export const AddInvitationToAppearPage = ({
  datasetReviewId,
  form,
  locale,
  otherAuthors,
}: {
  datasetReviewId: Uuid.Uuid
  form: AddInvitationToAppearForm.AddInvitationToAppearForm
  locale: SupportedLocale
  otherAuthors: boolean
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(otherAuthors ? 'Add another author' : 'Add an author', errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form method="post" action="${Routes.ReviewADatasetAddInvitationToAppear.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <h1>${otherAuthors ? 'Add another author' : 'Add an author'}</h1>

        <div ${rawHtml(form._tag === 'InvalidForm' && Either.isLeft(form.name) ? 'class="error"' : '')}>
          <h2><label for="name">Name</label></h2>

          <p id="name-tip" role="note">They will be able to choose their published name.</p>
          ${form._tag === 'InvalidForm' && Either.isLeft(form.name)
            ? html`
                <div class="error-message" id="name-error">
                  <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                  ${pipe(
                    Match.value(form.name.left),
                    Match.tag('Missing', () => 'Enter their name'),
                    Match.exhaustive,
                  )}
                </div>
              `
            : ''}

          <input
            name="name"
            id="name"
            type="text"
            spellcheck="false"
            aria-describedby="name-tip"
            ${pipe(
              Match.value(form),
              Match.tag('CompletedForm', ({ name }) => html`value="${name}"`),
              Match.when({ _tag: 'InvalidForm', name: Either.isRight }, ({ name }) => html`value="${name.right}"`),
              Match.orElse(() => ''),
            )},
            ${form._tag === 'InvalidForm' && Either.isLeft(form.name)
              ? html`aria-invalid="true" aria-errormessage="name-error"`
              : ''}
          />
        </div>

        <div ${rawHtml(form._tag === 'InvalidForm' && Either.isLeft(form.emailAddress) ? 'class="error"' : '')}>
          <h2><label for="email-address">Email address</label></h2>

          <p id="email-address-tip" role="note">We’ll only use this to contact them about this PREreview.</p>
          ${form._tag === 'InvalidForm' && Either.isLeft(form.emailAddress)
            ? html`
                <div class="error-message" id="email-address-error">
                  <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                  ${pipe(
                    Match.value(form.emailAddress.left),
                    Match.tag('Missing', () => 'Enter their email address'),
                    Match.tag(
                      'Invalid',
                      () => `Enter an email address in the correct format, like name@example.com
`,
                    ),
                    Match.exhaustive,
                  )}
                </div>
              `
            : ''}

          <input
            name="emailAddress"
            id="email-address"
            type="text"
            inputmode="email"
            spellcheck="false"
            autocomplete="email"
            aria-describedby="email-address-tip"
            ${pipe(
              Match.value(form),
              Match.tag('CompletedForm', ({ emailAddress }) => html`value="${emailAddress}"`),
              Match.when(
                { _tag: 'InvalidForm', emailAddress: Either.isRight },
                ({ emailAddress }) => html`value="${emailAddress.right}"`,
              ),
              Match.when(
                {
                  _tag: 'InvalidForm',
                  emailAddress: Either.isLeft,
                },
                ({ emailAddress }) =>
                  emailAddress.left._tag === 'Invalid' ? html`value="${emailAddress.left.actual}"` : '',
              ),
              Match.orElse(() => ''),
            )},
            ${form._tag === 'InvalidForm' && Either.isLeft(form.emailAddress)
              ? html`aria-invalid="true" aria-errormessage="email-address-error"`
              : ''}
          />
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetAddInvitationToAppear.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toErrorItems = (locale: SupportedLocale) => (form: AddInvitationToAppearForm.InvalidForm) => html`
  ${Either.isLeft(form.name)
    ? html`
        <li>
          <a href="#name">
            ${pipe(
              Match.value(form.name.left),
              Match.tag('Missing', () => 'Enter their name'),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : ''}
  ${Either.isLeft(form.emailAddress)
    ? html`
        <li>
          <a href="#email-address">
            ${pipe(
              Match.value(form.emailAddress.left),
              Match.tag('Missing', () => 'Enter their email address'),
              Match.tag(
                'Invalid',
                () => `Enter an email address in the correct format, like name@example.com
`,
              ),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : ''}
`
