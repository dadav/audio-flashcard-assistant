// @flow
export const getPersistedState = (): $Shape<AppState> => {
  const persistedState: $Shape<AppState> = {}
  try {
    const projects = JSON.parse(window.localStorage.getItem('projects'))
    if (projects) persistedState.projects = projects

    const audio = JSON.parse(window.localStorage.getItem('audio'))
    if (audio) persistedState.audio = audio
  } catch (err) {
    console.error(err)
  }

  return persistedState
}
