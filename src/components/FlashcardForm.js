import React, { Component } from 'react'
import { connect } from 'react-redux'
import { TextField, IconButton, Card, CardContent } from '@material-ui/core'
import { Delete as DeleteIcon } from '@material-ui/icons'
import ChipInput from 'material-ui-chip-input'
import formatTime from '../utils/formatTime'
import * as r from '../redux'
import css from './FlashcardForm.module.css'

class FlashcardForm extends Component {
  state = {
    filePaths: [],
    modalIsOpen: false,
  }

  fileInputRef = el => (this.fileInput = el)
  audioRef = el => (this.audio = el)
  germanInputRef = el => (this.germanInput = el)
  svgRef = el => (this.svg = el)

  goToFile = index => this.props.setCurrentFile(index)
  prevFile = () => {
    const lower = this.props.currentFileIndex - 1
    this.goToFile(lower >= 0 ? lower : 0)
  }
  nextFile = () => {
    const higher = this.props.currentFileIndex + 1
    const lastIndex = this.props.filePaths.length - 1
    this.goToFile(higher <= lastIndex ? higher : lastIndex)
  }
  handleFlashcardSubmit = e => {
    e.preventDefault()
    this.nextFile()
    this.germanInput.focus()
  }

  setFlashcardText = (key, text) => {
    this.props.setFlashcardField(this.props.currentFlashcardId, key, text)
  }
  setFlashcardTagsText = text =>
    this.props.setFlashcardTagsText(this.props.currentFlashcardId, text)

  handleAddChip = text =>
    this.props.addFlashcardTag(this.props.currentFlashcardId, text)
  handleDeleteChip = (text, index) =>
    this.props.deleteFlashcardTag(this.props.currentFlashcardId, index)

  deleteCard = () => {
    const { deleteCard, highlightedClipId } = this.props
    if (highlightedClipId) {
      deleteCard(highlightedClipId)
    }
  }

  openModal = () => this.setState({ modalIsOpen: true })
  closeModal = () => this.setState({ modalIsOpen: false })

  handleAudioEnded = e => {
    this.nextFile()
  }

  inputRefs = {}
  inputRef = name => el => (this.inputRefs[name] = el)

  render() {
    const { currentFlashcard, currentNoteType } = this.props

    return (
      <Card className={css.container}>
        <CardContent>
          <form className="form" onSubmit={this.handleFlashcardSubmit}>
            <div className="formBody">
              <p className={css.timeStamp}>
                {formatTime(currentFlashcard.time.from)}
                {' - '}
                {formatTime(currentFlashcard.time.until)}
              </p>
              {currentNoteType.fields.map(({ name, id }) => (
                <p key={`${id}_${currentFlashcard.id}`}>
                  <TextField
                    inputRef={this.inputRef(id)}
                    onChange={e => this.setFlashcardText(id, e.target.value)}
                    value={currentFlashcard.fields[id] || ''}
                    fullWidth
                    multiline
                    label={name}
                  />
                </p>
              ))}

              {currentNoteType.useTagsField && (
                <ChipInput
                  label="Tags"
                  placeholder="Type your tag and press 'enter'"
                  className={css.tagsField}
                  inputRef={this.inputRef('tags')}
                  value={currentFlashcard.tags || []}
                  fullWidth
                  onAdd={chip => this.handleAddChip(chip)}
                  onDelete={(chip, index) => this.handleDeleteChip(chip, index)}
                />
              )}

              <IconButton
                className={css.deleteButton}
                onClick={this.deleteCard}
              >
                <DeleteIcon />
              </IconButton>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }
}

const mapStateToProps = state => ({
  filePaths: r.getFilePaths(state),
  currentFlashcard: r.getCurrentFlashcard(state),
  currentFlashcardId: r.getCurrentFlashcardId(state),
  highlightedClipId: r.getHighlightedClipId(state),
  clipsTimes: r.getClipsTimes(state),
  currentNoteType: r.getCurrentNoteType(state),
})

const mapDispatchToProps = {
  setCurrentFile: r.setCurrentFile,
  setFlashcardField: r.setFlashcardField,
  deleteCard: r.deleteCard,
  makeClips: r.makeClips,
  exportFlashcards: r.exportFlashcards,
  highlightClip: r.highlightClip,
  initializeApp: r.initializeApp,
  detectSilenceRequest: r.detectSilenceRequest,
  deleteAllCurrentFileClipsRequest: r.deleteAllCurrentFileClipsRequest,
  setFlashcardTagsText: r.setFlashcardTagsText,
  addFlashcardTag: r.addFlashcardTag,
  deleteFlashcardTag: r.deleteFlashcardTag,
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FlashcardForm)
