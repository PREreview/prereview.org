import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import { html } from '../../src/html'
import type { PreprintTitle } from '../../src/preprint'
import type { EmailAddress } from '../../src/types/email-address'
import type { Pseudonym } from '../../src/types/pseudonym'
import type { NonEmptyString } from '../../src/types/string'
import type { User } from '../../src/user'
import { publishForm } from '../../src/write-review/publish-page/publish-form'
import { expect, test } from '../base'

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: 'Josiah Carberry',
  orcid: '0000-0002-1825-0097' as Orcid,
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User

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
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
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
      competingInterests: 'yes',
      competingInterestsDetails:
        'In dictum consequat nibh, quis dapibus justo consequat quis. Duis nec mi orci. Phasellus tincidunt erat vitae ex sollicitudin molestie. Mauris faucibus erat sit amet felis viverra aliquam. Quisque eget mattis ante. Nam volutpat mattis ante, porttitor porta magna auctor ut. Praesent id ipsum quis nisl suscipit feugiat at non enim. Duis placerat est id dui pulvinar, ac viverra tortor feugiat. Morbi auctor lobortis vestibulum. Nullam bibendum consequat mi. Proin accumsan eros ut eros hendrerit, quis congue eros hendrerit. Suspendisse ac gravida diam.' as NonEmptyString,
      conduct: 'yes',
    },
    user,
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
        { name: 'Jean-Baptiste Botul' as NonEmptyString, emailAddress: 'jbbotul@example.com' as EmailAddress },
        { name: 'Arne Saknussemm' as NonEmptyString, emailAddress: 'asaknussemm@example.com' as EmailAddress },
        { name: 'Otto Lidenbrock' as NonEmptyString, emailAddress: 'olidenbrock@example.com' as EmailAddress },
      ],
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
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
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
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
      introductionMatchesDetails:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.' as NonEmptyString,
      methodsAppropriate: 'highly-appropriate',
      methodsAppropriateDetails: 'Proin massa ex, condimentum eu lobortis at, fringilla quis nisi.' as NonEmptyString,
      resultsSupported: 'well-supported',
      resultsSupportedDetails:
        'Aenean accumsan placerat quam, et egestas diam luctus at. Vestibulum nec mattis ligula. Vestibulum convallis ante sed ante fermentum congue. Curabitur quis tempus dui. Quisque nibh tellus, ornare bibendum scelerisque vel, tristique ut nunc. Nam a tempor ipsum. Sed cursus felis eget nulla efficitur porttitor. Praesent nisi eros, elementum sed vulputate sit amet, auctor eget sem.' as NonEmptyString,
      dataPresentation: 'neutral',
      dataPresentationDetails: 'Nulla velit mi, commodo ut ex vitae, tempus commodo ligula.' as NonEmptyString,
      findingsNextSteps: 'insufficiently',
      findingsNextStepsDetails:
        'Quisque mollis pellentesque eros. Quisque ut iaculis purus. Quisque ac pretium mauris, at molestie enim. Maecenas nisl eros, consectetur vel volutpat id, porta hendrerit sapien. Sed eget arcu quam. Morbi nec magna congue, imperdiet libero vel, mattis risus. Morbi accumsan orci vel mi lobortis, luctus imperdiet ligula lacinia. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vulputate magna in augue mattis facilisis. Ut sollicitudin laoreet justo nec tincidunt.' as NonEmptyString,
      novel: 'no',
      novelDetails: 'Sed hendrerit tempor dui, a feugiat eros semper et.' as NonEmptyString,
      languageEditing: 'yes',
      languageEditingDetails:
        'Etiam imperdiet, dui vel placerat molestie, quam nisl ultrices eros, id pulvinar magna eros sed libero.' as NonEmptyString,
      shouldRead: 'yes-but',
      shouldReadDetails:
        'Vivamus bibendum, odio vel euismod malesuada, arcu sapien suscipit velit, ut consequat dui ligula at diam. Nunc consequat neque in consectetur faucibus. Integer fringilla pretium dolor vel finibus. Sed pretium dictum diam non bibendum. Nulla facilisi. Maecenas tempor erat quis libero molestie iaculis. Vestibulum vel neque non purus vulputate pellentesque in eget diam. Vestibulum vel risus ut ante mattis feugiat. Curabitur porta eget ante in imperdiet. Duis non enim vitae lacus mollis tristique. Nullam mollis egestas nunc eget feugiat. Sed a dignissim lorem, a tempus ex.' as NonEmptyString,
      readyFullReview: 'yes-changes',
      readyFullReviewDetails: 'In iaculis sapien nec tortor mattis, vitae elementum risus blandit.' as NonEmptyString,
      persona: 'public',
      moreAuthors: 'no',
      competingInterests: 'no',
      conduct: 'yes',
    },
    user,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
