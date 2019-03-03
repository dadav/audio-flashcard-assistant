import { flatMap } from 'rxjs/operators'
import { ofType } from 'redux-observable'
import { from, of } from 'rxjs'
import * as r from '../redux'
import { join, basename } from 'path'
import ffmpeg, { toTimestamp } from '../utils/ffmpeg'
import { getAllClips } from '../utils/getCsvText'
import { readFileSync, writeFileSync } from 'fs'
import Exporter from 'anki-apkg-export-multi-field/dist/exporter'
import createTemplate from 'anki-apkg-export-multi-field/dist/template'
import tempy from 'tempy'
import { showSaveDialog } from '../utils/electron'

const clip = (path, startTime, endTime, outputFilename) => {
  return new Promise((res, rej) => {
    ffmpeg(path)
      // .audioCodec('copy') // later, do this and change hardcoded '.mp3' for audio-only input
      .seekInput(toTimestamp(startTime))
      .inputOptions('-to ' + toTimestamp(endTime))
      .outputOptions('-vn')
      .output(outputFilename)
      .on(
        'end',
        //listener must be a function, so to return the callback wrapping it inside a function
        function() {
          console.log('Finished processing')
          res(outputFilename)
        }
      )
      .on('error', err => {
        rej(err)
      })
      .run()
  })
}

const makeApkg = async (
  state$,
  { fieldNames, filenames, directory, noteType, outputFilePath }
) => {
  const apkg = new Exporter(noteType.name, {
    sql: window.SQL,
    template: createTemplate({
      fields: ['id', ...fieldNames, 'sound'],
      questionFormat: `{{${fieldNames[0]}}} {{sound}}`,
      answerFormat: `{{FrontSide}}\n\n<hr id="answer">\n\n{{${fieldNames[1]}}}`,
    }),
  })

  filenames.forEach(filePath => {
    console.log('adding file', basename(filePath), filePath)
    apkg.addMedia(basename(filePath), readFileSync(filePath))
  })

  getAllClips(state$.value).forEach(clip => {
    const cardFields = noteType.fields.map(
      f => clip.flashcard.fields[f.id] || ''
    )
    apkg.addCard(
      [
        clip.id,
        ...cardFields,
        `[sound:${r.getClipFilename(state$.value, clip.id)}]`,
      ],
      {
        sortField: noteType.fields[0].name,
        tags: clip.flashcard.tags || [],
      }
    )
  })

  await apkg
    .save({
      type: 'nodebuffer',
      base64: false,
      compression: 'DEFLATE',
    })
    .then(zip => {
      writeFileSync(outputFilePath, zip, 'binary')
      console.log(`Package has been generated: ${outputFilePath}`)
    })

  return outputFilePath
}

const makeClips = (action$, state$) =>
  action$.pipe(
    ofType('MAKE_CLIPS'),
    flatMap(async ({ format }) => {
      const usingCsv = format === 'CSV+MP3'
      const usingApkg = format === 'APKG'
      const directory = usingCsv
        ? r.getMediaFolderLocation(state$.value)
        : tempy.directory()

      if (usingCsv && !directory)
        return of(r.mediaFolderLocationFormDialog(r.makeClips(format), true))

      const outputFilePath =
        usingApkg && (await showSaveDialog('Anki deck file', ['apkg']))

      if (usingApkg && !outputFilePath) return from([])

      try {
        const clipIds = Object.keys(state$.value.clips.byId)
        const clipsOperations = clipIds.map(clipId => {
          const {
            start,
            end,
            filePath,
            outputFilename,
          } = r.getClipOutputParameters(state$.value, clipId)
          const audioOutputFilePath = join(directory, outputFilename)
          console.log('clipping: filePath, start, end, audioOutputFilePath')
          console.log(filePath, start, end, audioOutputFilePath)
          return clip(filePath, start, end, audioOutputFilePath)
        })
        const filenames = await Promise.all(clipsOperations)

        if (usingApkg) {
          const noteType = r.getCurrentNoteType(state$.value)
          const fieldNames = noteType.fields.map(f => f.name)

          await makeApkg(state$, {
            fieldNames,
            filenames,
            directory,
            noteType,
            outputFilePath,
          })
        }

        return usingCsv
          ? from([
              r.simpleMessageSnackbar('Clips made in ' + directory),
              r.exportFlashcards(),
            ])
          : of(r.simpleMessageSnackbar('Flashcards made in ' + outputFilePath))
      } catch (err) {
        console.error(err)
        return of(
          r.simpleMessageSnackbar(
            `There was a problem making clips: ${err.message}`
          )
        )
      }
    }),
    flatMap(x => x)
  )

export default makeClips
