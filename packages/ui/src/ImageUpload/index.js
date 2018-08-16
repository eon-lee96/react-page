// @flow

import React, { Component } from 'react'
import type { ChangeEvent, MouseEvent, Node, CSSProperties } from 'react'
import Button from '@material-ui/core/Button'
import CircularProgress from '@material-ui/core/CircularProgress'
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import ErrorIcon from '@material-ui/icons/Error';

const NO_FILE_ERROR_CODE = 1
const BAD_EXTENSION_ERROR_CODE = 2
const TOO_BIG_ERROR_CODE = 3
const UPLOADING_ERROR_CODE = 4

export type ImageLoaded = {
  file: Object,
  dataUrl: string
}

export type ImageUploaded = {
  url: string
}

export type ColorPickerProps = {
  imageLoaded?: (image: ImageLoaded) => void,
  imageUpload?: (file: Object, reportProgress: (progress: number) => void) => void,
  imageUploadError?: (errorCode: number) => void,
  imageUploaded?: (resp: (Object | ImageUploaded)) => void,
  buttonContent?: Node,
  icon?: Node,
  style?: CSSProperties,
  maxFileSize?: number,
  allowedExtensions?: string[]
}

type ImageUploadState = {
  isUploading: boolean,
  hasError: boolean,
  errorText?: string,
  progress?: number
}

class ImageUpload extends Component {
  fileInput: HTMLInputElement = undefined

  constructor(props: ColorPickerProps) {
    super(props);
    this.state = {
      isUploading: false,
      hasError: false,
      errorText: '',
      progress: undefined
    }
  }

  static defaultProps = {
    buttonContent: 'Upload image',
    icon: <CloudUploadIcon style={{ marginLeft: '8px' }} />,
    allowedExtensions: ['jpg', 'jpeg', 'png'],
    maxFileSize: 5242880
  }

  hasExtension = (fileName: string) => {
    const pattern = '(' + this.props.allowedExtensions.map(a => a.toLowerCase()).join('|').replace(/\./g, '\\.') + ')$';
    return new RegExp(pattern, 'i').test(fileName.toLowerCase());
  }

  handleError = (errorCode: number) => {
    let errorText = ''
    switch (errorCode) {
      case NO_FILE_ERROR_CODE:
        errorText = 'No file selected'
        break
      case BAD_EXTENSION_ERROR_CODE:
        errorText = 'Bad file type'
        break
      case TOO_BIG_ERROR_CODE:
        errorText = 'Too big'
        break
      case UPLOADING_ERROR_CODE:
        errorText = 'Error while uploading'
        break
      default:
        errorText = 'Unknown error'
        break
    }
    // Need to flick "isUploading" because otherwise the handler doesn't fire properly
    this.setState({ hasError: true, errorText, isUploading: true }, () => this.setState({ isUploading: false }))
    setTimeout(() => this.setState({ hasError: false, errorText: '' }), 5000)
  }

  handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) {
      this.handleError(NO_FILE_ERROR_CODE)
      return
    }
    const file = e.target.files[0];
    if (!this.hasExtension(file.name)) {
      this.handleError(BAD_EXTENSION_ERROR_CODE)
      return
    }
    if (file.size > this.props.maxFileSize) {
      this.handleError(TOO_BIG_ERROR_CODE)
      return
    }
    if (this.props.imageLoaded) {
      this.readFile(file).then(data => this.props.imageLoaded(data))
    }
    if (this.props.imageUpload) {
      this.setState({ isUploading: true })
      this.props.imageUpload(file, this.handleReportProgress).then(resp => {
        this.setState({ progress: undefined, isUploading: false })
        this.props.imageUploaded && this.props.imageUploaded(resp)
      }).catch(error => {
        this.setState({ isUploading: false })
        this.props.imageUploadError && this.props.imageUploadError(error)
      })
    }
  }

  readFile(file: Object) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      // Read the image via FileReader API and save image result in state.
      reader.onload = function (e) {
        // Add the file name to the data URL
        let dataUrl = e.target.result;
        dataUrl = dataUrl.replace(";base64", `;name=${file.name};base64`);
        resolve({ file, dataUrl });
      };

      reader.readAsDataURL(file);
    });
  }

  handleFileUploadClick = (e: MouseEvent<HTMLButtonElement>) => this.fileInput.click()

  handleReportProgress = (progress: number) => this.setState({ progress })

  renderChildren = () => {
    if (this.state.isUploading) {
      return <CircularProgress value={this.state.progress} size={19} />
    }
    if (this.state.hasError) {
      return <React.Fragment>{this.state.errorText}<ErrorIcon size={19} style={{ marginLeft: '8px' }} /></React.Fragment>
    }
    return <React.Fragment>{this.props.buttonContent}{this.props.icon}</React.Fragment>
  }

  render() {
    return (
      <React.Fragment>
        <Button
          disabled={this.state.isUploading}
          variant="contained"
          color={this.state.hasError ? 'secondary' : 'primary'}
          onClick={this.handleFileUploadClick}
          style={{
            ...this.props.style,
          }}
        >
          {this.renderChildren()}
        </Button>
        {!this.state.isUploading && <input
          style={{ display: 'none' }}
          ref={fileInput => this.fileInput = fileInput}
          type="file"
          onChange={this.handleFileSelected}
        />}
      </React.Fragment>
    );
  }
}

export default ImageUpload