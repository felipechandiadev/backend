export interface IStorageProvider {
  /**
   * Upload a file
   * @param fileBuffer Buffer containing file data
   * @param relativePath Path where file should be stored (e.g., 'properties/img/photo.jpg')
   * @param contentType MIME type of the file
   * @returns Public URL of the uploaded file
   */
  uploadFile(
    fileBuffer: Buffer,
    relativePath: string,
    contentType: string,
  ): Promise<string>;

  /**
   * Delete a file
   * @param relativePath Path of the file to delete
   */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * Download a file as Buffer
   * @param relativePath Path of the file to download
   * @returns Buffer containing file data
   */
  downloadFile(relativePath: string): Promise<Buffer>;

  /**
   * Check if a file exists
   * @param relativePath Path of the file to check
   * @returns true if file exists, false otherwise
   */
  fileExists(relativePath: string): Promise<boolean>;

  /**
   * Generate public URL for a file
   * @param relativePath Path of the file
   * @returns Public URL
   */
  getPublicUrl(relativePath: string): string;
}
