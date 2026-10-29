import { Tokenizer } from '@huggingface/tokenizers'
import { describe, expect, it } from 'vitest'
import { truncateToModelLimit } from './OpenRouter.ts'
import tokenizerJson from './model/tokenizer.json' with { type: 'json' }
import tokenizerConfig from './model/tokenizer_config.json' with { type: 'json' }

const oneTokenPerLetterVocab: Record<string, number> = {
  '[PAD]': 0,
  '[UNK]': 100,
  '[CLS]': 101,
  '[SEP]': 102,
}

'abcdefghijklmnopqrstuvwxyz'.split('').forEach((letter, index) => {
  oneTokenPerLetterVocab[letter] = index + 1
})

const specialToken = (id: string, tokenId: number) => ({
  id: tokenId,
  content: id,
  single_word: false,
  lstrip: false,
  rstrip: false,
  normalized: false,
  special: true,
})

const gteLargeShapedTokenizer = new Tokenizer(
  {
    version: '1.0',
    truncation: { direction: 'Right', max_length: 128, strategy: 'LongestFirst', stride: 0 },
    padding: {
      strategy: { Fixed: 128 },
      direction: 'Right',
      pad_to_multiple_of: null,
      pad_id: 0,
      pad_type_id: 0,
      pad_token: '[PAD]',
    },
    added_tokens: [
      specialToken('[PAD]', 0),
      specialToken('[UNK]', 100),
      specialToken('[CLS]', 101),
      specialToken('[SEP]', 102),
    ],
    normalizer: {
      type: 'BertNormalizer',
      clean_text: true,
      handle_chinese_chars: true,
      strip_accents: null,
      lowercase: true,
    },
    pre_tokenizer: { type: 'BertPreTokenizer' },
    post_processor: {
      type: 'TemplateProcessing',
      single: [
        { SpecialToken: { id: '[CLS]', type_id: 0 } },
        { Sequence: { id: 'A', type_id: 0 } },
        { SpecialToken: { id: '[SEP]', type_id: 0 } },
      ],
      special_tokens: {
        '[CLS]': { id: '[CLS]', ids: [101], tokens: ['[CLS]'] },
        '[SEP]': { id: '[SEP]', ids: [102], tokens: ['[SEP]'] },
      },
    },
    decoder: { type: 'WordPiece', prefix: '##', cleanup: true },
    model: {
      type: 'WordPiece',
      unk_token: '[UNK]',
      continuing_subword_prefix: '##',
      max_input_chars_per_word: 100,
      vocab: oneTokenPerLetterVocab,
    },
  },
  {
    cls_token: '[CLS]',
    sep_token: '[SEP]',
    unk_token: '[UNK]',
    pad_token: '[PAD]',
    do_lower_case: true,
    tokenizer_class: 'BertTokenizer',
  },
)

const tokensChargedByEndpointFor = (text: string) => gteLargeShapedTokenizer.encode(text).ids.length

const letters = (count: number) =>
  Array.from({ length: count }, (_, index) => 'abcdefghijklmnopqrstuvwxyz'[index % 26]).join(' ')

describe('truncateToModelLimit', () => {
  it('returns the text unchanged, with its original casing and accents, when it fits', () => {
    const text = 'Héllo World: a study of COVID-19 in Zürich.'

    expect(truncateToModelLimit(text, 512, gteLargeShapedTokenizer)).toBe(text)
  })

  it('cuts over-long text to a prefix of the original, not a rebuild of it', () => {
    const text = letters(200)

    const result = truncateToModelLimit(text, 32, gteLargeShapedTokenizer)

    expect(text.startsWith(result)).toBe(true)
    expect(result.length).toBeLessThan(text.length)
  })

  it('never sends [CLS] or [SEP] as literal text', () => {
    const result = truncateToModelLimit(letters(200), 32, gteLargeShapedTokenizer)

    expect(result).not.toContain('[CLS]')
    expect(result).not.toContain('[SEP]')
  })

  it('stays inside the window once the endpoint has added its own special tokens', () => {
    for (const maxTokens of [8, 32, 128, 512]) {
      expect(
        tokensChargedByEndpointFor(truncateToModelLimit(letters(2000), maxTokens, gteLargeShapedTokenizer)),
      ).toBeLessThanOrEqual(maxTokens)
    }
  })

  it('uses the whole window apart from the two special tokens', () => {
    const result = truncateToModelLimit(letters(200), 32, gteLargeShapedTokenizer)

    expect(tokensChargedByEndpointFor(result)).toBe(32)
  })

  it('returns nothing when the window cannot fit even the special tokens', () => {
    expect(truncateToModelLimit(letters(10), 2, gteLargeShapedTokenizer)).toBe('')
  })

  it('counts past the 128-token truncation pinned in the published tokenizer file', () => {
    expect(gteLargeShapedTokenizer.encode(letters(300)).ids.length).toBeGreaterThan(128)
  })
})

describe('truncateToModelLimit', () => {
  const tokenizer: Tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig)

  it('does not regress in performance across repeated calls on long text', () => {
    const sentence = 'The quick brown fox jumps over the lazy dog. '
    const text = sentence.repeat(Math.ceil(5000 / sentence.length)).slice(0, 5000)
    const iterations = 100

    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      truncateToModelLimit(text, 512, tokenizer)
    }

    const durationMs = performance.now() - start

    expect(durationMs).toBeLessThan(1000)
  })
})
