// @flow

declare type PendingClip = {
  start: WaveformX,
  end: WaveformX,
}

declare type PendingStretch = Exact<{
  originKey: 'start' | 'end',
  id: ClipId,
  end: WaveformX,
}>

declare type UserState = Exact<{
  pendingClip: ?PendingClip,
  pendingStretch: ?PendingStretch,
  highlightedClipId: ?ClipId,
  defaultNoteTypeId: ?NoteTypeId,
  defaultTags: Array<string>,
}>
