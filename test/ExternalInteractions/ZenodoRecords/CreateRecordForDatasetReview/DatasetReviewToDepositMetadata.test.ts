import { expect } from '@effect/vitest'
import { test } from '@fast-check/vitest'
import { Option } from 'effect'
import * as Datasets from '../../../../src/Datasets/index.ts'
import type { Zenodo } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ZenodoRecords/CreateRecordForDatasetReview/DatasetReviewToDepositMetadata.ts'
import { html, plainText, rawHtml } from '../../../../src/html.ts'
import * as Personas from '../../../../src/Personas/index.ts'
import { Doi, Name, NonEmptyString, OrcidId, Pseudonym } from '../../../../src/types/index.ts'

const cases = [
  [
    'all questions answered',
    {
      author: new Personas.PublicPersona({
        name: Name.Name('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      otherAuthors: [
        new Personas.PublicPersona({
          name: Name.Name('Arne Saknussemm'),
          orcidId: OrcidId.OrcidId('0000-0002-6109-0367'),
        }),
      ],
      anonymousAuthors: 2,
      dataset: new Datasets.DatasetTitle({
        id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        language: 'en',
        title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
      }),
      competingInterests: NonEmptyString.fromString(
        'Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
      ),
      qualityRating: Option.some({ rating: 'excellent', detail: Option.none() }),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: { answer: 'yes', detail: Option.none() },
      answerToIfTheDatasetHasEnoughMetadata: Option.some({ answer: 'partly', detail: Option.none() }),
      answerToIfTheDatasetHasTrackedChanges: Option.some({ answer: 'no', detail: Option.none() }),
      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some({ answer: 'unsure', detail: Option.none() }),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some({ answer: 'yes', detail: Option.none() }),
      answerToIfTheDatasetSupportsRelatedConclusions: Option.some({ answer: 'partly', detail: Option.none() }),
      answerToIfTheDatasetIsDetailedEnough: Option.some({ answer: 'no', detail: Option.none() }),
      answerToIfTheDatasetIsErrorFree: Option.some({ answer: 'unsure', detail: Option.none() }),
      answerToIfTheDatasetMattersToItsAudience: Option.some({ answer: 'very-consequential', detail: Option.none() }),
      answerToIfTheDatasetIsReadyToBeShared: Option.some({ answer: 'yes', detail: Option.none() }),
      answerToIfTheDatasetIsMissingAnything: NonEmptyString.fromString(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      ),
      url: new URL('http://example.com/dataset-review'),
    },
    {
      creators: [
        { name: 'Josiah Carberry', orcid: OrcidId.OrcidId('0000-0002-1825-0097') },
        { name: 'Arne Saknussemm', orcid: OrcidId.OrcidId('0000-0002-6109-0367') },
        { name: '2 other authors' },
      ],
      description: rawHtml(`
      <dl>
        
            <dt><span>How would you rate the quality of this data set?</span></dt>
            <dd>
              <span>Excellent</span>
            </dd>
            
          
        <dt><span>Does this dataset follow FAIR and CARE principles?</span></dt>
        <dd>
          <span>Yes</span>
        </dd>
        
        
            <dt><span>Does the dataset have enough metadata?</span></dt>
            <dd>
              <span>Partly</span>
            </dd>
            
          
        
            <dt><span>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</span></dt>
            <dd>
              <span>No</span>
            </dd>
            
          
        
            <dt><span>Does this dataset show signs of alteration beyond instances of likely human error, such as censorship, deletion, or redaction, that are not accounted for otherwise?</span></dt>
            <dd>
              <span>I don’t know</span>
            </dd>
            
          
        
            <dt><span>Is the dataset well-suited to support its stated research purpose?</span></dt>
            <dd>
              <span>Yes</span>
            </dd>
            
          
        
            <dt><span>Does this dataset support the researcher’s stated conclusions?</span></dt>
            <dd>
              <span>Partly</span>
            </dd>
            
          
        
            <dt><span>Is the dataset granular enough to be a reliable standard of measurement?</span></dt>
            <dd>
              <span>No</span>
            </dd>
            
          
        
            <dt><span>Is the dataset relatively error-free?</span></dt>
            <dd>
              <span>I don’t know</span>
            </dd>
            
          
        
            <dt><span>Is this dataset likely to be of interest to researchers in its corresponding field of study, to most researchers, or to the general public? How consequential is it likely to seem to that audience or those audiences?</span></dt>
            <dd>
              <span>Very consequential</span>
            </dd>
            
          
        
            <dt><span>Is this dataset ready to be shared?</span></dt>
            <dd>
              <span>Yes</span>
            </dd>
            
          
        
            <dt><span>What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways?</span></dt>
            <dd>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</dd>
          
      </dl>

      <h2><span>Competing interests</span></h2>

      <p>
        Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.
      </p>
    `),
      title: plainText(
        'Structured PREreview of “Metadata collected from 500 articles in the field of ecology and evolution”',
      ),
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
        },
        {
          identifier: new URL('http://example.com/dataset-review'),
          relation: 'isIdenticalTo',
          resourceType: 'publication-peerreview',
          scheme: 'url',
        },
      ],
      uploadType: 'publication',
      publicationType: 'peerreview',
    },
  ],
  [
    'all questions answered with details',
    {
      author: new Personas.PublicPersona({
        name: Name.Name('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      otherAuthors: [],
      anonymousAuthors: 1,
      dataset: new Datasets.DatasetTitle({
        id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        language: 'en',
        title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
      }),
      competingInterests: NonEmptyString.fromString(
        'Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
      ),
      qualityRating: Option.some({
        rating: 'excellent',
        detail: NonEmptyString.fromString('Some detail about the excellent rating.'),
      }),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: {
        answer: 'yes',
        detail: NonEmptyString.fromString('Some detail about the yes.'),
      },
      answerToIfTheDatasetHasEnoughMetadata: Option.some({
        answer: 'partly',
        detail: NonEmptyString.fromString('Some detail about the partly.'),
      }),
      answerToIfTheDatasetHasTrackedChanges: Option.some({
        answer: 'no',
        detail: NonEmptyString.fromString('Some detail about the no.'),
      }),
      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some({
        answer: 'unsure',
        detail: NonEmptyString.fromString('Some detail about the unsure.'),
      }),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some({
        answer: 'yes',
        detail: NonEmptyString.fromString('Some detail about the yes.'),
      }),
      answerToIfTheDatasetSupportsRelatedConclusions: Option.some({
        answer: 'partly',
        detail: NonEmptyString.fromString('Some detail about the partly.'),
      }),
      answerToIfTheDatasetIsDetailedEnough: Option.some({
        answer: 'no',
        detail: NonEmptyString.fromString('Some detail about the no.'),
      }),
      answerToIfTheDatasetIsErrorFree: Option.some({
        answer: 'unsure',
        detail: NonEmptyString.fromString('Some detail about the unsure.'),
      }),
      answerToIfTheDatasetMattersToItsAudience: Option.some({
        answer: 'very-consequential',
        detail: NonEmptyString.fromString('Some detail about the very-consequential.'),
      }),
      answerToIfTheDatasetIsReadyToBeShared: Option.some({
        answer: 'yes',
        detail: NonEmptyString.fromString('Some detail about the yes.'),
      }),
      answerToIfTheDatasetIsMissingAnything: NonEmptyString.fromString(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      ),
      url: new URL('http://example.com/dataset-review'),
    },
    {
      creators: [
        { name: 'Josiah Carberry', orcid: OrcidId.OrcidId('0000-0002-1825-0097') },
        { name: '1 other author' },
      ],
      description: rawHtml(`
      <dl>
        
            <dt><span>How would you rate the quality of this data set?</span></dt>
            <dd>
              <span>Excellent</span>
            </dd>
            <dd>Some detail about the excellent rating.</dd>
          
        <dt><span>Does this dataset follow FAIR and CARE principles?</span></dt>
        <dd>
          <span>Yes</span>
        </dd>
        <dd>Some detail about the yes.</dd>
        
            <dt><span>Does the dataset have enough metadata?</span></dt>
            <dd>
              <span>Partly</span>
            </dd>
            <dd>Some detail about the partly.</dd>
          
        
            <dt><span>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</span></dt>
            <dd>
              <span>No</span>
            </dd>
            <dd>Some detail about the no.</dd>
          
        
            <dt><span>Does this dataset show signs of alteration beyond instances of likely human error, such as censorship, deletion, or redaction, that are not accounted for otherwise?</span></dt>
            <dd>
              <span>I don’t know</span>
            </dd>
            <dd>Some detail about the unsure.</dd>
          
        
            <dt><span>Is the dataset well-suited to support its stated research purpose?</span></dt>
            <dd>
              <span>Yes</span>
            </dd>
            <dd>Some detail about the yes.</dd>
          
        
            <dt><span>Does this dataset support the researcher’s stated conclusions?</span></dt>
            <dd>
              <span>Partly</span>
            </dd>
            <dd>Some detail about the partly.</dd>
          
        
            <dt><span>Is the dataset granular enough to be a reliable standard of measurement?</span></dt>
            <dd>
              <span>No</span>
            </dd>
            <dd>Some detail about the no.</dd>
          
        
            <dt><span>Is the dataset relatively error-free?</span></dt>
            <dd>
              <span>I don’t know</span>
            </dd>
            <dd>Some detail about the unsure.</dd>
          
        
            <dt><span>Is this dataset likely to be of interest to researchers in its corresponding field of study, to most researchers, or to the general public? How consequential is it likely to seem to that audience or those audiences?</span></dt>
            <dd>
              <span>Very consequential</span>
            </dd>
            <dd>Some detail about the very-consequential.</dd>
          
        
            <dt><span>Is this dataset ready to be shared?</span></dt>
            <dd>
              <span>Yes</span>
            </dd>
            <dd>Some detail about the yes.</dd>
          
        
            <dt><span>What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways?</span></dt>
            <dd>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</dd>
          
      </dl>

      <h2><span>Competing interests</span></h2>

      <p>
        Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.
      </p>
    `),
      title: plainText(
        'Structured PREreview of “Metadata collected from 500 articles in the field of ecology and evolution”',
      ),
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
        },
        {
          identifier: new URL('http://example.com/dataset-review'),
          relation: 'isIdenticalTo',
          resourceType: 'publication-peerreview',
          scheme: 'url',
        },
      ],
      uploadType: 'publication',
      publicationType: 'peerreview',
    },
  ],
  [
    'minimal questions answered',
    {
      author: new Personas.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') }),
      otherAuthors: [],
      anonymousAuthors: 0,
      dataset: new Datasets.DatasetTitle({
        id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        language: 'en',
        title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
      }),
      competingInterests: Option.none(),
      qualityRating: Option.none(),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: { answer: 'yes', detail: Option.none() },
      answerToIfTheDatasetHasEnoughMetadata: Option.none(),
      answerToIfTheDatasetHasTrackedChanges: Option.none(),
      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.none(),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.none(),
      answerToIfTheDatasetSupportsRelatedConclusions: Option.none(),
      answerToIfTheDatasetIsDetailedEnough: Option.none(),
      answerToIfTheDatasetIsErrorFree: Option.none(),
      answerToIfTheDatasetMattersToItsAudience: Option.none(),
      answerToIfTheDatasetIsReadyToBeShared: Option.none(),
      answerToIfTheDatasetIsMissingAnything: Option.none(),
      url: new URL('http://example.com/dataset-review'),
    },
    {
      creators: [{ name: 'Orange Panda' }],
      description: rawHtml(`
      <dl>
        
        <dt><span>Does this dataset follow FAIR and CARE principles?</span></dt>
        <dd>
          <span>Yes</span>
        </dd>
        
        
        
        
        
        
        
        
        
        
        
      </dl>

      <h2><span>Competing interests</span></h2>

      <p>
        <span>The author declares that they have no competing interests.</span>
      </p>
    `),
      title: plainText(
        'Structured PREreview of “Metadata collected from 500 articles in the field of ecology and evolution”',
      ),
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
        },
        {
          identifier: new URL('http://example.com/dataset-review'),
          relation: 'isIdenticalTo',
          resourceType: 'publication-peerreview',
          scheme: 'url',
        },
      ],
      uploadType: 'publication',
      publicationType: 'peerreview',
    },
  ],
] satisfies ReadonlyArray<[string, _.DatasetReview, Zenodo.DepositMetadata]>

test.each(cases)('DatasetReviewToDepositMetadata (%s)', (_name, datasetReview, expected) => {
  const actual = _.DatasetReviewToDepositMetadata(datasetReview)

  expect(actual).toStrictEqual(expected)
})
