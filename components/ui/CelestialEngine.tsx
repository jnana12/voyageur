import React, { useEffect, useRef } from 'react';
import { useOptimizedCanvas } from '../../hooks/useOptimizedCanvas';

export const CelestialEngine: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
    const { pixelRatio, particleCount, enableInteraction } = useOptimizedCanvas();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;

        // Configuration
        // STAR_COUNT is now dynamic based on useOptimizedCanvas
        const stars: any[] = [];
        const comets: any[] = [];

        const initStars = () => {
            stars.length = 0;
            // Use dynamic particleCount
            for (let i = 0; i < particleCount; i++) {
                const z = Math.random() * 2;
                stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    z: z,
                    size: Math.random() * 1.2 + 0.2,
                    opacity: Math.random() * 0.8 + 0.2,
                    pulseSpeed: 0.01 + Math.random() * 0.02,
                    offset: Math.random() * Math.PI * 2,
                    driftX: (Math.random() - 0.5) * 0.1,
                    driftY: (Math.random() - 0.5) * 0.1
                });
            }
        };

        const createComet = () => {
            if (comets.length > 3) return;
            const side = Math.floor(Math.random() * 4);
            let x, y, vx, vy;
            if (side === 0) { x = Math.random() * canvas.width; y = -50; vx = (Math.random() - 0.5) * 5; vy = Math.random() * 10 + 5; }
            else if (side === 1) { x = Math.random() * canvas.width; y = canvas.height + 50; vx = (Math.random() - 0.5) * 5; vy = -(Math.random() * 10 + 5); }
            else if (side === 2) { x = -50; y = Math.random() * canvas.height; vx = Math.random() * 10 + 5; vy = (Math.random() - 0.5) * 5; }
            else { x = canvas.width + 50; y = Math.random() * canvas.height; vx = -(Math.random() * 10 + 5); vy = (Math.random() - 0.5) * 5; }

            comets.push({ x, y, vx, vy, size: Math.random() * 2 + 1, life: 1.0 });
        };

        const handleResize = () => {
            // Apply scale logic for crispness vs performance
            const width = window.innerWidth;
            const height = window.innerHeight;

            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.scale(pixelRatio, pixelRatio);

            initStars();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!enableInteraction) return; // Skip if interaction disabled
            mouseRef.current.targetX = e.clientX;
            mouseRef.current.targetY = e.clientY;
        };

        window.addEventListener('resize', handleResize);
        if (enableInteraction) {
            window.addEventListener('mousemove', handleMouseMove);
        }

        handleResize();

        const draw = () => {
            time += 0.004;

            if (Math.random() < 0.005) createComet();

            if (enableInteraction) {
                mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
                mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;
            } else {
                // Auto-drift center if no mouse
                mouseRef.current.x = window.innerWidth / 2 + Math.sin(time * 0.5) * 50;
                mouseRef.current.y = window.innerHeight / 2 + Math.cos(time * 0.3) * 50;
            }

            // Using logic width (CSS width) for calculations to match drawing coords
            const width = canvas.width / pixelRatio;
            const height = canvas.height / pixelRatio;

            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // 1. NEBULA LAYER - Vibrant & Multi-colored
            ctx.globalCompositeOperation = 'screen';
            const flareLayers = [
                { h: 190, s: 100, l: 15, a: 0.60, speed: 0.3, scale: 0.55, drift: 0.10 }, // Cyan
                { h: 330, s: 100, l: 15, a: 0.55, speed: 0.5, scale: 0.65, drift: 0.14 }, // Pink
                { h: 30, s: 100, l: 15, a: 0.50, speed: 0.8, scale: 0.45, drift: 0.18 }, // Orange
                { h: 220, s: 100, l: 15, a: 0.55, speed: 0.2, scale: 0.75, drift: 0.08 }, // Blue
                { h: 160, s: 100, l: 12, a: 0.40, speed: 0.6, scale: 0.35, drift: 0.12 }, // Emerald
                { h: 280, s: 100, l: 15, a: 0.45, speed: 0.4, scale: 0.50, drift: 0.15 }, // Purple
                { h: 50, s: 100, l: 15, a: 0.35, speed: 0.7, scale: 0.40, drift: 0.20 }   // Gold
            ];

            // On mobile, render fewer layers for performance
            const activeLayers = enableInteraction ? flareLayers : flareLayers.slice(0, 4);

            activeLayers.forEach((layer, i) => {
                const hue = layer.h + Math.sin(time * 0.2 + i) * 12;
                const colorStr = `hsla(${hue}, ${layer.s}%, ${layer.l}%, ${layer.a})`;

                const x = width / 2 + Math.sin(time * layer.speed + i) * (width * 0.35);
                const y = height / 2 + Math.cos(time * layer.speed * 0.6 + i) * (height * 0.35);

                const mouseX = (mouseRef.current.x - width / 2) * layer.drift;
                const mouseY = (mouseRef.current.y - height / 2) * layer.drift;

                const grad = ctx.createRadialGradient(
                    x + mouseX, y + mouseY, 0,
                    x + mouseX, y + mouseY, width * layer.scale
                );

                grad.addColorStop(0, colorStr);
                grad.addColorStop(0.25, colorStr.replace(`${layer.a})`, `${layer.a * 0.5})`));
                grad.addColorStop(0.6, 'transparent');

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, width, height);
            });

            // --- PRISMATIC RAINBOW FLARE SYSTEM ---
            const flareX = width * 0.2 + (mouseRef.current.x - width / 2) * 0.05;
            const flareY = height * 0.2 + (mouseRef.current.y - height / 2) * 0.05;
            const centerX = width / 2;
            const centerY = height / 2;
            const vx = centerX - flareX;
            const vy = centerY - flareY;

            const ghostPoints = [0.3, 0.5, 0.8, 1.1, 1.4, 1.8, -0.2, -0.5, -0.8];
            // Reduce ghosts on mobile
            const activeGhosts = enableInteraction ? ghostPoints : ghostPoints.filter((_, i) => i % 2 === 0);

            activeGhosts.forEach((p, i) => {
                const gx = flareX + vx * p;
                const gy = flareY + vy * p;
                const size = 30 + Math.abs(p) * 60;
                const hue = (i * 40 + time * 10) % 360;

                const ghostGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, size);
                ghostGrad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.15)`);
                ghostGrad.addColorStop(0.4, `hsla(${(hue + 20) % 360}, 100%, 50%, 0.05)`);
                ghostGrad.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.arc(gx, gy, size, 0, Math.PI * 2);
                ctx.fillStyle = ghostGrad;
                ctx.fill();
                // Removed the stroke ring to eliminate hard boundaries
            });

            const coreGrad = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, 200);
            coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            coreGrad.addColorStop(0.1, 'hsla(190, 100%, 70%, 0.3)');
            coreGrad.addColorStop(0.2, 'hsla(330, 100%, 70%, 0.2)');
            coreGrad.addColorStop(0.4, 'hsla(30, 100%, 70%, 0.1)');
            coreGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = coreGrad;
            ctx.fillRect(0, 0, width, height);

            // 2. STARFIELD LAYER & COMETS
            ctx.globalCompositeOperation = 'source-over';

            comets.forEach((comet, i) => {
                comet.x += comet.vx;
                comet.y += comet.vy;
                comet.life -= 0.01;
                if (comet.life <= 0) { comets.splice(i, 1); return; }

                ctx.beginPath();
                const tailGrad = ctx.createLinearGradient(comet.x, comet.y, comet.x - comet.vx * 10, comet.y - comet.vy * 10);
                tailGrad.addColorStop(0, `rgba(255, 255, 255, ${comet.life})`);
                tailGrad.addColorStop(1, 'transparent');
                ctx.strokeStyle = tailGrad;
                ctx.lineWidth = comet.size;
                ctx.moveTo(comet.x, comet.y);
                ctx.lineTo(comet.x - comet.vx * 10, comet.y - comet.vy * 10);
                ctx.stroke();
            });

            stars.forEach((star) => {
                star.x += star.driftX;
                star.y += star.driftY;
                if (star.x < 0) star.x = width;
                if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height;
                if (star.y > height) star.y = 0;

                // Parallax Effect
                const px = (mouseRef.current.x - width / 2) * (star.z * 0.02);
                const py = (mouseRef.current.y - height / 2) * (star.z * 0.02);

                const p = (Math.sin(time * star.pulseSpeed * 60 + star.offset) + 1) / 2;
                const currentOpacity = star.opacity * (0.3 + p * 0.7);

                ctx.beginPath();
                ctx.arc(star.x + px, star.y + py, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
                ctx.fill();

                // Mouse Connection Lines - ONLY IF INTERACTION ENABLED
                if (enableInteraction) {
                    const dx = (star.x + px) - mouseRef.current.x;
                    const dy = (star.y + py) - mouseRef.current.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(star.x + px, star.y + py);
                        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
                        // Dimmer lines on high DPI to prevent overpowering
                        ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.4;
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(star.x + px, star.y + py, star.size * 2, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(34, 211, 238, ${0.25 * (1 - dist / 120)})`;
                        ctx.fill();
                    }
                }
            });

            // 4. EDGE VIGNETTE
            ctx.globalCompositeOperation = 'multiply';
            const vignette = ctx.createRadialGradient(
                width / 2, height / 2, width * 0.3,
                width / 2, height / 2, width * 0.85
            );
            vignette.addColorStop(0, 'rgba(255, 255, 255, 1)');
            vignette.addColorStop(0.7, 'rgba(150, 150, 150, 1)');
            vignette.addColorStop(1, 'rgba(0, 0, 0, 1)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, width, height);

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', handleResize);
            // Only remove if it was added
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [pixelRatio, particleCount, enableInteraction]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
        />
    );
};
