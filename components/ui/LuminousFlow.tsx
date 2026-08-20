import React, { useEffect, useRef } from 'react';
import { useOptimizedCanvas } from '../../hooks/useOptimizedCanvas';

export const LuminousFlow: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
    const { pixelRatio, enableInteraction } = useOptimizedCanvas();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;

        const handleResize = () => {
            // Apply scale logic for crispness vs performance
            const width = window.innerWidth;
            const height = window.innerHeight;

            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;
            // Force CSS style to match window, drawing buffer to match pixelRatio
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.scale(pixelRatio, pixelRatio);
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!enableInteraction) return;
            mouseRef.current.targetX = e.clientX;
            mouseRef.current.targetY = e.clientY;
        };

        window.addEventListener('resize', handleResize);
        if (enableInteraction) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        handleResize();

        // Initialize mouse at center
        mouseRef.current.x = mouseRef.current.targetX = window.innerWidth / 2;
        mouseRef.current.y = mouseRef.current.targetY = window.innerHeight / 2;

        const draw = () => {
            time += 0.003;

            if (enableInteraction) {
                // Smoothly interpolate mouse position
                mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
                mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
            } else {
                // Auto-drift for visuals if no mouse
                mouseRef.current.x = window.innerWidth / 2 + Math.sin(time * 0.2) * 100;
                mouseRef.current.y = window.innerHeight / 2 + Math.cos(time * 0.3) * 50;
            }

            // Calculations use logical CSS width
            const width = canvas.width / pixelRatio;
            const height = canvas.height / pixelRatio;

            // Clear with deep black
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Define a more complex "Nebula" palette
            const layers = [
                { color: { h: 190, s: 80, l: 50 }, a: 0.15, speed: 0.8, size: 0.8, drift: 0.1 },  // Cyan
                { color: { h: 330, s: 70, l: 50 }, a: 0.12, speed: 0.6, size: 0.9, drift: 0.15 }, // Pink
                { color: { h: 30, s: 90, l: 50 }, a: 0.10, speed: 1.1, size: 0.7, drift: 0.2 },   // Orange
                { color: { h: 220, s: 60, l: 50 }, a: 0.14, speed: 0.4, size: 1.0, drift: 0.05 }, // Blue
                { color: { h: 160, s: 80, l: 50 }, a: 0.08, speed: 0.9, size: 0.6, drift: 0.18 }, // Emerald
                { color: { h: 0, s: 0, l: 100 }, a: 0.04, speed: 1.5, size: 0.4, drift: 0.25 }    // White Light
            ];

            // Render fewer layers on mobile
            const activeLayers = enableInteraction ? layers : layers.slice(0, 4);

            ctx.globalCompositeOperation = 'screen';

            activeLayers.forEach((layer, i) => {
                // Time-varying hue shift for "alive" colors
                const hue = layer.color.h + Math.sin(time * 0.5 + i) * 10;
                const colorStr = `hsla(${hue}, ${layer.color.s}%, ${layer.color.l}%, ${layer.a})`;

                // Multi-octave wave movement with "Breathing" scale
                const breathe = 1 + Math.sin(time * 0.5 + i) * 0.1;
                const xNoise = Math.sin(time * layer.speed + i) * (width * 0.2) +
                    Math.cos(time * 0.4 * layer.speed + i) * (width * 0.1);
                const yNoise = Math.cos(time * layer.speed * 0.7 + i) * (height * 0.2) +
                    Math.sin(time * 0.2 * layer.speed + i) * (height * 0.1);

                const mouseInfluenceX = (mouseRef.current.x - width / 2) * (layer.drift + i * 0.02);
                const mouseInfluenceY = (mouseRef.current.y - height / 2) * (layer.drift + i * 0.02);

                const posX = width / 2 + xNoise + mouseInfluenceX;
                const posY = height / 2 + yNoise + mouseInfluenceY;
                const radius = width * layer.size * breathe;

                // Complex Gradient for softer falloff
                const gradient = ctx.createRadialGradient(
                    posX, posY, 0,
                    posX, posY, radius
                );

                gradient.addColorStop(0, colorStr);
                gradient.addColorStop(0.3, colorStr.replace(`${layer.a})`, `${layer.a * 0.5})`));
                gradient.addColorStop(0.6, colorStr.replace(`${layer.a})`, `0)`));
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
            });

            // Add a subtle vignette to keep edges dark - IMPROVED
            ctx.globalCompositeOperation = 'multiply';
            const vignette = ctx.createRadialGradient(
                width / 2, height / 2, width * 0.2,
                width / 2, height / 2, width * 0.8
            );
            vignette.addColorStop(0, 'rgba(255, 255, 255, 1)');
            vignette.addColorStop(0.6, 'rgba(200, 200, 200, 1)');
            vignette.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (enableInteraction) {
                window.removeEventListener('mousemove', handleMouseMove);
            }
            cancelAnimationFrame(animationFrameId);
        };
    }, [pixelRatio, enableInteraction]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{
                zIndex: 0,
                filter: 'contrast(110%) brightness(105%)'
            }}
        />
    );
};

