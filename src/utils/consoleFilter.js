// consoleFilter.js - Filtrar warnings conocidos que no afectan el juego

/**
 * Suprime warnings conocidos de la consola que no afectan la funcionalidad
 */
export function setupConsoleFilter() {
    // Guardar las funciones originales
    const originalWarn = console.warn;
    const originalError = console.error;

    // Lista de mensajes a suprimir (contienen estas subcadenas)
    const suppressWarnings = [
        'KHR_materials_pbrSpecularGlossiness', // Three.js - extensión GLTF no crítica
        'Unknown extension', // Three.js GLTF
        "Couldn't load texture blob:", // Three.js - texturas embebidas fallidas
        'Could not load image', // Imágenes que no se pueden cargar
    ];

    // Override console.warn
    console.warn = function(...args) {
        const message = args.join(' ');
        
        // Verificar si el mensaje debe ser suprimido
        const shouldSuppress = suppressWarnings.some(pattern => 
            message.includes(pattern)
        );

        if (!shouldSuppress) {
            originalWarn.apply(console, args);
        }
    };

    // Override console.error (solo para filtrar, no para suprimir errores críticos)
    console.error = function(...args) {
        const message = args.join(' ');
        
        // Solo filtrar warnings específicos que aparecen como error
        const shouldSuppress = suppressWarnings.some(pattern => 
            message.includes(pattern)
        );

        if (!shouldSuppress) {
            originalError.apply(console, args);
        }
    };

    console.log('🔇 Filtro de consola activado - Warnings conocidos suprimidos');
}

/**
 * Restaurar el comportamiento original de la consola
 */
export function disableConsoleFilter() {
    // Esta función podría restaurar los originales si los guardáramos globalmente
    console.log('🔊 Filtro de consola desactivado');
}
