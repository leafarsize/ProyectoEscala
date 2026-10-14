// El análisis en Python trabaja a 1280 px; con 1600 px sobra detalle y la foto pesa < 1 MB
const LADO_MAXIMO = 1600;
const TAMANO_SIN_REDUCIR = 1.5 * 1024 * 1024;

/**
 * Reduce una foto en el navegador antes de subirla.
 *
 * Las fotos de celular pesan 3-15 MB y chocan con upload_max_filesize / post_max_size
 * de PHP. Se exporta como JPEG sobre fondo blanco (lo transparente de un PNG queda
 * blanco, que el análisis trata como fondo) y respetando la orientación EXIF.
 * Si el navegador no puede leer el formato, devuelve el archivo original.
 */
export async function reducirImagen(archivo: File): Promise<File> {
    let bitmap: ImageBitmap;

    try {
        bitmap = await createImageBitmap(archivo, {
            imageOrientation: 'from-image',
        });
    } catch {
        return archivo;
    }

    const escala = Math.min(
        1,
        LADO_MAXIMO / Math.max(bitmap.width, bitmap.height),
    );

    if (escala === 1 && archivo.size <= TAMANO_SIN_REDUCIR) {
        bitmap.close();

        return archivo;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        bitmap.close();

        return archivo;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );

    if (!blob) {
        return archivo;
    }

    const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.jpg';

    return new File([blob], nombre, { type: 'image/jpeg' });
}
