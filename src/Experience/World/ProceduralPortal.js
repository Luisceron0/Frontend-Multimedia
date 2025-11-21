import * as THREE from 'three';

export default class ProceduralPortal {
	constructor({ scene, position = new THREE.Vector3(0, 0, 0) }) {
		this.scene = scene;
		this.position = position;
		this.group = new THREE.Group();
		this.group.position.copy(position);
		
		this.createPortal();
		this.scene.add(this.group);
		
		this.time = 0;
	}

	createPortal() {
		// Anillo exterior del portal
		const outerRingGeometry = new THREE.TorusGeometry(2.5, 0.2, 16, 100);
		const outerRingMaterial = new THREE.MeshStandardMaterial({
			color: 0x00ffff,
			emissive: 0x00ffff,
			emissiveIntensity: 2,
			transparent: true,
			opacity: 0.8
		});
		this.outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
		this.group.add(this.outerRing);

		// Vórtice interior
		const vortexGeometry = new THREE.TorusGeometry(2, 0.3, 16, 100);
		const vortexMaterial = new THREE.MeshStandardMaterial({
			color: 0x0066ff,
			emissive: 0x0066ff,
			emissiveIntensity: 1.5,
			transparent: true,
			opacity: 0.6,
			side: THREE.DoubleSide
		});
		this.vortex = new THREE.Mesh(vortexGeometry, vortexMaterial);
		this.group.add(this.vortex);

		// Centro del portal
		const centerGeometry = new THREE.CircleGeometry(2, 32);
		const centerMaterial = new THREE.MeshStandardMaterial({
			color: 0x000033,
			emissive: 0x0033ff,
			emissiveIntensity: 0.5,
			transparent: true,
			opacity: 0.9,
			side: THREE.DoubleSide
		});
		this.center = new THREE.Mesh(centerGeometry, centerMaterial);
		this.group.add(this.center);

		// Sistema de partículas
		this.createParticles();

		// Luz del portal
		const portalLight = new THREE.PointLight(0x00ffff, 2, 10, 2);
		this.group.add(portalLight);

		// Colisionador invisible (para detección)
		const colliderGeometry = new THREE.CylinderGeometry(2.5, 2.5, 4, 32);
		const colliderMaterial = new THREE.MeshBasicMaterial({
			visible: false,
			transparent: true,
			opacity: 0
		});
		this.collider = new THREE.Mesh(colliderGeometry, colliderMaterial);
		this.collider.userData.isPortal = true;
		this.group.add(this.collider);
	}

	createParticles() {
		const particleCount = 1000;
		const positions = new Float32Array(particleCount * 3);

		for (let i = 0; i < particleCount; i++) {
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.random() * 3;
			const height = (Math.random() - 0.5) * 4;

			positions[i * 3] = Math.cos(angle) * radius;
			positions[i * 3 + 1] = height;
			positions[i * 3 + 2] = Math.sin(angle) * radius;
		}

		const particlesGeometry = new THREE.BufferGeometry();
		particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

		const particlesMaterial = new THREE.PointsMaterial({
			size: 0.05,
			color: 0x00ffff,
			transparent: true,
			opacity: 0.8,
			sizeAttenuation: true,
			blending: THREE.AdditiveBlending
		});

		this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
		this.group.add(this.particles);
	}

	update(deltaTime) {
		this.time += deltaTime;

		// Rotar anillo exterior
		if (this.outerRing) {
			this.outerRing.rotation.z += 0.01;
		}

		// Rotar vórtice en dirección opuesta
		if (this.vortex) {
			this.vortex.rotation.z -= 0.02;
		}

		// Animar partículas en espiral
		if (this.particles) {
			const positions = this.particles.geometry.attributes.position.array;

			for (let i = 0; i < positions.length; i += 3) {
				const angle = Math.atan2(positions[i + 2], positions[i]);
				const radius = Math.sqrt(positions[i] ** 2 + positions[i + 2] ** 2);

				positions[i] = Math.cos(angle + 0.02) * radius;
				positions[i + 2] = Math.sin(angle + 0.02) * radius;
				positions[i + 1] += 0.02;

				if (positions[i + 1] > 2) {
					positions[i + 1] = -2;
				}
			}

			this.particles.geometry.attributes.position.needsUpdate = true;
		}
	}

	destroy() {
		if (this.group) {
			this.scene.remove(this.group);
			
			// Limpiar geometrías y materiales
			this.group.traverse((child) => {
				if (child.geometry) child.geometry.dispose();
				if (child.material) {
					if (Array.isArray(child.material)) {
						child.material.forEach(mat => mat.dispose());
					} else {
						child.material.dispose();
					}
				}
			});
		}
	}

	getCollider() {
		return this.collider;
	}
}
