import { basename } from 'path'

const ffmpeg = require('fluent-ffmpeg/lib/fluent-ffmpeg')

const setFfmpegAndFfprobePath = () => {
  if (process.env.JEST_WORKER_ID) return

  // have to do it this way cause of webpack
  const ffmpegPath = require('electron').remote.getGlobal('ffmpegpath')
  ffmpeg.setFfmpegPath(ffmpegPath)
  const ffprobePath = require('electron').remote.getGlobal('ffprobepath')
  ffmpeg.setFfprobePath(ffprobePath)
}
setFfmpegAndFfprobePath()

export default ffmpeg

const zeroPad = (zeroes, value) => String(value).padStart(zeroes, '0')

export const toTimestamp = (
  milliseconds,
  unitsSeparator = ':',
  millisecondsSeparator = '.'
) => {
  const millisecondsStamp = zeroPad(3, Math.round(milliseconds % 1000))
  const secondsStamp = zeroPad(2, Math.floor(milliseconds / 1000) % 60)
  const minutesStamp = zeroPad(2, Math.floor(milliseconds / 1000 / 60) % 60)
  const hoursStamp = zeroPad(2, Math.floor(milliseconds / 1000 / 60 / 60))
  return `${hoursStamp}${unitsSeparator}${minutesStamp}${unitsSeparator}${secondsStamp}${millisecondsSeparator}${millisecondsStamp}`
}

export const getMediaMetadata = path => {
  return new Promise((res, rej) => {
    ffmpeg.ffprobe(path, (err, metadata) => {
      if (err) rej(err)

      res(metadata)
    })
  })
}

export const convertMediaMetadata = (
  ffprobeMetadata,
  filePath,
  id
): MediaFileMetadata => ({
  id,
  name: basename(filePath),
  durationSeconds: ffprobeMetadata.format.duration,
  format: ffprobeMetadata.format.format_name,
  isVideo:
    ffprobeMetadata.format.format_name !== 'mp3' &&
    ffprobeMetadata.streams.some(({ codec_type }) => /video/i.test(codec_type)),
})
