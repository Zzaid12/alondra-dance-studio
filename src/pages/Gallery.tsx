import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/all";
import "./Gallery.css";

// Re-register plugin and create the custom ease
if (typeof window !== "undefined") {
    gsap.registerPlugin(CustomEase);
    CustomEase.create("hop", "0.9, 0, 0.1, 1");
}

const IMAGES = [
    "/nuestraHistoria/IMG_8730.jpg", "/nuestraHistoria/IMG_8733.jpg",
    "/nuestraHistoria/IMG_8735.jpg", "/nuestraHistoria/IMG_8738.jpg",
    "/nuestraHistoria/IMG_8761.jpg", "/nuestraHistoria/IMG_8767.jpg",
    "/nuestraHistoria/IMG_8776.jpg", "/nuestraHistoria/IMG_8777.jpg",
    "/nuestraHistoria/IMG_8778.jpg", "/nuestraHistoria/IMG_8779.jpg",
    "/nuestraHistoria/IMG_8780.jpg", "/nuestraHistoria/IMG_8781.jpg",
    "/nuestraHistoria/IMG_8782.jpg", "/nuestraHistoria/IMG_8783.jpg",
    "/nuestraHistoria/IMG_8784.jpg", "/nuestraHistoria/IMG_8785.jpg"
];

// Base sizes for layout calculation
const COLUMNS = 4;

const getLayoutConfig = () => {
    if (typeof window === "undefined") return { itemWidth: 220, itemHeight: 300, itemGap: 150 };

    const width = window.innerWidth;
    if (width <= 600) {
        return {
            itemWidth: 140,
            itemHeight: 190,
            itemGap: 70 // Smaller gap for mobile
        };
    } else if (width <= 1000) {
        return {
            itemWidth: 180,
            itemHeight: 250,
            itemGap: 100 // Medium gap for tablet
        };
    } else {
        return {
            itemWidth: 220,
            itemHeight: 300,
            itemGap: 100 // Original gap for desktop
        };
    }
};

