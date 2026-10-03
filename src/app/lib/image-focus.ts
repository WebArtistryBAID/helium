export type FocusImageData = {
    width: number
    height: number
    mediaType?: string
    focusX?: number
    focusY?: number
    focusSize?: number
}

export function hasImageFocus(image?: FocusImageData | null): boolean {
    return image != null && image.mediaType !== 'video' && image.width > 0 && image.height > 0
        && ((image.focusX ?? 0.5) !== 0.5 || (image.focusY ?? 0.5) !== 0.5 || (image.focusSize ?? 1) !== 1)
}

export function getImageFocus(image: FocusImageData) {
    const size = Math.max(0.05, Math.min(1, image.focusSize ?? 1))
    const side = Math.min(image.width, image.height) * size
    const halfX = side / image.width / 2
    const halfY = side / image.height / 2
    return {
        focusX: Math.max(halfX, Math.min(1 - halfX, image.focusX ?? 0.5)),
        focusY: Math.max(halfY, Math.min(1 - halfY, image.focusY ?? 0.5)),
        focusSize: size
    }
}

// Rectangular viewports expand around the selected square's center.
export function getFocusGeometry(image: FocusImageData, width: number, height: number) {
    const focus = getImageFocus(image)
    const scale = Math.max(width / image.width, height / image.height) / focus.focusSize
    const renderedWidth = image.width * scale
    const renderedHeight = image.height * scale
    return {
        width: renderedWidth,
        height: renderedHeight,
        left: Math.max(width - renderedWidth, Math.min(0, width / 2 - focus.focusX * renderedWidth)),
        top: Math.max(height - renderedHeight, Math.min(0, height / 2 - focus.focusY * renderedHeight))
    }
}
