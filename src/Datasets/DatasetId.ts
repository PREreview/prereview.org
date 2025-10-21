import { Url } from '@effect/platform'
import { Data, Either, flow, Match, Option, pipe, type Predicate, Schema, Tuple } from 'effect'
import { Doi } from '../types/index.ts'

export type DatasetId = typeof DatasetId.Type

export class DryadDatasetId extends Schema.TaggedClass<DryadDatasetId>()('DryadDatasetId', {
  value: Doi.RegistrantDoiSchema('5061', '6071', '6078', '7272', '25338'),
}) {}

export const DatasetId = Schema.Union(DryadDatasetId)

const DatasetDoiSchema = DryadDatasetId.fields.value

export const DatasetIdFromDoi = Schema.transform(DatasetDoiSchema, Schema.typeSchema(DatasetId), {
  strict: true,
  decode: doi => new DryadDatasetId({ value: doi }),
  encode: datasetId => datasetId.value,
})

export const DatasetIdFromString = Schema.transform(
  Schema.TemplateLiteralParser('doi:', DatasetIdFromDoi),
  Schema.typeSchema(DatasetId),
  {
    strict: true,
    decode: Tuple.getSecond,
    encode: id => Tuple.make('doi:' as const, id),
  },
)

export const isDatasetDoi: Predicate.Refinement<Doi.Doi, DatasetId['value']> = Schema.is(DatasetDoiSchema)

export const parseDatasetDoi: (input: string) => Option.Option<DatasetId> = Schema.decodeOption(DatasetIdFromDoi)

export const fromUrl = (url: URL): Option.Option<DatasetId> =>
  pipe(
    Match.value(Url.mutate(url, url => (url.hostname = url.hostname.replace('www.', '')))),
    Match.when(
      url => ['doi.org', 'dx.doi.org'].includes(url.hostname),
      url => extractFromDoiPath(url.pathname.slice(1)),
    ),
    Match.when(
      url => url.hostname === 'datadryad.org',
      url => extractFromDryadPath(url.pathname.slice(1)),
    ),
    Match.orElse(Option.none<DatasetId>),
  )

class UnsupportedDoi extends Data.TaggedError('UnsupportedDoi')<{ doi: Doi.Doi }> {}

class UnsupportedUrl extends Data.TaggedError('UnsupportedUrl')<{ url: URL }> {}

export const parseDatasetIdInput = pipe(
  Match.type<Doi.Doi | URL>(),
  Match.withReturnType<Either.Either<DatasetId, UnsupportedDoi | UnsupportedUrl>>(),
  Match.when(Match.string, doi => Either.fromOption(parseDatasetDoi(doi), () => new UnsupportedDoi({ doi }))),
  Match.when({ href: Match.string }, url => Either.fromOption(fromUrl(url), () => new UnsupportedUrl({ url }))),
  Match.exhaustive,
)

const extractFromDoiPath = flow(decodeURIComponent, parseDatasetDoi)

const extractFromDryadPath = flow(
  decodeURIComponent,
  Option.liftNullable(s => /^dataset\/doi:(.+?)\/?$/i.exec(s)?.[1]),
  Option.filter(Schema.is(DryadDatasetId.fields.value)),
  Option.andThen(doi => new DryadDatasetId({ value: doi })),
)
