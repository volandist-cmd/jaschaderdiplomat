import type { ModuleData, QuizSet } from '@/domain/models/types'

/**
 * Data loader for quiz content.
 * Every module lives in exactly one JSON file (`${id}.json`) shaped like
 * ModuleData — mirroring the original app's `DATA.<id>` objects, including
 * their `sets` map (named sets like "2019"/"2023"/"muster", or a pool of
 * "run1".."run50").
 */
const dataFiles = import.meta.glob<{ default: ModuleData }>('./*.json', { eager: false })

export async function loadModule(moduleId: string): Promise<ModuleData> {
  const fileName = `./${moduleId}.json`
  const loader = dataFiles[fileName]

  if (!loader) {
    throw new Error(`No data file for module: ${moduleId}`)
  }

  const mod = await loader()
  return mod.default
}

export async function loadQuizSet(moduleId: string, setId: string): Promise<QuizSet> {
  const mod = await loadModule(moduleId)
  const set = mod.sets?.[setId]
  if (!set) {
    throw new Error(`Set "${setId}" not found for module "${moduleId}"`)
  }
  return set
}

export function hasDataFile(moduleId: string): boolean {
  return `./${moduleId}.json` in dataFiles
}
