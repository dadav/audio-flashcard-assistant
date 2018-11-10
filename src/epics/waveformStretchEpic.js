import { map, flatMap, takeUntil, withLatestFrom, takeLast } from 'rxjs/operators'
import { ofType } from 'redux-observable'
import { fromEvent, from, of, merge, empty } from 'rxjs'
import * as r from '../redux'
import { toWaveformX } from '../utils/waveformCoordinates'

const waveformStretchEpic = (action$, state$) => {
  const selectionMousedowns = action$.pipe(
    ofType('WAVEFORM_MOUSEDOWN'),
    flatMap(({ x }) => {
      const edge = r.getSelectionEdgeAt(state$.value, x)
      return edge ? of({ x, edge }) : empty()
    }),
    withLatestFrom(action$.ofType('LOAD_AUDIO')),
    flatMap(([mousedownData, loadAudio]) => {
      const { edge: { key, id } } = mousedownData
      const pendingStretches = fromEvent(window, 'mousemove').pipe(
        takeUntil(fromEvent(window, 'mouseup')),
        map((mousemove) => r.setWaveformPendingStretch({
          id,
          // start: mousedownData.x,
          originKey: key,
          end: toWaveformX(mousemove, loadAudio.svgElement, r.getWaveformViewBoxXMin(state$.value)),
        }))
      )

      return merge(
        pendingStretches,
        pendingStretches.pipe(
          takeLast(1),
          flatMap((lastPendingStretch) => {
            const { stretch: { id, originKey, end } } = lastPendingStretch
            const stretchedSelection = r.getWaveformSelection(state$.value, id)

            // if pendingStretch.end is inside a selection separate from stretchedSelection,
            // take the start from the earlier and the end from the later,
            // use those as the new start/end of stretchedSelection,
            // and delete the separate selection.

            const previousSelectionId = r.getPreviousSelectionId(state$.value, id)
            const previousSelection = r.getWaveformSelection(state$.value, previousSelectionId)
            if (previousSelection && end <= previousSelection.end) {
              return from([
                r.mergeWaveformSelections([id, previousSelectionId]),
                r.setWaveformPendingStretch(null)
              ])
            }

            const nextSelectionId = r.getNextSelectionId(state$.value, id)
            const nextSelection = r.getWaveformSelection(state$.value, nextSelectionId)
            if (nextSelection && end >= nextSelection.start) {
              return from([
                r.mergeWaveformSelections([id, nextSelectionId]),
                r.setWaveformPendingStretch(null)
              ])
            }

            if (originKey === 'start' && stretchedSelection.end > end) {
              return from([
                r.editWaveformSelection(id, { start: Math.min(end, stretchedSelection.end - r.SELECTION_THRESHOLD) }),
                r.setWaveformPendingStretch(null)
              ])
            }

            if (originKey === 'end' && end > stretchedSelection.start) {
              return from([
                r.editWaveformSelection(id, { end: Math.max(end, stretchedSelection.start + r.SELECTION_THRESHOLD) }),
                r.setWaveformPendingStretch(null)
              ])
            }

            return of(r.setWaveformPendingStretch(null))
          }),
        )
      )
    })
  )
  return selectionMousedowns
}

export default waveformStretchEpic
