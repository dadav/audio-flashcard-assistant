import { flatMap, debounce, map, filter } from 'rxjs/operators'
import { timer, of, from } from 'rxjs'
import { ofType, combineEpics } from 'redux-observable'
import * as r from '../redux'
import { promisify } from 'util'
import fs from 'fs'
import parseProject, { getMediaFilePaths } from '../utils/parseProject'
import { saveProjectToLocalStorage } from '../utils/localStorage'

const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)

const openProject = async (filePath, projectId, state$) => {
  try {
    const projectJson = await readFile(filePath)
    const project = parseProject(projectJson)
    if (!project)
      return of(
        r.simpleMessageSnackbar(
          'Could not read project file. Please make sure your software is up to date and try again.'
        )
      )
    let originalProjectJson = JSON.parse(projectJson)
    const mediaFilePaths = getMediaFilePaths(
      originalProjectJson,
      project,
      filePath,
      r.getMediaFilePaths(state$.value, project.id)
    )
    const projectMetadata: ProjectMetadata = r.getProjectMetadata(
      state$.value,
      project.id
    )
    return from([
      r.openProject(project, {
        id: project.id,
        filePath: filePath,
        name: project.name,
        mediaFilePaths,
        error: null,
        noteType: project.noteType,
      }),
      {
        type: projectMetadata
          ? 'CREATED NEW PROJECT METADATA'
          : 'open old project metadata',
      },
    ])
  } catch (err) {
    console.error(err)
    return of(
      r.simpleMessageSnackbar(`Error opening project file: ${err.message}`)
    )
  }
}

const openProjectById = (action$, state$) =>
  action$.pipe(
    ofType('OPEN_PROJECT_REQUEST_BY_ID'),
    flatMap(async ({ id }) => {
      const projectMetadata = r.getProjectMetadata(state$.value, id)
      if (!projectMetadata)
        return of(r.simpleMessageSnackbar(`Could not find project ${id}.`))

      const { filePath } = projectMetadata
      if (!filePath)
        return of(
          r.simpleMessageSnackbar(`Could not find project at ${filePath}`)
        )

      return await openProject(filePath, id, state$)
    }),
    flatMap(x => x)
  )

const openProjectByFilePath = (action$, state$) =>
  action$.pipe(
    ofType('OPEN_PROJECT_REQUEST_BY_FILE_PATH'),
    flatMap(async ({ filePath }) => {
      const projectIdFromRecents = r.getProjectIdByFilePath(
        state$.value,
        filePath
      )
      if (projectIdFromRecents)
        return of(r.openProjectById(projectIdFromRecents))

      if (!fs.existsSync(filePath))
        return of(r.simpleMessageSnackbar('Could not find project file.'))

      return await openProject(filePath, null, state$)
    }),
    flatMap(x => x)
  )

const saveProject = (action$, state$) =>
  action$.pipe(
    ofType('SAVE_PROJECT_REQUEST'),
    filter(() => {
      const projectMetadata = r.getCurrentProject(state$.value)
      if (!projectMetadata) return { type: 'NOOP_SAVE_PROJECT_WITH_NONE_OPEN' }
      const { filePath } = projectMetadata
      return filePath && fs.existsSync(filePath)
    }), // while can't find project file path in local storage, or file doesn't exist
    flatMap(async () => {
      try {
        const projectMetadata = r.getCurrentProject(state$.value)
        const json = JSON.stringify(
          r.getProject(state$.value, projectMetadata),
          null,
          2
        )
        await writeFile(projectMetadata.filePath, json, 'utf8')

        return from([
          r.setWorkIsUnsaved(false),
          r.simpleMessageSnackbar(
            `Project saved in ${projectMetadata.filePath}`
          ),
        ])
      } catch (err) {
        return of(
          r.simpleMessageSnackbar(`Problem saving project file: ${err.message}`)
        )
      }
    }),
    flatMap(x => x)
  )

