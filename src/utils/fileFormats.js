/*
  Formats de fichier acceptés pour les rendus et les pièces jointes d'énoncés.

  Aligné sur l'enum UploadFileType du back. Le format est reconnu à l'extension et non
  au type MIME du navigateur : celui-ci dépend des logiciels installés et vaut souvent
  "" ou application/octet-stream pour un .docx ou un .md. Le back contrôle ensuite le
  contenu réel du fichier.
*/

const FILE_FORMATS = [
    {extension: 'pdf', icon: 'picture_as_pdf'},
    {extension: 'docx', icon: 'description'},
    {extension: 'odt', icon: 'description'},
    {extension: 'txt', icon: 'description'},
    {extension: 'md', icon: 'description'},
    {extension: 'xlsx', icon: 'table'},
    {extension: 'ods', icon: 'table'},
    {extension: 'csv', icon: 'table'},
    {extension: 'pptx', icon: 'slideshow'},
    {extension: 'odp', icon: 'slideshow'},
    {extension: 'png', icon: 'image'},
    {extension: 'jpg', icon: 'image'},
    {extension: 'jpeg', icon: 'image'},
    {extension: 'zip', icon: 'folder_zip'}
]

const DEFAULT_ICON = 'draft'

// Valeur de l'attribut accept des champs fichier.
export const ALLOWED_FILE_ACCEPT = FILE_FORMATS.map((format) => `.${format.extension}`).join(',')

// Libellé affiché sous les zones d'envoi.
export const ALLOWED_FILE_LABEL = 'PDF, Word, Excel, PowerPoint, OpenDocument, texte, images, ZIP'

/**
 * Extension d'un nom de fichier, en minuscules et sans le point.
 * @param {string} filename nom du fichier
 * @returns {string} l'extension, ou chaîne vide s'il n'y en a pas
 */
export function extensionOf(filename) {
    const dotIndex = filename ? filename.lastIndexOf('.') : -1
    return dotIndex < 0 ? '' : filename.slice(dotIndex + 1).toLowerCase()
}

/**
 * Indique si le format d'un fichier est accepté.
 * @param {string} filename nom du fichier
 * @returns {boolean}
 */
export function isAllowedFile(filename) {
    const extension = extensionOf(filename)
    return FILE_FORMATS.some((format) => format.extension === extension)
}

/**
 * Icône correspondant au format d'un fichier.
 * @param {string} filename nom du fichier
 * @returns {string} nom d'icône du registre
 */
export function fileIcon(filename) {
    const extension = extensionOf(filename)
    return FILE_FORMATS.find((format) => format.extension === extension)?.icon ?? DEFAULT_ICON
}
