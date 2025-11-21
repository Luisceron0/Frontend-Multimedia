import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import EventEmitter from './EventEmitter.js'

export default class Resources extends EventEmitter {
    constructor(sources) {
        super()

        this.sources = sources
        this.items = {}
        this.toLoad = this.sources.length
        this.loaded = 0

        this.setLoaders()
        this.startLoading()
    }

    setLoaders() {
        this.loaders = {}
        
        // Configurar DRACOLoader
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('/draco/')
        
        // Configurar GLTFLoader con DRACOLoader y opciones para manejar texturas
        this.loaders.gltfLoader = new GLTFLoader()
        this.loaders.gltfLoader.setDRACOLoader(dracoLoader)
        
        // Configurar el manager para suprimir warnings de blobs
        const loadingManager = new THREE.LoadingManager()
        loadingManager.onError = (url) => {
            // Solo mostrar error si no es un blob (las texturas embebidas usan blobs)
            if (!url.includes('blob:')) {
                console.warn(`Error cargando recurso: ${url}`)
            }
        }
        
        this.loaders.textureLoader = new THREE.TextureLoader(loadingManager)
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager)
    }

    startLoading() {
        for (const source of this.sources) {
            //console.log(`⏳ Cargando recurso: ${source.name} desde ${source.path}`);

            if (source.type === 'gltfModel') {
                this.loaders.gltfLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    },
                    undefined,
                    (error) => {
                        console.error(`❌ Error al cargar modelo ${source.name} desde ${source.path}`)
                        console.error(error)
                    }
                )
            } else if (source.type === 'texture') {
                this.loaders.textureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    },
                    undefined,
                    (error) => {
                        console.error(`❌ Error al cargar textura ${source.name} desde ${source.path}`)
                        console.error(error)
                    }
                )
            } else if (source.type === 'cubeTexture') {
                this.loaders.cubeTextureLoader.load(
                    source.path,
                    (file) => {
                        this.sourceLoaded(source, file)
                    },
                    undefined,
                    (error) => {
                        console.error(`❌ Error al cargar cubemap ${source.name} desde ${source.path}`)
                        console.error(error)
                    }
                )
            }
        }
    }

    sourceLoaded(source, file) {
        this.items[source.name] = file
        this.loaded++

        const percent = Math.floor((this.loaded / this.toLoad) * 100)
        window.dispatchEvent(new CustomEvent('resource-progress', { detail: percent }))

        if (this.loaded === this.toLoad) {
            window.dispatchEvent(new CustomEvent('resource-complete'))
            this.trigger('ready')
        }
    }

    // Cargar recursos adicionales bajo demanda
    async loadAdditionalSources(sources) {
        return new Promise((resolve) => {
            let additionalLoaded = 0;
            const additionalToLoad = sources.length;

            if (additionalToLoad === 0) {
                resolve();
                return;
            }

            for (const source of sources) {
                // Saltar si ya está cargado
                if (this.items[source.name]) {
                    additionalLoaded++;
                    if (additionalLoaded === additionalToLoad) {
                        resolve();
                    }
                    continue;
                }

                if (source.type === 'gltfModel') {
                    this.loaders.gltfLoader.load(
                        source.path,
                        (file) => {
                            this.items[source.name] = file;
                            additionalLoaded++;
                            const percent = Math.floor((additionalLoaded / additionalToLoad) * 100);
                            window.dispatchEvent(new CustomEvent('level-loading-progress', { detail: percent }));
                            
                            if (additionalLoaded === additionalToLoad) {
                                resolve();
                            }
                        },
                        undefined,
                        (error) => {
                            console.error(`❌ Error cargando ${source.name}:`, error);
                            additionalLoaded++;
                            if (additionalLoaded === additionalToLoad) {
                                resolve();
                            }
                        }
                    );
                }
            }
        });
    }
}