export default function Gallery() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    const [isExpanded, setIsExpanded] = useState(false);

    const state = useRef({
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        isDragging: false,
        startX: 0,
        startY: 0,
        mouseHasMoved: false,
        visibleItems: new Set<string>(),
        lastUpdateTime: 0,
        canDrag: true,
        activeItemId: null as string | null,
        expandedItem: null as HTMLDivElement | null,
    });

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        const updateVisibleItems = () => {
            const buffer = 1.0;
            const viewWidth = window.innerWidth * (1 + buffer);
            const viewHeight = window.innerHeight * (1 + buffer);

            const { itemWidth, itemHeight, itemGap } = getLayoutConfig();
            const colStep = itemWidth + itemGap;
            const rowStep = itemHeight + itemGap;

            const startCol = Math.floor((-state.current.currentX - viewWidth / 2) / colStep);
            const endCol = Math.ceil((-state.current.currentX + viewWidth * 1.5) / colStep);
            const startRow = Math.floor((-state.current.currentY - viewHeight / 2) / rowStep);
            const endRow = Math.ceil((-state.current.currentY + viewHeight * 1.5) / rowStep);

            const currentItems = new Set<string>();

            for (let row = startRow; row <= endRow; row++) {
                for (let col = startCol; col <= endCol; col++) {
                    const itemId = `${col},${row}`;
                    currentItems.add(itemId);

                    if (state.current.visibleItems.has(itemId)) continue;
                    if (state.current.activeItemId === itemId && state.current.expandedItem) continue;

                    const item = document.createElement("div");
                    item.className = "item";
                    item.id = itemId;
                    item.style.left = `${col * colStep}px`;
                    item.style.top = `${row * rowStep}px`;

                    const itemNum = (Math.abs(row * COLUMNS + col) % IMAGES.length);
                    const imgSrc = IMAGES[itemNum];
                    const img = document.createElement("img");
                    img.src = imgSrc;
                    item.appendChild(img);

                    item.addEventListener("click", () => {
                        if (state.current.mouseHasMoved || state.current.isDragging) return;
                        expandItem(item, itemId, imgSrc);
                    });

                    canvas.appendChild(item);
                    state.current.visibleItems.add(itemId);
                }
            }

            state.current.visibleItems.forEach((itemId) => {
                if (!currentItems.has(itemId) || (state.current.activeItemId === itemId && state.current.expandedItem)) {
                    const item = document.getElementById(itemId);
                    if (item) canvas.removeChild(item);
                    state.current.visibleItems.delete(itemId);
                }
            });
        };

        const expandItem = (itemEl: HTMLElement, itemId: string, imgSrc: string) => {
            const { itemWidth, itemHeight } = getLayoutConfig();
            setIsExpanded(true);
            state.current.activeItemId = itemId;
            state.current.canDrag = false;
            container.style.cursor = "auto";

            itemEl.style.visibility = "hidden";

            const rect = itemEl.getBoundingClientRect();
            const expanded = document.createElement("div");
            expanded.className = "gallery-expanded-item";
            expanded.style.width = `${itemWidth}px`;
            expanded.style.height = `${itemHeight}px`;

            const img = document.createElement("img");
            img.src = imgSrc;
            expanded.appendChild(img);
            document.body.appendChild(expanded);
            state.current.expandedItem = expanded;

            // Fade out others
            document.querySelectorAll(".item").forEach((el: any) => {
                if (el.id !== itemId) gsap.to(el, { opacity: 0, duration: 0.3 });
            });

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Target expanded size (elegant zoom: 75% of screen height)
            const targetHeight = viewportHeight * 0.75;
            const targetWidth = targetHeight * (itemWidth / itemHeight);

            gsap.fromTo(expanded,
                {
                    width: itemWidth,
                    height: itemHeight,
                    x: rect.left + itemWidth / 2 - window.innerWidth / 2,
                    y: rect.top + itemHeight / 2 - window.innerHeight / 2,
                },
                {
                    width: targetWidth,
                    height: targetHeight,
                    x: 0,
                    y: 0,
                    duration: 0.8,
                    ease: "hop",
                }
            );
        };

        const animate = () => {
            if (state.current.canDrag) {
                state.current.currentX += (state.current.targetX - state.current.currentX) * 0.075;
                state.current.currentY += (state.current.targetY - state.current.currentY) * 0.075;
                canvas.style.transform = `translate(${state.current.currentX}px, ${state.current.currentY}px)`;

                const now = Date.now();
                if (now - state.current.lastUpdateTime > 100) {
                    updateVisibleItems();
                    state.current.lastUpdateTime = now;
                }
            }
            requestAnimationFrame(animate);
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (!state.current.canDrag) return;
            state.current.isDragging = true;
            state.current.mouseHasMoved = false;
            state.current.startX = e.clientX;
            state.current.startY = e.clientY;
            container.style.cursor = "grabbing";
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!state.current.isDragging || !state.current.canDrag) return;
            const dx = e.clientX - state.current.startX;
            const dy = e.clientY - state.current.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) state.current.mouseHasMoved = true;
            state.current.targetX += dx;
            state.current.targetY += dy;
            state.current.startX = e.clientX;
            state.current.startY = e.clientY;
        };

        const handleMouseUp = () => {
            state.current.isDragging = false;
            if (state.current.canDrag) container.style.cursor = "grab";
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (!state.current.canDrag) return;
            state.current.isDragging = true;
            state.current.mouseHasMoved = false;
            state.current.startX = e.touches[0].clientX;
            state.current.startY = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!state.current.isDragging || !state.current.canDrag) return;
            const dx = e.touches[0].clientX - state.current.startX;
            const dy = e.touches[0].clientY - state.current.startY;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) state.current.mouseHasMoved = true;
            state.current.targetX += dx;
            state.current.targetY += dy;
            state.current.startX = e.touches[0].clientX;
            state.current.startY = e.touches[0].clientY;
        };

        const handleTouchEnd = () => {
            state.current.isDragging = false;
        };

        container.addEventListener("mousedown", handleMouseDown);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        container.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchend", handleTouchEnd);

        updateVisibleItems();
        const animId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animId);
            container.removeEventListener("mousedown", handleMouseDown);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            container.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, []);

    const closeExpandedItem = () => {
        if (!state.current.expandedItem) return;
        const expanded = state.current.expandedItem!;
        const { itemWidth, itemHeight } = getLayoutConfig();

        const originalItem = document.getElementById(state.current.activeItemId!);
        if (!originalItem) return;

        const rect = originalItem.getBoundingClientRect();

        gsap.to(expanded, {
            width: itemWidth,
            height: itemHeight,
            x: rect.left + itemWidth / 2 - window.innerWidth / 2,
            y: rect.top + itemHeight / 2 - window.innerHeight / 2,
            duration: 0.8,
            ease: "hop",
            onComplete: () => {
                if (expanded.parentNode) document.body.removeChild(expanded);
                originalItem.style.visibility = "visible";
                document.querySelectorAll(".item").forEach((el: any) => gsap.to(el, { opacity: 1, duration: 0.5 }));

                state.current.expandedItem = null;
                state.current.activeItemId = null;
                state.current.canDrag = true;
                setIsExpanded(false);
            }
        });
    };

    return (
        <div className="gallery-page-container">
            <div
                ref={containerRef}
                className="gallery-container"
                style={{ cursor: isExpanded ? "auto" : "grab" }}
            >
                <div ref={canvasRef} className="gallery-canvas" />
            </div>

            <div className={`gallery-overlay ${isExpanded ? "active" : ""}`} onClick={closeExpandedItem} />

            <div className="gallery-instructions">
                {isExpanded ? "Haz clic para cerrar" : "Arrastra para explorar"}
            </div>
        </div>
    );
}
