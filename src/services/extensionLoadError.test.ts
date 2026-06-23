import { describe, expect, it } from 'vitest'

import { classifyExtensionLoadError } from './extensionLoadError'

describe('classifyExtensionLoadError', () => {
  it('classifies a failed dynamic import as module_fetch_failed', () => {
    const error = new Error(
      'Failed to fetch dynamically imported module: https://cloud.comfy.org/extensions/RES4LYF/js/RES4LYF_dynamicWidgets.js'
    )
    expect(classifyExtensionLoadError(error)).toBe('module_fetch_failed')
  })

  it('classifies a failed sub-resource script as script_load_failed', () => {
    const error = new Error(
      'Failed to load the script kjweb_async/purify.min.js'
    )
    expect(classifyExtensionLoadError(error)).toBe('script_load_failed')
  })

  it('classifies double registration as already_registered', () => {
    const error = new Error(
      "Extension named 'ColorOverlay' already registered."
    )
    expect(classifyExtensionLoadError(error)).toBe('already_registered')
  })

  it('falls back to unknown for unrecognized and non-Error values', () => {
    expect(classifyExtensionLoadError(new Error('boom'))).toBe('unknown')
    expect(classifyExtensionLoadError('not an error object')).toBe('unknown')
  })
})
