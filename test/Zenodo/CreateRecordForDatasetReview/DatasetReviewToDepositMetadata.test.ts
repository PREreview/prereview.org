import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Option } from 'effect'
import * as Datasets from '../../../src/Datasets/index.ts'
import type { Zenodo } from '../../../src/ExternalApis/index.ts'
import * as Personas from '../../../src/Personas/index.ts'
import * as _ from '../../../src/Zenodo/CreateRecordForDatasetReview/DatasetReviewToDepositMetadata.ts'
import { rawHtml } from '../../../src/html.ts'
import { Doi, NonEmptyString, OrcidId, Pseudonym } from '../../../src/types/index.ts'

const cases = [
  [
    'all questions answered',
    {
      author: new Personas.PublicPersona({
        name: NonEmptyString.NonEmptyString('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      dataset: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
      competingInterests: NonEmptyString.fromString(
        'Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
      ),
      qualityRating: Option.some('excellent'),
      qualityRatingDetail: Option.none(),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
      answerToIfTheDatasetFollowsFairAndCarePrinciplesDetail: Option.none(),
      answerToIfTheDatasetHasEnoughMetadata: Option.some('partly'),
      answerToIfTheDatasetHasTrackedChanges: Option.some('no'),
      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('unsure'),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some('yes'),
      answerToIfTheDatasetSupportsRelatedConclusions: Option.some('partly'),
      answerToIfTheDatasetIsDetailedEnough: Option.some('no'),
      answerToIfTheDatasetIsErrorFree: Option.some('unsure'),
      answerToIfTheDatasetMattersToItsAudience: Option.some('very-consequential'),
      answerToIfTheDatasetIsReadyToBeShared: Option.some('yes'),
      answerToIfTheDatasetIsMissingAnything: NonEmptyString.fromString(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      ),
    },
    {
      creators: [{ name: 'Josiah Carberry', orcid: OrcidId.OrcidId('0000-0002-1825-0097') }],
      description: rawHtml(`
    <dl>
      
          <dt>How would you rate the quality of this data set?</dt>
          <dd>
            Excellent
          </dd>
          
        
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
      <dd>
        Yes
      </dd>
      
      
          <dt>Does the dataset have enough metadata?</dt>
          <dd>
            Partly
          </dd>
        
      
          <dt>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</dt>
          <dd>
            No
          </dd>
        
      
          <dt>
            Does this dataset show signs of alteration beyond instances of likely human error, such as censorship,
            deletion, or redaction, that are not accounted for otherwise?
          </dt>
          <dd>
            I don’t know
          </dd>
        
      
          <dt>Is the dataset well-suited to support its stated research purpose?</dt>
          <dd>
            Yes
          </dd>
        
      
          <dt>Does this dataset support the researcher’s stated conclusions?</dt>
          <dd>
            Partly
          </dd>
        
      
          <dt>Is the dataset granular enough to be a reliable standard of measurement?</dt>
          <dd>
            No
          </dd>
        
      
          <dt>Is the dataset relatively error-free?</dt>
          <dd>
            I don’t know
          </dd>
        
      
          <dt>
            Is this dataset likely to be of interest to researchers in its corresponding field of study, to most
            researchers, or to the general public? How consequential is it likely to seem to that audience or those
            audiences?
          </dt>
          <dd>
            Very consequential
          </dd>
        
      
          <dt>Is this dataset ready to be shared?</dt>
          <dd>
            Yes
          </dd>
        
      
          <dt>
            What else, if anything, would it be helpful for the researcher to include with this dataset to make it
            easier to find, understand and reuse in ethical and responsible ways?
          </dt>
          <dd>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</dd>
        
    </dl>

    <h2>Competing interests</h2>

    <p>
      Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.
    </p>
  `),
      title: 'Dataset review',
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
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
        name: NonEmptyString.NonEmptyString('Josiah Carberry'),
        orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
      }),
      dataset: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
      competingInterests: NonEmptyString.fromString(
        'Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.',
      ),
      qualityRating: Option.some('excellent'),
      qualityRatingDetail: NonEmptyString.fromString('Some detail about the excellent rating.'),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
      answerToIfTheDatasetFollowsFairAndCarePrinciplesDetail: NonEmptyString.fromString('Some detail about the yes.'),
      answerToIfTheDatasetHasEnoughMetadata: Option.some('partly'),
      answerToIfTheDatasetHasTrackedChanges: Option.some('no'),
      answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('unsure'),
      answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some('yes'),
      answerToIfTheDatasetSupportsRelatedConclusions: Option.some('partly'),
      answerToIfTheDatasetIsDetailedEnough: Option.some('no'),
      answerToIfTheDatasetIsErrorFree: Option.some('unsure'),
      answerToIfTheDatasetMattersToItsAudience: Option.some('very-consequential'),
      answerToIfTheDatasetIsReadyToBeShared: Option.some('yes'),
      answerToIfTheDatasetIsMissingAnything: NonEmptyString.fromString(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      ),
    },
    {
      creators: [{ name: 'Josiah Carberry', orcid: OrcidId.OrcidId('0000-0002-1825-0097') }],
      description: rawHtml(`
    <dl>
      
          <dt>How would you rate the quality of this data set?</dt>
          <dd>
            Excellent
          </dd>
          <dd>Some detail about the excellent rating.</dd>
        
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
      <dd>
        Yes
      </dd>
      <dd>Some detail about the yes.</dd>
      
          <dt>Does the dataset have enough metadata?</dt>
          <dd>
            Partly
          </dd>
        
      
          <dt>Does this dataset include a way to list or track changes or versions? If so, does it seem accurate?</dt>
          <dd>
            No
          </dd>
        
      
          <dt>
            Does this dataset show signs of alteration beyond instances of likely human error, such as censorship,
            deletion, or redaction, that are not accounted for otherwise?
          </dt>
          <dd>
            I don’t know
          </dd>
        
      
          <dt>Is the dataset well-suited to support its stated research purpose?</dt>
          <dd>
            Yes
          </dd>
        
      
          <dt>Does this dataset support the researcher’s stated conclusions?</dt>
          <dd>
            Partly
          </dd>
        
      
          <dt>Is the dataset granular enough to be a reliable standard of measurement?</dt>
          <dd>
            No
          </dd>
        
      
          <dt>Is the dataset relatively error-free?</dt>
          <dd>
            I don’t know
          </dd>
        
      
          <dt>
            Is this dataset likely to be of interest to researchers in its corresponding field of study, to most
            researchers, or to the general public? How consequential is it likely to seem to that audience or those
            audiences?
          </dt>
          <dd>
            Very consequential
          </dd>
        
      
          <dt>Is this dataset ready to be shared?</dt>
          <dd>
            Yes
          </dd>
        
      
          <dt>
            What else, if anything, would it be helpful for the researcher to include with this dataset to make it
            easier to find, understand and reuse in ethical and responsible ways?
          </dt>
          <dd>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</dd>
        
    </dl>

    <h2>Competing interests</h2>

    <p>
      Donec egestas, ante non hendrerit commodo, magna arcu ultricies augue, et pulvinar purus nisi quis sem.
    </p>
  `),
      title: 'Dataset review',
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
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
      dataset: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
      competingInterests: Option.none(),
      qualityRating: Option.none(),
      qualityRatingDetail: Option.none(),
      answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
      answerToIfTheDatasetFollowsFairAndCarePrinciplesDetail: Option.none(),
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
    },
    {
      creators: [{ name: 'Orange Panda' }],
      description: rawHtml(`
    <dl>
      
      <dt>Does this dataset follow FAIR and CARE principles?</dt>
      <dd>
        Yes
      </dd>
      
      
      
      
      
      
      
      
      
      
      
    </dl>

    <h2>Competing interests</h2>

    <p>
      The author declares that they have no competing interests.
    </p>
  `),
      title: 'Dataset review',
      communities: [{ identifier: 'prereview-reviews' }],
      relatedIdentifiers: [
        {
          identifier: Doi.Doi('10.5061/dryad.wstqjq2n3'),
          relation: 'reviews',
          resourceType: 'dataset',
          scheme: 'doi',
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
