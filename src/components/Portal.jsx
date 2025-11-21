import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

export default function Portal({ position = [0, 0, 0], onPlayerEnter }) {
  const portalRef = useRef();
  const vortexRef = useRef();
  const particlesRef = useRef();

  // Crear geometría del vórtice
  const vortexGeometry = useMemo(() => {
    const geometry = new THREE.TorusGeometry(2, 0.3, 16, 100);
    return geometry;
  }, []);

  // Crear partículas para el efecto
  const particles = useMemo(() => {
    const count = 1000;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3;
      const height = (Math.random() - 0.5) * 4;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    
    return positions;
  }, []);

  // Animación del portal
  useFrame((state) => {
    if (portalRef.current) {
      portalRef.current.rotation.z += 0.01;
    }
    
    if (vortexRef.current) {
      vortexRef.current.rotation.z -= 0.02;
    }

    // Animar partículas en espiral
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      
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
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      {/* Anillo exterior del portal */}
      <mesh ref={portalRef}>
        <torusGeometry args={[2.5, 0.2, 16, 100]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Vórtice interior */}
      <mesh ref={vortexRef} geometry={vortexGeometry}>
        <meshStandardMaterial
          color="#0066ff"
          emissive="#0066ff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Centro del portal */}
      <mesh>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial
          color="#000033"
          emissive="#0033ff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sistema de partículas */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#00ffff"
          transparent
          opacity={0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Luz del portal */}
      <pointLight
        color="#00ffff"
        intensity={2}
        distance={10}
        decay={2}
      />

      {/* Zona de colisión */}
      <mesh
        visible={false}
        onClick={onPlayerEnter}
      >
        <cylinderGeometry args={[2.5, 2.5, 4, 32]} />
      </mesh>
    </group>
  );
}
