import React from 'react'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'
import themeSpecs from '../themeSpecs'

const theme = createMuiTheme({
  ...themeSpecs,
  palette: {
    ...(themeSpecs.palette || {}),
    type: 'dark',
  },
})

const DarkTheme = ({ children }) => (
  <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
)

export default DarkTheme
