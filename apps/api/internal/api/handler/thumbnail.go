package handler

// thumbnailURL returns the public URL for a photo's thumbnail, falling back
// to the original photo URL when no thumbnail was generated (e.g. photos
// uploaded before thumbnails existed, or where generation failed).
func thumbnailURL(originalURL string, thumbnailPath *string) string {
	if thumbnailPath == nil {
		return originalURL
	}
	return "/uploads/" + *thumbnailPath
}
