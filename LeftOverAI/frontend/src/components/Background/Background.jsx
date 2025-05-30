import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import SimpleBackground from './SimpleBackground';

// Simple WebGL check function
const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
};

const ThreeBackground = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    let renderer, scene, camera, particlesMesh, particlesGeometry, particlesMaterial;
    let animationId;

    try {
      // Scene setup
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      // Only append if mountRef is available
      if (!mountRef.current) return;
      mountRef.current.appendChild(renderer.domElement);

      // Create particles
      particlesGeometry = new THREE.BufferGeometry();
      const particlesCount = 1500;
      const posArray = new Float32Array(particlesCount * 3);

      for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 5;
      }

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

      particlesMaterial = new THREE.PointsMaterial({
        size: 0.005,
        color: 0x4CAF50,
        transparent: true,
        opacity: 0.8,
      });

      particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particlesMesh);

      camera.position.z = 2;

      // Animation
      const animate = () => {
        if (!mountRef.current) return;
        
        animationId = requestAnimationFrame(animate);
        particlesMesh.rotation.x += 0.0005;
        particlesMesh.rotation.y += 0.0005;
        renderer.render(scene, camera);
      };

      animate();

      // Handle window resize
      const handleResize = () => {
        if (!mountRef.current) return;
        
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        window.removeEventListener('resize', handleResize);
        
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        
        if (mountRef.current && renderer.domElement && renderer.domElement.parentNode === mountRef.current) {
          try {
            mountRef.current.removeChild(renderer.domElement);
          } catch (err) {
            console.warn('Could not remove renderer from DOM', err);
          }
        }
        
        if (scene && particlesMesh) {
          scene.remove(particlesMesh);
        }
        
        if (particlesGeometry) {
          particlesGeometry.dispose();
        }
        
        if (particlesMaterial) {
          particlesMaterial.dispose();
        }
        
        if (renderer) {
          renderer.dispose();
        }
      };
    } catch (err) {
      console.error("Error in Three.js setup:", err);
      
      // Cleanup on error
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        
        if (renderer && mountRef.current && renderer.domElement && renderer.domElement.parentNode === mountRef.current) {
          try {
            mountRef.current.removeChild(renderer.domElement);
          } catch (err) {
            console.warn('Could not remove renderer from DOM during error cleanup', err);
          }
        }
      };
    }
  }, []);

  return <div ref={mountRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />;
};

// Main Background component that chooses the appropriate implementation
const Background = () => {
  // Use WebGL detection to choose between Three.js background and simple CSS background
  const [useSimpleBackground, setUseSimpleBackground] = useState(false);
  
  useEffect(() => {
    // Check if WebGL is available and decide which background to use
    if (!isWebGLAvailable()) {
      setUseSimpleBackground(true);
    }
  }, []);

  return useSimpleBackground ? <SimpleBackground /> : <ThreeBackground />;
};

export default Background; 