const PROJECT_EDIT_ACTIONS = [
  'DELETE_CARD',
  'MAKE_CLIPS',
  'DELETE_CARDS',
  'SET_FLASHCARD_FIELD',
  'ADD_FLASHCARD_TAG',
  'DELETE_FLASHCARD_TAG',
  'ADD_CLIP',
  'ADD_CLIPS',
  'EDIT_CLIP',
  'MERGE_CLIPS',
  'ADD_NOTE_TYPE',
  'EDIT_NOTE_TYPE',
  'DELETE_NOTE_TYPE',
  'ADD_MEDIA_TO_PROJECT',
  'DELETE_MEDIA_FROM_PROJECT',
  'LOCATE_MEDIA_METADATA_SUCCESS',
  // 'CREATED NEW PROJECT METADATA',
]

const registerUnsavedWork = (action$, state$) =>
  action$.pipe(
    ofType(...PROJECT_EDIT_ACTIONS),
    map(() => r.setWorkIsUnsaved(true))
  )

const THREE_SECONDS = 3000
const autoSaveProject = (action$, state$) =>
  action$.pipe(
    ofType(...PROJECT_EDIT_ACTIONS),
    debounce(() => timer(THREE_SECONDS)),
    map(() => {
      try {
        const projectMetadata = r.getCurrentProject(state$.value)
        saveProjectToLocalStorage(r.getProject(state$.value, projectMetadata))
        return { type: 'AUTOSAVE' }
      } catch (err) {
        return r.simpleMessageSnackbar(
          `Problem saving project file: ${err.message}`
        )
      }
    })
  )

const openMediaFileRequestOnOpenProject = (action$, state$) =>
  action$.pipe(
    ofType('OPEN_PROJECT'),
    flatMap(({ projectMetadata }) => {
      if (!projectMetadata.mediaFilePaths.length)
        return of({ type: 'NOOP_OPEN_PROJECT_NO_AUDIO_FILES' })

      const [
        {
          metadata: { id: firstMediaFileId },
        },
      ] = projectMetadata.mediaFilePaths

      const clips = Object.values(state$.value.clips.idsByMediaFileId).reduce(
        (a, b) => a.concat(b),
        []
      )

      const tagsToClipIds = clips.reduce((tags, clipId: ClipId) => {
        const clip = r.getClip(state$.value, clipId)
        clip.flashcard.tags.forEach(tag => {
          tags[tag] = tags[tag] || []
          tags[tag].push(clip.id)
        })
        return tags
      }, {})

      return from([
        r.openMediaFileRequest(firstMediaFileId),
        r.setAllTags(tagsToClipIds),
      ])
    })
  )

const openProjectOnCreate = (action$, state$) =>
  action$.pipe(
    ofType('CREATE_PROJECT'),
    flatMap(async ({ projectMetadata }) => {
      try {
        const json = JSON.stringify(
          r.getProject(state$.value, projectMetadata),
          null,
          2
        )
        await writeFile(projectMetadata.filePath, json, 'utf8')

        return await r.openProjectById(projectMetadata.id)
      } catch (err) {
        console.error(err)
        return await r.simpleMessageSnackbar(
          `Could not create project file: ${err.message}`
        )
      }
    })
  )

const deleteMediaFileFromProject = (action$, state$) =>
  action$.pipe(
    ofType('DELETE_MEDIA_FROM_PROJECT_REQUEST'),
    flatMap(({ projectId, mediaFileId }) => {
      const highlightedClip = r.getHighlightedClip(state$.value)
      return from([
        ...(highlightedClip ? [r.highlightClip(null)] : []),
        r.deleteMediaFromProject(projectId, mediaFileId),
      ])
    })
  )

const closeProject = (action$, state$) =>
  action$.pipe(
    ofType('CLOSE_PROJECT_REQUEST'),
    map(() => {
      if (r.isWorkUnsaved(state$.value))
        return r.confirmationDialog(
          'Are you sure you want to close this project without saving your work?',
          r.closeProject()
        )
      else return r.closeProject()
    })
  )

export default combineEpics(
  openProjectByFilePath,
  openProjectById,
  saveProject,
  registerUnsavedWork,
  autoSaveProject,
  openMediaFileRequestOnOpenProject,
  openProjectOnCreate,
  deleteMediaFileFromProject,
  closeProject
)
