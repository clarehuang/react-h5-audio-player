import React, { Component } from 'react'
import { getPosX } from './utils'

interface VolumeControlsProps {
  audio: HTMLAudioElement
  volume: number
  onMuteChange: () => void
}

interface VolumeControlsState {
  currentVolumePos: string
  hasVolumeAnimation: boolean
  isDraggingVolume: boolean
}

interface VolumePosInfo {
  currentVolume: number
  currentVolumePos: string
}

class VolumeControls extends Component<VolumeControlsProps, VolumeControlsState> {
  hasAddedAudioEventListener = false

  volumeBarEl?: HTMLDivElement

  volumeAnimationTimer = 0

  lastVolume = this.props.volume // To store the volume before clicking mute button

  state: VolumeControlsState = {
    currentVolumePos: `${((this.lastVolume / 1) * 100 || 0).toFixed(2)}%`,
    hasVolumeAnimation: false,
    isDraggingVolume: false,
  }

  // get volume info while dragging by indicator mouse or touch
  getCurrentVolume = (event: TouchEvent | MouseEvent): VolumePosInfo => {
    const { audio } = this.props
    if (!this.volumeBarEl) {
      return {
        currentVolume: audio.volume,
        currentVolumePos: this.state.currentVolumePos,
      }
    }
    const volumeBarRect = this.volumeBarEl.getBoundingClientRect()
    const maxRelativePos = volumeBarRect.width
    const relativePos = getPosX(event) - volumeBarRect.left
    let currentVolume
    let currentVolumePos

    if (relativePos < 0) {
      currentVolume = 0
      currentVolumePos = '0%'
    } else if (relativePos > volumeBarRect.width) {
      currentVolume = 1
      currentVolumePos = '100%'
    } else {
      currentVolume = relativePos / maxRelativePos
      currentVolumePos = `${(relativePos / maxRelativePos) * 100}%`
    }

    return { currentVolume, currentVolumePos }
  }

  handleClickVolumeButton = (): void => {
    const { audio } = this.props
    if (audio.volume > 0) {
      this.lastVolume = audio.volume
      audio.volume = 0
    } else {
      audio.volume = this.lastVolume
    }
  }

  handleVolumnControlMouseDown = (event: React.MouseEvent | React.TouchEvent): void => {
    event.stopPropagation()
    const { audio } = this.props
    const { currentVolume, currentVolumePos } = this.getCurrentVolume(event.nativeEvent)
    audio.volume = currentVolume
    this.setState({ isDraggingVolume: true, currentVolumePos })

    if (event.nativeEvent instanceof MouseEvent) {
      window.addEventListener('mousemove', this.handleWindowMouseOrTouchMove)
      window.addEventListener('mouseup', this.handleWindowMouseOrTouchUp)
    } else {
      window.addEventListener('touchmove', this.handleWindowMouseOrTouchMove)
      window.addEventListener('touchend', this.handleWindowMouseOrTouchUp)
    }
  }

  handleWindowMouseOrTouchMove = (event: TouchEvent | MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    const { audio } = this.props
    // Prevent Chrome drag selection bug
    const windowSelection: Selection | null = window.getSelection()
    if (windowSelection && windowSelection.type === 'Range') {
      windowSelection.empty()
    }

    const { isDraggingVolume } = this.state
    if (isDraggingVolume) {
      const { currentVolume, currentVolumePos } = this.getCurrentVolume(event)
      audio.volume = currentVolume
      this.setState({ currentVolumePos })
    }
  }

  handleWindowMouseOrTouchUp = (event: MouseEvent | TouchEvent): void => {
    event.stopPropagation()
    this.setState({ isDraggingVolume: false })

    if (event instanceof MouseEvent) {
      window.removeEventListener('mousemove', this.handleWindowMouseOrTouchMove)
      window.removeEventListener('mouseup', this.handleWindowMouseOrTouchUp)
    } else {
      window.removeEventListener('touchmove', this.handleWindowMouseOrTouchMove)
      window.removeEventListener('touchend', this.handleWindowMouseOrTouchUp)
    }
  }

  handleAudioVolumeChange = (e: Event): void => {
    const { isDraggingVolume } = this.state
    const { volume } = e.target as HTMLAudioElement
    if ((this.lastVolume > 0 && volume === 0) || (this.lastVolume === 0 && volume > 0)) {
      this.props.onMuteChange()
    }
    this.lastVolume = volume
    if (isDraggingVolume) return
    this.setState({
      hasVolumeAnimation: true,
      currentVolumePos: `${((volume / 1) * 100 || 0).toFixed(2)}%`,
    })
    clearTimeout(this.volumeAnimationTimer)
    this.volumeAnimationTimer = setTimeout(() => {
      this.setState({ hasVolumeAnimation: false })
    }, 100)
  }

  componentDidUpdate(): void {
    const { audio } = this.props
    if (audio && !this.hasAddedAudioEventListener) {
      this.hasAddedAudioEventListener = true
      audio.addEventListener('volumechange', this.handleAudioVolumeChange)
    }
  }

  componentWillUnmount(): void {
    const { audio } = this.props
    audio.removeEventListener('volumechange', this.handleAudioVolumeChange)
    clearTimeout(this.volumeAnimationTimer)
  }

  render(): React.ReactNode {
    const { audio } = this.props
    const { currentVolumePos, hasVolumeAnimation } = this.state

    const { volume } = audio || {}
    return (
      <div
        ref={(el: HTMLDivElement): void => {
          this.volumeBarEl = el
        }}
        onMouseDown={this.handleVolumnControlMouseDown}
        onTouchStart={this.handleVolumnControlMouseDown}
        role="progressbar"
        aria-label="volume Control"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Number((volume * 100).toFixed(0))}
        tabIndex={0}
        className="rhap_volume-bar-area"
      >
        <div className="rhap_volume-bar">
          <div
            className="rhap_volume-indicator"
            style={{ left: currentVolumePos, transitionDuration: hasVolumeAnimation ? '.1s' : '0s' }}
          />
        </div>
      </div>
    )
  }
}

export default VolumeControls
