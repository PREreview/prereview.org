import { parseSync } from 'oxc-parser'

const directive = /^\s*(?:prettier-ignore|oxlint-|eslint-|@ts-|global\s)/

const effectfulExpressions = new Set([
  'AssignmentExpression',
  'AwaitExpression',
  'CallExpression',
  'ChainExpression',
  'NewExpression',
  'TaggedTemplateExpression',
  'UpdateExpression',
  'YieldExpression',
])

const isProse = statement =>
  statement.type === 'EmptyStatement' ||
  (statement.type === 'LabeledStatement' && isProse(statement.body)) ||
  (statement.type === 'ExpressionStatement' && !effectfulExpressions.has(statement.expression.type))

const statementsOf = source => {
  const { errors, program } = parseSync('comment.ts', source, { lang: 'ts' })

  return errors.length === 0 ? program.body : undefined
}

const containsCode = statements => statements !== undefined && statements.some(statement => !isProse(statement))

export const isCode = text => {
  if (text.trim() === '' || directive.test(text)) {
    return false
  }

  return (
    containsCode(statementsOf(text)) ||
    containsCode(statementsOf(`async function wrapper() {\n${text}\n}`)?.[0]?.body.body)
  )
}

const textOf = comment =>
  comment.type === 'Line'
    ? comment.value
    : comment.value
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, ''))
        .join('\n')

const blocksOf = (comments, sourceText) => {
  const blocks = []

  for (const comment of comments) {
    const previous = blocks.at(-1)?.at(-1)

    if (
      previous?.type === 'Line' &&
      comment.type === 'Line' &&
      /^[^\S\n]*\n[^\S\n]*$/.test(sourceText.slice(previous.range[1], comment.range[0]))
    ) {
      blocks.at(-1).push(comment)
    } else {
      blocks.push([comment])
    }
  }

  return blocks
}

export default {
  meta: { name: 'comments' },
  rules: {
    'no-commented-out-code': {
      meta: { schema: [] },
      create(context) {
        return {
          Program() {
            const { sourceCode } = context
            const comments = sourceCode
              .getAllComments()
              .filter(comment => !(comment.type === 'Block' && comment.value.startsWith('*')))

            for (const block of blocksOf(comments, sourceCode.text)) {
              if (isCode(block.map(textOf).join('\n'))) {
                context.report({
                  loc: { start: block[0].loc.start, end: block.at(-1).loc.end },
                  message: 'Remove commented-out code.',
                })
              }
            }
          },
        }
      },
    },
  },
}
