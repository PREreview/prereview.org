import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { EmailAddress } from '../../src/types/EmailAddress.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { Pseudonym } from '../../src/types/Pseudonym.js'
import type { User } from '../../src/user.js'
import { publishForm } from '../../src/write-review/publish-page/publish-form.js'
import { expect, test } from '../base.js'

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User

const locale = DefaultLocale

test("content looks right when it's freeform", async ({ showPage }) => {
  const response = publishForm(
    preprint,
    {
      reviewType: 'freeform',
      alreadyWritten: 'no',
      review: html`
        <h1>Lorem ipsum</h1>
        <p>Dolor sit amet, consectetur <strong>adipiscing</strong> <em>elit</em>.</p>
        <ul>
          <li>Aenean eget velit quis sapien gravida efficitur et vitae felis.</li>
          <li>
            <ol>
              <li>Etiam libero justo, vulputate sit amet turpis non, sollicitudin ornare velit.</li>
              <li>Mauris vel lorem ac erat pulvinar sollicitudin.</li>
              <li>
                Vestibulum auctor, augue et bibendum blandit, massa est ullamcorper libero, eget finibus justo sem eget
                elit.
              </li>
            </ol>
          </li>
        </ul>
        <h2>Quisque sed venenatis arcu</h2>
        <p>
          Aliquam non enim cursus, dictum quam vel, volutpat ex. Pellentesque posuere quam tellus, sit amet scelerisque
          sem interdum non. Pellentesque eget luctus lorem. Aliquam vel lobortis metus, fringilla elementum nisi.
          Phasellus eu felis ac nulla posuere posuere. Vivamus et elit bibendum, luctus nibh quis, aliquet lacus.
          Phasellus imperdiet nibh sit amet ante porttitor lacinia. Morbi tristique placerat massa at cursus. In
          condimentum purus quis ex dapibus scelerisque. Nulla augue mauris, sollicitudin a diam vel, semper porttitor
          sapien.
        </p>
      `,
      persona: 'public',
      moreAuthors: 'no',
      generativeAiIdeas: 'no',
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when generative AI was used', async ({ showPage }) => {
  const response = publishForm(
    preprint,
    {
      reviewType: 'freeform',
      alreadyWritten: 'no',
      review: html`<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`,
      persona: 'public',
      moreAuthors: 'no',
      generativeAiIdeas: 'yes',
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when there's competing interests", async ({ showPage }) => {
  const response = publishForm(
    preprint,
    {
      reviewType: 'freeform',
      alreadyWritten: 'no',
      review: html`<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`,
      persona: 'public',
      moreAuthors: 'no',
      generativeAiIdeas: 'no',
      competingInterests: 'yes',
      competingInterestsDetails: NonEmptyString(
        'In dictum consequat nibh, quis dapibus justo consequat quis. Duis nec mi orci. Phasellus tincidunt erat vitae ex sollicitudin molestie. Mauris faucibus erat sit amet felis viverra aliquam. Quisque eget mattis ante. Nam volutpat mattis ante, porttitor porta magna auctor ut. Praesent id ipsum quis nisl suscipit feugiat at non enim. Duis placerat est id dui pulvinar, ac viverra tortor feugiat. Morbi auctor lobortis vestibulum. Nullam bibendum consequat mi. Proin accumsan eros ut eros hendrerit, quis congue eros hendrerit. Suspendisse ac gravida diam.',
      ),
      conduct: 'yes',
    },
    user,
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = publishForm(
    preprint,
    {
      reviewType: 'freeform',
      alreadyWritten: 'no',
      review: html`<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`,
      persona: 'public',
      moreAuthors: 'yes',
      otherAuthors: [
        { name: NonEmptyString('Jean-Baptiste Botul'), emailAddress: EmailAddress('jbbotul@example.com') },
        { name: NonEmptyString('Arne Saknussemm'), emailAddress: EmailAddress('asaknussemm@example.com') },
        { name: NonEmptyString('Otto Lidenbrock'), emailAddress: EmailAddress('olidenbrock@example.com') },
      ],
      generativeAiIdeas: 'no',
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when it's questions", async ({ showPage }) => {
  const response = publishForm(
    preprint,
    {
      reviewType: 'questions',
      alreadyWritten: 'no',
      introductionMatches: 'skip',
      introductionMatchesDetails: undefined,
      methodsAppropriate: 'highly-appropriate',
      methodsAppropriateDetails: undefined,
      resultsSupported: 'well-supported',
      resultsSupportedDetails: undefined,
      dataPresentation: 'neutral',
      dataPresentationDetails: undefined,
      findingsNextSteps: 'insufficiently',
      findingsNextStepsDetails: undefined,
      novel: 'no',
      novelDetails: undefined,
      languageEditing: 'yes',
      languageEditingDetails: undefined,
      shouldRead: 'yes-but',
      shouldReadDetails: undefined,
      readyFullReview: 'yes-changes',
      readyFullReviewDetails: undefined,
      persona: 'public',
      moreAuthors: 'no',
      generativeAiIdeas: 'no',
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when it's questions with details", async ({ showPage }) => {
  const response = publishForm(
    preprint,
    {
      reviewType: 'questions',
      alreadyWritten: 'no',
      introductionMatches: 'yes',
      introductionMatchesDetails: NonEmptyString(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
      ),
      methodsAppropriate: 'highly-appropriate',
      methodsAppropriateDetails: NonEmptyString('Proin massa ex, condimentum eu lobortis at, fringilla quis nisi.'),
      resultsSupported: 'well-supported',
      resultsSupportedDetails: NonEmptyString(
        'Aenean accumsan placerat quam, et egestas diam luctus at. Vestibulum nec mattis ligula. Vestibulum convallis ante sed ante fermentum congue. Curabitur quis tempus dui. Quisque nibh tellus, ornare bibendum scelerisque vel, tristique ut nunc. Nam a tempor ipsum. Sed cursus felis eget nulla efficitur porttitor. Praesent nisi eros, elementum sed vulputate sit amet, auctor eget sem.',
      ),
      dataPresentation: 'neutral',
      dataPresentationDetails: NonEmptyString('Nulla velit mi, commodo ut ex vitae, tempus commodo ligula.'),
      findingsNextSteps: 'insufficiently',
      findingsNextStepsDetails: NonEmptyString(
        'Quisque mollis pellentesque eros. Quisque ut iaculis purus. Quisque ac pretium mauris, at molestie enim. Maecenas nisl eros, consectetur vel volutpat id, porta hendrerit sapien. Sed eget arcu quam. Morbi nec magna congue, imperdiet libero vel, mattis risus. Morbi accumsan orci vel mi lobortis, luctus imperdiet ligula lacinia. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vulputate magna in augue mattis facilisis. Ut sollicitudin laoreet justo nec tincidunt.',
      ),
      novel: 'no',
      novelDetails: NonEmptyString('Sed hendrerit tempor dui, a feugiat eros semper et.'),
      languageEditing: 'yes',
      languageEditingDetails: NonEmptyString(
        'Etiam imperdiet, dui vel placerat molestie, quam nisl ultrices eros, id pulvinar magna eros sed libero.',
      ),
      shouldRead: 'yes-but',
      shouldReadDetails: NonEmptyString(
        'Vivamus bibendum, odio vel euismod malesuada, arcu sapien suscipit velit, ut consequat dui ligula at diam. Nunc consequat neque in consectetur faucibus. Integer fringilla pretium dolor vel finibus. Sed pretium dictum diam non bibendum. Nulla facilisi. Maecenas tempor erat quis libero molestie iaculis. Vestibulum vel neque non purus vulputate pellentesque in eget diam. Vestibulum vel risus ut ante mattis feugiat. Curabitur porta eget ante in imperdiet. Duis non enim vitae lacus mollis tristique. Nullam mollis egestas nunc eget feugiat. Sed a dignissim lorem, a tempus ex.',
      ),
      readyFullReview: 'yes-changes',
      readyFullReviewDetails: NonEmptyString('In iaculis sapien nec tortor mattis, vitae elementum risus blandit.'),
      persona: 'public',
      moreAuthors: 'no',
      generativeAiIdeas: 'no',
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
