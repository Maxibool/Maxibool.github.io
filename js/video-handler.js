// video-handler.js - Video carousel and gallery functionality

let videoIndex = 0;

/**
 * Move carousel slide
 */
function moveSlide(direction) {
    const track = document.getElementById('carouselTrack');
    const items = document.querySelectorAll('.carousel-item');
    
    if (!track || items.length === 0) return;
    
    videoIndex = (videoIndex + direction + items.length) % items.length;
    track.style.transform = `translateX(-${videoIndex * 100}%)`;
    
    // Pause all videos when changing slide
    pauseAllVideos();
}

/**
 * Pause all videos in carousel
 */
function pauseAllVideos() {
    document.querySelectorAll('.carousel-item video').forEach(video => {
        video.pause();
    });
}

/**
 * Initialize video carousel
 */
function initVideoCarousel() {
    const carouselContainer = document.querySelector('.video-carousel');
    
    if (!carouselContainer) return;
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const videosTab = document.querySelector('[data-tab="videos"]');
        if (!videosTab || !videosTab.classList.contains('active')) return;
        
        if (e.key === 'ArrowLeft') {
            moveSlide(-1);
        } else if (e.key === 'ArrowRight') {
            moveSlide(1);
        }
    });
    
    // Touch swipe support
    let touchStartX = 0;
    let touchEndX = 0;
    
    carouselContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    carouselContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        if (touchEndX < touchStartX - swipeThreshold) {
            moveSlide(1); // Swipe left
        }
        if (touchEndX > touchStartX + swipeThreshold) {
            moveSlide(-1); // Swipe right
        }
    }
}

/**
 * Initialize gallery tabs
 */
function initGalleryTabs() {
    const galleryTabs = document.querySelectorAll('.gallery-tab');
    
    galleryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            galleryTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show active content
            document.querySelectorAll('.gallery-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-content`) {
                    content.classList.add('active');
                }
            });
            
            // Reset carousel when switching to videos
            if (tabId === 'videos') {
                videoIndex = 0;
                const track = document.getElementById('carouselTrack');
                if (track) {
                    track.style.transform = 'translateX(0)';
                }
                pauseAllVideos();
            }
        });
    });
}

/**
 * Handle video loading errors
 */
function initVideoErrorHandling() {
    document.querySelectorAll('video').forEach(video => {
        video.addEventListener('error', function() {
            const parent = this.parentElement;
            const fallback = document.createElement('div');
            fallback.className = 'video-fallback';
            fallback.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #6c3483, #8e44ad);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 16px;
                text-align: center;
                padding: 20px;
            `;
            fallback.textContent = 'Vidéo non disponible';
            
            this.style.display = 'none';
            parent.appendChild(fallback);
        });
    });
}

/**
 * Initialize on DOM load
 */
document.addEventListener('DOMContentLoaded', function() {
    initGalleryTabs();
    initVideoCarousel();
    initVideoErrorHandling();
});