import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { createBoxShapeFromModel, createTrimeshShapeFromModel } from '../Experience/Utils/PhysicsShapeFactory.js';
import Prize from '../Experience/World/Prize.js';

export default class ToyCarLoader {

    constructor(experience, { onChestCollect, robotRef } = {}) {
        this.experience = experience;
        this.scene = this.experience.scene;
        this.resources = this.experience.resources;
        this.physics = this.experience.physics;
        this.prizes = [];
        this.onChestCollect = onChestCollect; 
        this.robotRef = robotRef; 
    }

    _cleanFailedTextures(model) {
        // Limpiar texturas fallidas (blobs no cargados) de los materiales
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    // Si la textura no tiene imagen válida, removerla
                    if (mat.map && (!mat.map.image || mat.map.image.width === 0)) {
                        mat.map = null;
                        mat.needsUpdate = true;
                    }
                    // Lo mismo para otras propiedades de textura
                    ['normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach(prop => {
                        if (mat[prop] && (!mat[prop].image || mat[prop].image.width === 0)) {
                            mat[prop] = null;
                            mat.needsUpdate = true;
                        }
                    });
                });
            }
        });
    }

    _applyTextureToMeshes(root, imagePath, matcher, options = {}) {
        const matchedMeshes = [];
        root.traverse((child) => {
            if (child.isMesh && (!matcher || matcher(child))) {
                matchedMeshes.push(child);
            }
        });
        if (matchedMeshes.length === 0) {
            return;
        }
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            imagePath,
            (texture) => {
                if ('colorSpace' in texture) {
                    texture.colorSpace = THREE.SRGBColorSpace;
                } else {
                    texture.encoding = THREE.sRGBEncoding;
                }
                texture.flipY = false;
                const wrapS = options.wrapS || THREE.ClampToEdgeWrapping;
                const wrapT = options.wrapT || THREE.ClampToEdgeWrapping;
                texture.wrapS = wrapS;
                texture.wrapT = wrapT;
                const maxAniso = this.experience?.renderer?.instance?.capabilities?.getMaxAnisotropy?.();
                if (typeof maxAniso === 'number' && maxAniso > 0) {
                    texture.anisotropy = maxAniso;
                }
                const center = options.center || { x: 0.5, y: 0.5 };
                texture.center.set(center.x, center.y);
                if (typeof options.rotation === 'number') {
                    texture.rotation = options.rotation;
                }
                if (options.repeat) {
                    texture.repeat.set(options.repeat.x || 1, options.repeat.y || 1);
                }
                if (options.mirrorX) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.repeat.x = -Math.abs(texture.repeat.x || 1);
                    texture.offset.x = 1;
                }
                if (options.mirrorY) {
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.y = -Math.abs(texture.repeat.y || 1);
                    texture.offset.y = 1;
                }
                if (options.offset) {
                    texture.offset.set(
                        options.offset.x ?? texture.offset.x,
                        options.offset.y ?? texture.offset.y
                    );
                }
                texture.needsUpdate = true;

                let applied = 0;
                matchedMeshes.forEach((child) => {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat) => {
                            mat.map = texture;
                            mat.needsUpdate = true;
                        });
                    } else if (child.material) {
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                    } else {
                        child.material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
                    }
                    applied++;
                });

                if (applied === 0) {
                    // console.debug(`Sin meshes para aplicar textura: ${imagePath}`);
                } else {
                    console.log(`🖼️ Textura aplicada (${imagePath}) a ${applied} mesh(es)`);
                }
            },
            undefined,
            (err) => {
                console.error('❌ Error cargando textura', imagePath, err);
            }
        );
    }

    async loadFromAPI(level = 1) {
        try {
            const listRes = await fetch(`/config/precisePhysicsModels${level}.json`);
            const precisePhysicsModels = await listRes.json();
            let blocks = [];
            try {
                const apiUrl = import.meta.env.VITE_API_URL + `/api/blocks?level=${level}`;
                const res = await fetch(apiUrl);
                if (!res.ok) throw new Error('Conexión fallida');
                blocks = await res.json();
                console.log('Datos cargados desde la API:', blocks.length);
            } catch (apiError) {
                console.warn('No se pudo conectar con la API. Cargando desde archivo local...');
                const localRes = await fetch(`/data/toy_car_blocks${level}.json`);
                const allBlocks = await localRes.json();
                blocks = allBlocks.filter(b => b.level == level);
                console.log(`Datos cargados desde archivo local (nivel ${level}): ${blocks.length}`);
            }
            this._processBlocks(blocks, precisePhysicsModels);
        } catch (err) {
            console.error('Error al cargar bloques o lista Trimesh:', err);
        }
    }

    async loadFromURL(apiUrl) {
        try {
            const listRes = await fetch('/config/precisePhysicsModels.json');
            const precisePhysicsModels = await listRes.json();
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error('Conexión fallida al cargar bloques de nivel.');
            const blocks = await res.json();
            console.log(`📦 Bloques cargados (${blocks.length}) desde ${apiUrl}`);
            this._processBlocks(blocks, precisePhysicsModels);
        } catch (err) {
            console.error('Error al cargar bloques desde URL:', err);
        }
    }

    _processBlocks(blocks, precisePhysicsModels) {
        console.log(`🔧 _processBlocks: Procesando ${blocks.length} bloques`);
        let modelsAdded = 0;
        
        blocks.forEach(block => {
            if (!block.name) {
                console.warn('Bloque sin nombre:', block);
                return;
            }

            const resourceKey = block.name;
            const glb = this.resources.items[resourceKey];

            if (!glb) {
                console.warn(`❌ Modelo no encontrado: ${resourceKey} (nivel ${block.level})`);
                return;
            }

            const model = glb.scene.clone();
            modelsAdded++;
            if (block.level === 2) {
                model.scale.set(15, 15, 15);
            } else if (block.level === 3) {
                model.scale.set(30, 30, 30); // Nivel 3: escalado aumentado a 30x
            } else {
                model.scale.set(5, 5, 5);
            }
            model.userData.levelObject = true;

            // Eliminar cámaras y luces embebidas
            model.traverse((child) => {
                if (child.isCamera || child.isLight) {
                    child.parent.remove(child);
                }
            });

            // Limpiar texturas fallidas
            this._cleanFailedTextures(model);

            // Aplicar texturas personalizadas
            this._applyTextureToMeshes(
                model,
                '/textures/ima1.jpg',
                (child) => child.name === 'Cylinder001' || (child.name && child.name.toLowerCase().includes('cylinder')),
                { rotation: -Math.PI / 2, center: { x: 0.5, y: 0.5 }, mirrorX: true }
            );

            if (block.name.includes('baked')) {
                const bakedTexture = new THREE.TextureLoader().load('/textures/baked.jpg');
                bakedTexture.flipY = false;
                if ('colorSpace' in bakedTexture) {
                    bakedTexture.colorSpace = THREE.SRGBColorSpace;
                } else {
                    bakedTexture.encoding = THREE.sRGBEncoding;
                }
                model.traverse(child => {
                    if (child.isMesh) {
                        child.material = new THREE.MeshBasicMaterial({ map: bakedTexture });
                        child.material.needsUpdate = true;
                        if (child.name.toLowerCase().includes('portal')) {
                            this.experience.time.on('tick', () => {
                                child.rotation.y += 0.01;
                            });
                        }
                    }
                });
            }

            // Si es un premio (coin)
            if (block.name.startsWith('coin')) {
                let posX, posY, posZ;
                if (block.level === 2) {
                    // Aleatorizar X y Z manteniendo Y fijo
                    const randomOffsetX = (Math.random() - 0.5) * 10;
                    const randomOffsetZ = (Math.random() - 0.5) * 10;
                    posX = block.x * 15 + randomOffsetX;
                    posY = block.y * 15;
                    posZ = block.z * 15 + randomOffsetZ;
                } else if (block.level === 3) {
                    posX = block.x * 50;
                    posY = block.y * 36; // 20% más alto con escala 30x
                    posZ = block.z * 50;
                } else {
                    posX = block.x * 5;
                    posY = block.y * 6; // Nivel 1: 20% más alto
                    posZ = block.z * 5;
                }
                
                const prize = new Prize({
                    model, 
                    position: new THREE.Vector3(posX, posY, posZ),
                    scene: this.scene,
                    role: block.role || "default",
                    robotRef: this.robotRef 
                });
                prize.model.userData.levelObject = true;
                this.prizes.push(prize);
                return;
            }

            // Ajustar posición según el nivel (debe coincidir con la escala del modelo)
            if (block.level === 2) {
                // Aleatorizar X y Z manteniendo Y fijo
                const randomOffsetX = (Math.random() - 0.5) * 10;
                const randomOffsetZ = (Math.random() - 0.5) * 10;
                model.position.set(
                    block.x * 15 + randomOffsetX, 
                    block.y * 15, 
                    block.z * 15 + randomOffsetZ
                );
            } else if (block.level === 3) {
                model.position.set(block.x * 50, block.y * 36, block.z * 50); // Nivel 3: mayor separación
            } else {
                // Nivel 1: 20% más alto en Y (5 * 1.2 = 6)
                model.position.set(block.x * 5, block.y * 6, block.z * 5);
            }

            this.scene.add(model);
            
            if (block.level === 2 && modelsAdded <= 3) {
                console.log(`📦 Nivel 2 - Modelo añadido: ${block.name} en pos (${model.position.x.toFixed(1)}, ${model.position.y.toFixed(1)}, ${model.position.z.toFixed(1)}) escala ${model.scale.x}x`);
            }

            // Físicas (Solo para bloques estáticos)
            let shape;
            let position = new THREE.Vector3();

            if (precisePhysicsModels.includes(block.name)) {
                shape = createTrimeshShapeFromModel(model);
                if (!shape) {
                    console.warn(`No se pudo crear Trimesh para ${block.name}`);
                    return;
                }
                position.set(0, 0, 0);
            } else {
                shape = createBoxShapeFromModel(model, 0.9);
                const bbox = new THREE.Box3().setFromObject(model);
                const center = new THREE.Vector3();
                const size = new THREE.Vector3();
                bbox.getCenter(center);
                bbox.getSize(size);
                center.y -= size.y / 2;
                position.copy(center);
            }

            const body = new CANNON.Body({
                mass: 0,
                shape: shape,
                position: new CANNON.Vec3(position.x, position.y, position.z),
                material: this.physics.obstacleMaterial
            });

            body.userData = { levelObject: true };
            model.userData.physicsBody = body;
            body.userData.linkedModel = model;
            this.physics.world.addBody(body);
        });
        
        console.log(`✅ _processBlocks: ${modelsAdded} modelos añadidos a la escena`);
    }
}
