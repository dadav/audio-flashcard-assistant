// @flow
declare type MediaFileName = string

declare type Project = Project0_0_0 | Project1_0_0 | Project2_0_0 | Project3_0_0

declare type Project0_0_0 = {
  version: '0.0.0',
  audioFileName: MediaFileName,
  noteType: NoteTypePre3_0_0,
  clips: { [ClipId]: ClipWithoutFilePath },
}

declare type Project1_0_0 = {
  version: '1.0.0',
  audioFileName: MediaFileName,
  audioFileId: MediaFileId,
  noteType: NoteTypePre3_0_0,
  clips: { [ClipId]: ClipPre3_0_0 },
}

declare type Project2_0_0 = {
  version: '2.0.0',
  id: ProjectId,
  name: string,
  mediaFilesMetadata: Array<MediaFileMetadata>,
  noteType: NoteTypePre3_0_0,
  clips: { [ClipId]: ClipPre3_0_0 },
  tags: Array<string>,
  timestamp: string,
}

declare type Project3_0_0 = {
  version: '3.0.0',
  id: ProjectId,
  name: string,
  mediaFilesMetadata: Array<MediaFileMetadata>,
  noteType: NoteType,
  clips: { [ClipId]: Clip },
  tags: Array<string>,
  timestamp: string,
}
