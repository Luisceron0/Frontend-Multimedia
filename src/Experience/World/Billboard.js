import * as THREE from 'three';

export default class Billboard {
  constructor({ position = { x: 0, y: 2, z: 0 }, imagePath = '/textures/sign.png', scale = 2, experience }) {
    this.experience = experience;
    this.scene = this.experience?.scene;
    this.position = position;
    this.imagePath = imagePath;
    this.scale = scale;

    this.createBillboard();
  }

  createBillboard() {
    // Cargar textura
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      this.imagePath,
      () => console.log(`✅ Billboard cargado: ${this.imagePath}`),
      undefined,
      (err) => console.warn(`⚠️ Error cargando billboard: ${this.imagePath}`, err)
    );

    // Crear material con la textura
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.1
    });

    // Crear geometría plana para el cartel
    const geometry = new THREE.PlaneGeometry(this.scale, this.scale);

    // Crear mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    this.mesh.name = 'billboard';

    // Agregar sombras si es necesario
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;

    // Agregar al escenario
    if (this.scene) {
      this.scene.add(this.mesh);
    }

    // Hacer que el cartel mire siempre a la cámara (opcional)
    this.enableBillboarding = true;
  }

  update() {
    // Hacer que el cartel mire hacia la cámara
    if (this.enableBillboarding && this.mesh && this.experience?.camera?.instance) {
      this.mesh.lookAt(this.experience.camera.instance.position);
    }
  }

  destroy() {
    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        if (this.mesh.material.map) this.mesh.material.map.dispose();
        this.mesh.material.dispose();
      }
      if (this.scene) {
        this.scene.remove(this.mesh);
      }
      this.mesh = null;
    }
  }
}
