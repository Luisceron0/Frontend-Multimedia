// Solo cargar modelos base inicialmente
// Los modelos de niveles se cargan bajo demanda
export default [
    {
        name: 'environmentMapTexture',
        type: 'cubeTexture',
        path: [
            '/textures/environmentMap/px.jpg',
            '/textures/environmentMap/nx.jpg',
            '/textures/environmentMap/py.jpg',
            '/textures/environmentMap/ny.jpg',
            '/textures/environmentMap/pz.jpg',
            '/textures/environmentMap/nz.jpg'
        ]
    },
    {
        name: 'grassColorTexture',
        type: 'texture',
        path: '/textures/dirt/color.jpg'
    },
    {
        name: 'grassNormalTexture',
        type: 'texture',
        path: '/textures/dirt/normal.jpg'
    },
    {
        name: 'foxModel',
        type: 'gltfModel',
        path: '/models/Fox/glTF/Fox.gltf'
    },
    {
        name: 'robotModel',
        type: 'gltfModel',
        path: '/models/Robot/Robot.glb'
    },
    {
        name: 'zombieModel',
        type: 'gltfModel',
        path: '/models/Zombie/Zombie.glb'
    },
    {
        name: 'coinModel',
        type: 'gltfModel',
        path: '/models/Coin/Coin.glb'
    }
]

// Exportar función para obtener sources de un nivel específico
export async function getSourcesForLevel(level) {
    const module = await import(`../data/sources_${level}.js`);
    return module.default;
}
