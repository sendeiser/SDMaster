/**
 * googleDriveService.js
 * Maneja la autenticación y subida de archivos a Google Drive desde el frontend.
 */

const DRIVER_FOLDER_NAME = "SD Master - Secuencias";

export const googleDriveService = {
    /**
     * Carga el script de Google Identity Services.
     */
    loadGsiScript() {
        return new Promise((resolve, reject) => {
            if (window.google) return resolve();
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    /**
     * Obtiene un token de acceso mediante el flujo de Token de GSI.
     */
    async getAccessToken() {
        await this.loadGsiScript();
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        if (!clientId) {
            throw new Error("VITE_GOOGLE_CLIENT_ID no configurada en .env");
        }

        return new Promise((resolve, reject) => {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: 'https://www.googleapis.com/auth/drive.file',
                callback: (response) => {
                    if (response.error) {
                        reject(response);
                    } else {
                        resolve(response.access_token);
                    }
                },
            });
            tokenClient.requestAccessToken();
        });
    },

    /**
     * Crea un archivo en Google Drive (Markdown).
     */
    async saveFile(title, content, accessToken) {
        const metadata = {
            name: `${title}.md`,
            mimeType: 'text/markdown',
            // Podríamos añadir una carpeta aquí en el futuro
        };

        const boundary = 'foo_bar_baz';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: text/markdown\r\n\r\n' +
            content +
            close_delim;

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Error al subir a Google Drive");
        }

        return await response.json();
    }
};
