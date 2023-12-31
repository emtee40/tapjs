import { ScalarTag } from 'yaml'

export const date: ScalarTag = {
  tag: '!date',

  // use !!timestamp instead, this is for parsing only
  /* c8 ignore start */
  identify() {
    return false
  },
  /* c8 ignore stop */

  resolve(src) {
    const d = new Date(src)
    const t = d.getTime()
    if (t !== t) {
      throw new Error(`Invalid date string: ${src}`)
    }
    return d
  },
}
