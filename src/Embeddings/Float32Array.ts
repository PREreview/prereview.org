import { Array, Schema } from 'effect'

export const Float32ArrayFromSelfSchema = Schema.declare(
  (input): input is Float32Array => input instanceof Float32Array,
  {
    identifier: 'Float32Array',
  },
)

export const Float32ArraySchema = Schema.transform(Schema.Array(Schema.Number), Float32ArrayFromSelfSchema, {
  strict: true,
  decode: elements => new Float32Array(elements),
  encode: array => [...array],
})

export const calcFloat32ArrayMean = (arrays: ReadonlyArray<Float32Array>): Float32Array => {
  if (!Array.isNonEmptyReadonlyArray(arrays)) {
    return new Float32Array(0)
  }

  const length = arrays[0].length
  const sum = new Float32Array(length)
  for (const array of arrays) {
    for (let i = 0; i < length; i++) {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      sum[i]! += array[i]!
    }
  }
  for (let i = 0; i < length; i++) {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    sum[i]! /= arrays.length
  }
  return sum
}
