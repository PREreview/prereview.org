export function shouldNotBeCalled(): never {
  throw new Error('should not be called')
}
