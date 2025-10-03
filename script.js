document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const display = document.getElementById('display');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const lapBtn = document.getElementById('lapBtn');
    const exportBtn = document.getElementById('exportBtn');
    const themeToggle = document.getElementById('themeToggle');
    const soundToggle = document.getElementById('soundToggle');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
    const lapList = document.getElementById('lapList');
    const lapSearch = document.getElementById('lapSearch');
    const clearLapsBtn = document.getElementById('clearLapsBtn');
    
    // Graph Elements
    const expandGraphBtn = document.getElementById('expandGraphBtn');
    const exportGraphBtn = document.getElementById('exportGraphBtn');
    const graphModal = document.getElementById('graphModal');
    const closeGraphBtn = document.getElementById('closeGraphBtn');
    const modalStopwatch = document.getElementById('modalStopwatch');
    const lapCanvas = document.getElementById('lapCanvas');
    const lapAxis = document.getElementById('lapAxis');
    
    // Modal Elements
    const modal = document.getElementById('confirmationModal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const avgLapDisplay = document.getElementById('avgLap');
    const fastestLapDisplay = document.getElementById('fastestLap');
    const totalElapsedDisplay = document.getElementById('totalElapsed');
    
    // Stopwatch variables
    let startTime = 0;
    let elapsedTime = 0;
    let timerInterval = null;
    let modalStopwatchInterval = null;
    let isRunning = false;
    let laps = [];
    let lapStartTime = 0;
    let soundEnabled = false;
    let lastMouseMoveTime = 0; // For throttling mouse events
    let graphUpdateCount = 0;
    let highPerformanceMode = true;  // Controls frequency of graph updates
    let mouseAnimationTimeout = null; // For removing no-animations class
    let isGraphOpen = false; // Track if graph modal is open
    let wasRunningBeforeGraph = false; // Track if timer was running before opening graph
    
    // Initialize
    function init() {
        // Check for saved theme preference
        if (localStorage.getItem('darkTheme') === 'true') {
            document.body.classList.add('dark-theme');
        }
        
        // Check for saved sound preference
        if (localStorage.getItem('soundEnabled') === 'true') {
            soundEnabled = true;
            soundToggle.checked = true;
        }
        
        // Check for saved laps
        const savedLaps = localStorage.getItem('laps');
        if (savedLaps) {
            laps = JSON.parse(savedLaps);
            renderLaps();
            updateStats();
            updateVisualization();
        } else {
            // Initialize empty visualization
            updateVisualization();
        }
        
        // DISABLE resize listener to prevent flickering
        // We're using fixed dimensions for all elements now
    }
    
    // Event Listeners
    startPauseBtn.addEventListener('click', toggleStartPause);
    resetBtn.addEventListener('click', resetStopwatch);
    lapBtn.addEventListener('click', recordLap);
    exportBtn.addEventListener('click', exportLaps);
    themeToggle.addEventListener('click', toggleTheme);
    soundToggle.addEventListener('change', toggleSound);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    exitFullscreenBtn.addEventListener('click', exitFullscreen);
    lapSearch.addEventListener('input', filterLaps);
    clearLapsBtn.addEventListener('click', clearLaps);
    
    // Graph Event Listeners
    expandGraphBtn.addEventListener('click', showGraphModal);
    exportGraphBtn.addEventListener('click', exportGraph);
    
    // Make sure the close button always works - add the event listener with capture to ensure it's not stopped
    closeGraphBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent event bubbling
        closeGraphModal();
    }, { capture: true });
    
    // Add touch events for modals
    graphModal.addEventListener('touchstart', handleModalTouch, { passive: false });
    document.addEventListener('touchstart', (e) => {
        // Prevent any bubbling issues that might cause flickering
        e.stopPropagation();
    }, { passive: true });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent scrolling
            toggleStartPause();
        } else if (e.key.toLowerCase() === 'l') {
            recordLap();
        } else if (e.key.toLowerCase() === 'r') {
            resetStopwatch();
        } else if (e.key.toLowerCase() === 'g') {
            // Toggle graph modal
            if (graphModal.style.display === 'flex') {
                closeGraphModal();
            } else {
                showGraphModal();
            }
        } else if (e.key.toLowerCase() === 'e') {
            // Export graph
            exportGraph();
        } else if (e.key === 'Escape') {
            // Handle escape key for both fullscreen mode and graph modal
            if (graphModal.style.display === 'flex') {
                closeGraphModal();
            } else if (document.body.classList.contains('fullscreen-mode')) {
                exitFullscreen();
            }
        }
    });
    
    // Format time as HH:MM:SS.ms
    function formatTime(timeInMs) {
        let hours = Math.floor(timeInMs / 3600000);
        let minutes = Math.floor((timeInMs % 3600000) / 60000);
        let seconds = Math.floor((timeInMs % 60000) / 1000);
        let milliseconds = timeInMs % 1000;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }
    
    // Update display
    function updateDisplay() {
        const currentTime = startTime ? Date.now() - startTime + elapsedTime : elapsedTime;
        display.textContent = formatTime(currentTime);
        totalElapsedDisplay.textContent = formatTime(currentTime);
        
        // Never update graph while modal is open - completely frozen for no flickering
        // The main timer in background will still be visible through the transparent modal
    }
    
    // Start/Pause the stopwatch
    function toggleStartPause() {
        if (isRunning) {
            // Pause
            clearInterval(timerInterval);
            elapsedTime += Date.now() - startTime;
            startTime = 0;
            startPauseBtn.textContent = 'Start';
            startPauseBtn.classList.add('primary');
            document.body.classList.remove('running'); // Remove running class
            
            // When pausing, force a graph update if modal is open
            if (graphModal.classList.contains('active')) {
                drawLapChart();
            }
            
            // Clean up modal interval if exists
            if (modalStopwatchInterval) {
                clearInterval(modalStopwatchInterval);
                modalStopwatchInterval = null;
            }
        } else {
            // Start
            startTime = Date.now();
            if (laps.length === 0) {
                lapStartTime = startTime;
            } else {
                // Ensure consistent timing for lap calculations
                const lastTotalTime = laps.length > 0 ? laps[laps.length - 1].totalTime : 0;
                elapsedTime = Math.max(elapsedTime, lastTotalTime);
            }
            
            // Reset graph update counter
            graphUpdateCount = 0;
            
            timerInterval = setInterval(updateDisplay, 10);
            startPauseBtn.textContent = 'Pause';
            startPauseBtn.classList.remove('primary');
            playSound('start');
            document.body.classList.add('running'); // Add running class
            
            // Make sure animation is marked as complete
            document.body.classList.add('animation-complete');
        }
        isRunning = !isRunning;
    }
    
    // Reset the stopwatch
    function resetStopwatch() {
        clearInterval(timerInterval);
        startTime = 0;
        elapsedTime = 0;
        isRunning = false;
        lapStartTime = 0;
        
        display.textContent = formatTime(0);
        totalElapsedDisplay.textContent = formatTime(0);
        startPauseBtn.textContent = 'Start';
        startPauseBtn.classList.add('primary');
        document.body.classList.remove('running'); // Remove running class
        
        // If the graph is not open, update the visualization
        if (!isGraphOpen) {
            updateVisualization();
        }
        
        playSound('reset');
    }
    
// Record a lap
function recordLap() {
    if (isRunning || elapsedTime > 0) {
        const currentTime = startTime ? Date.now() - startTime + elapsedTime : elapsedTime;
        // Ensure lap time is never negative by using Math.max
        const lapTime = Math.max(0, currentTime - (laps.length > 0 ? laps[laps.length - 1].totalTime : 0));
        
        const lap = {
            number: laps.length + 1,
            time: lapTime,
            totalTime: currentTime,
            formattedTime: formatTime(lapTime),
            formattedTotalTime: formatTime(currentTime)
        };
        
        laps.push(lap);
        renderLaps();
        updateStats();
        updateVisualization();
        saveLaps();
        playSound('lap');
    }
}    // Render laps list
    function renderLaps() {
        lapList.innerHTML = '';
        
        // If no laps, show message
        if (laps.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'lap-item';
            emptyMessage.textContent = 'No laps recorded yet';
            lapList.appendChild(emptyMessage);
            return;
        }
        
        // Find fastest and slowest laps
        let fastestLap = laps.reduce((prev, current) => 
            (prev.time < current.time) ? prev : current, laps[0]);
        
        let slowestLap = laps.reduce((prev, current) => 
            (prev.time > current.time) ? prev : current, laps[0]);
        
        // Filter laps if search is active
        const searchTerm = lapSearch.value.toLowerCase();
        const filteredLaps = searchTerm ? 
            laps.filter(lap => lap.number.toString().includes(searchTerm) || 
                              lap.formattedTime.includes(searchTerm)) : 
            [...laps];
            
        // Sort laps newest first
        filteredLaps.slice().reverse().forEach((lap, i) => {
            const lapItem = document.createElement('div');
            lapItem.className = 'lap-item';
            
            // Add class if fastest or slowest
            if (lap.time === fastestLap.time) lapItem.classList.add('fastest');
            if (lap.time === slowestLap.time) lapItem.classList.add('slowest');
            
            // Calculate difference from previous lap
            let diffHtml = '';
            if (i < filteredLaps.length - 1) {
                const prevIndex = laps.findIndex(l => l.number === lap.number) + 1;
                if (prevIndex < laps.length) {
                    const prevLap = laps[prevIndex];
                    // Ensure diff is not negative due to timing inconsistencies
                    const diff = lap.time - prevLap.time;
                    const sign = diff > 0 ? '+' : '';
                    const className = diff > 0 ? 'slower' : 'faster';
                    diffHtml = `<span class="lap-diff ${className}">${sign}${formatTime(Math.abs(diff))}</span>`;
                }
            }
            
            lapItem.innerHTML = `
                <span>#${lap.number}</span>
                <span>${lap.formattedTime} ${diffHtml}</span>
            `;
            
            lapList.appendChild(lapItem);
        });
    }
    
// Update statistics
function updateStats() {
    if (laps.length === 0) {
        avgLapDisplay.textContent = '--:--:--';
        fastestLapDisplay.textContent = '--:--:--';
        return;
    }
    
    // Calculate average lap time
    const totalLapTime = laps.reduce((sum, lap) => sum + lap.time, 0);
    const averageLap = totalLapTime / laps.length;
    avgLapDisplay.textContent = formatTime(averageLap);
    
    // Find fastest lap
    const fastestLap = laps.reduce((prev, current) => 
        (prev.time < current.time) ? prev : current, laps[0]);
    // Update fastest lap display to show both lap number and time
    fastestLapDisplay.textContent = `Lap ${fastestLap.number}: ${fastestLap.formattedTime}`;
}

// Update visualization
function updateVisualization() {
    // Skip updates if graph modal is open - this prevents flickering
    if (isGraphOpen) return;
    
    const lapVisualization = document.getElementById('lapVisualization');
    const lapAxis = document.getElementById('lapAxis');
    
    // Clear previous visualization
    lapVisualization.innerHTML = '';
    lapAxis.innerHTML = '';
    
    if (laps.length === 0) {
        // Show placeholder if no laps
        const placeholder = document.createElement('div');
        placeholder.className = 'visualization-placeholder';
        placeholder.textContent = 'Record laps to see visualization';
        lapVisualization.appendChild(placeholder);
        return;
    }
    
    // Find fastest and slowest laps
    let fastestLap = laps.reduce((prev, current) => 
        (prev.time < current.time) ? prev : current, laps[0]);
    
    let slowestLap = laps.reduce((prev, current) => 
        (prev.time > current.time) ? prev : current, laps[0]);
    
    // Find max lap time for scaling
    const maxLapTime = slowestLap.time;
    
    // Create a container for all bars to enable proper scrolling
    const chartContainer = document.createElement('div');
    chartContainer.className = 'lap-chart-container';
    lapVisualization.appendChild(chartContainer);
    
    // Fixed bar width regardless of number of laps
    const barWidth = 24; // px
    const barGap = 8; // px
    const totalBarWidth = barWidth + barGap;
    
    // Create visualization bars for ALL laps, not just the latest ones
    laps.forEach((lap, index) => {
        // Calculate height percentage
        const heightPercentage = (lap.time / maxLapTime) * 90; // Max 90% height to leave room for label
        // Minimum height of 5%
        const height = Math.max(5, heightPercentage);
        
        // Create bar container
        const barContainer = document.createElement('div');
        barContainer.style.display = 'inline-flex';
        barContainer.style.flexDirection = 'column';
        barContainer.style.alignItems = 'center';
        barContainer.style.position = 'relative';
        barContainer.style.width = `${barWidth + barGap}px`;
        
        // Create lap bar
        const bar = document.createElement('div');
        bar.className = 'lap-bar';
        
        // Add class if fastest or slowest
        if (lap.time === fastestLap.time) bar.classList.add('fastest');
        if (lap.time === slowestLap.time) bar.classList.add('slowest');
        
        // Set bar style
        bar.style.setProperty('--height', `${height}%`);
        
        // Add time value above bar
        const valueLabel = document.createElement('div');
        valueLabel.className = 'lap-bar-value';
        valueLabel.textContent = formatTimeShort(lap.time);
        
        // Add label
        const label = document.createElement('div');
        label.className = 'lap-bar-label';
        label.textContent = `#${lap.number}`;
        
        barContainer.appendChild(valueLabel);
        barContainer.appendChild(bar);
        barContainer.appendChild(label);
        chartContainer.appendChild(barContainer);
        
        // Removed axis ticks with 'Lap X' labels for cleaner look
        // The #X labels on the bars themselves are sufficient
    });
    
    // Auto-scroll to the most recent laps
    if (laps.length > 8) {
        setTimeout(() => {
            lapVisualization.scrollLeft = lapVisualization.scrollWidth;
        }, 100);
    }
    
    // Synchronize scroll between visualization and axis
    lapVisualization.addEventListener('scroll', () => {
        lapAxis.scrollLeft = lapVisualization.scrollLeft;
    });
    
    lapAxis.addEventListener('scroll', () => {
        lapVisualization.scrollLeft = lapAxis.scrollLeft;
    });
    
    // Also update the canvas in the modal if it's open
    if (graphModal.style.display === 'flex') {
        drawLapChart();
    }
}

// Format time as MM:SS.ms (shorter format for visualization labels)
function formatTimeShort(timeInMs) {
    let minutes = Math.floor((timeInMs % 3600000) / 60000);
    let seconds = Math.floor((timeInMs % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Show graph in fullscreen modal - frozen state to prevent flickering
function showGraphModal() {
    // Prevent multiple invocations and make sure modal is in correct state
    if (graphModal.classList.contains('active')) {
        closeGraphModal();
        return;
    }
    
    // Make sure we start from a clean state
    graphModal.classList.remove('active');
    document.body.classList.remove('modal-active');
    document.body.classList.remove('no-animations');
    
    // Stop the timer if it's running and remember it was running
    wasRunningBeforeGraph = isRunning;
    if (isRunning) {
        clearInterval(timerInterval);
        elapsedTime += Date.now() - startTime;
        startTime = 0;
        startPauseBtn.textContent = 'Start';
        startPauseBtn.classList.add('primary');
        document.body.classList.remove('running');
        isRunning = false;
    }
    
    // Mark that graph is open - this will prevent any updates while open
    isGraphOpen = true;
    
    // Mark body as having modal active and disable ALL animations
    document.body.classList.add('modal-active');
    document.body.classList.add('no-animations');
    
    // First draw the graph before freezing updates
    drawLapChart();
    
    // Reset graph update counter
    graphUpdateCount = 0;
    
    // Show modal with smooth animation
    graphModal.style.display = 'flex';
    
    // Use requestAnimationFrame to ensure the display property change takes effect
    // before adding the active class for smooth animation
    requestAnimationFrame(() => {
        graphModal.classList.add('active');
    });
    
    // Set canvas dimensions and draw chart only once
    setTimeout(() => {
        const container = lapCanvas.closest('.graph-modal-body');
        if (container) {
            const width = Math.min(800, container.clientWidth - 40);
            const height = Math.min(400, container.clientHeight - 40);
            lapCanvas.width = width;
            lapCanvas.height = height;
        }
        // Draw chart just once when opened - it won't update again until closed and reopened
        drawLapChart();
    }, 50);
    
    // Remove any previous interval to prevent duplicates
    if (modalStopwatchInterval) {
        clearInterval(modalStopwatchInterval);
        modalStopwatchInterval = null;
    }
    
    playSound('click');
    
    // Add event listener to close modal when clicking outside
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchend', handleOutsideClick, { passive: true });
    
    // Remove all event handlers to completely prevent any flickering
    // Use capture on a single event handler to prevent any mouse events from causing updates
    document.addEventListener('mousemove', (e) => e.stopPropagation(), { capture: true, passive: false, once: false });
    
    // Only add a single event handler directly to the document to capture all mouse events
    // This completely prevents any other handlers from receiving the events
}

// Handle clicks outside the modal content
function handleOutsideClick(event) {
    const modalContent = graphModal.querySelector('.graph-modal-content');
    
    // If the click is on the modal background (not on the content)
    if (event.target === graphModal) {
        closeGraphModal();
    }
}

// Handle touch events for modal
function handleModalTouch(event) {
    // Only process if it's a tap on the background
    if (event.target === graphModal) {
        // Prevent default to avoid any flickering
        event.preventDefault();
        closeGraphModal();
    }
}

// Complete event blocker to prevent any mouse-related updates
function handleMouseMove(event) {
    if (isGraphOpen) {
        // Block ALL events when graph is open
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
    }
}

// Handle mouse leaving the graph area
function handleMouseLeave(event) {
    // Prevent unnecessary redraws when mouse leaves the modal
    event.stopPropagation();
}

// Close graph modal with smooth animation
function closeGraphModal() {
    // Prevent multiple invocations
    if (!graphModal.classList.contains('active')) return;
    
    // Remove event listeners for click outside
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('touchend', handleOutsideClick);
    
    // Remove mouse event handlers but don't replace elements
    // This was causing the close button to stop working
    document.removeEventListener('mousemove', handleMouseMove, { capture: true });
    graphModal.removeEventListener('mousemove', handleMouseMove);
    graphModal.removeEventListener('mouseleave', handleMouseLeave);
    graphModal.removeEventListener('mouseenter', handleMouseLeave);
    
    // Animate closing
    graphModal.classList.remove('active');
    
    // Immediately hide the modal to prevent visibility issues
    graphModal.style.display = 'none';
    
    // Remove modal-active and no-animations classes from body immediately
    document.body.classList.remove('modal-active');
    document.body.classList.remove('no-animations');
    
    // Clear any modal update interval
    if (modalStopwatchInterval) {
        clearInterval(modalStopwatchInterval);
        modalStopwatchInterval = null;
    }
    
    // Mark that graph is closed - updates can happen again
    isGraphOpen = false;
    
    // Restart timer if it was running before graph opened
    if (wasRunningBeforeGraph) {
        startTime = Date.now();
        timerInterval = setInterval(updateDisplay, 10);
        startPauseBtn.textContent = 'Pause';
        startPauseBtn.classList.remove('primary');
        document.body.classList.add('running');
        isRunning = true;
        wasRunningBeforeGraph = false; // Reset flag
    }
    
    // Update visualization immediately after closing
    updateVisualization();
    
    playSound('click');
    
    // Re-add the event listener to the close button to ensure it works next time
    closeGraphBtn.addEventListener('click', closeGraphModal);
}

// Draw chart in canvas - now only updates when graph is closed and reopened
function drawLapChart() {
    // Skip drawing completely if the graph is already open
    // This ensures the graph is completely frozen while viewing
    if (isGraphOpen && graphModal.classList.contains('active')) {
        // Only allow initial draw when first opened, then freeze
        if (graphUpdateCount > 0) {
            return;
        }
    }
    
    // Update counter
    graphUpdateCount++;
    
    // Reset counter periodically to avoid integer overflow
    if (graphUpdateCount > 1000) {
        graphUpdateCount = 0;
    }
    
    // Use double buffering technique to reduce flickering
    const offscreenCanvas = document.createElement('canvas');
    
    // Use fixed dimensions instead of calculating from container
    // Get container dimensions for responsive sizing
    const container = lapCanvas.closest('.graph-modal-body');
    let width = 800;
    let height = 400;
    
    if (container) {
        width = Math.min(800, container.clientWidth - 40);
        height = Math.min(400, container.clientHeight - 40);
    }
    
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    
    // Only resize canvas if dimensions have changed
    if (lapCanvas.width !== width || lapCanvas.height !== height) {
        lapCanvas.width = width;
        lapCanvas.height = height;
    }
    
    // Draw to offscreen canvas first
    const ctx = offscreenCanvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: false // Optimization hint
    });
    
    const canvasWidth = lapCanvas.width;
    const canvasHeight = lapCanvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    if (laps.length === 0) {
        // Show no data message
        ctx.font = '20px Roboto';
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color');
        ctx.textAlign = 'center';
        ctx.fillText('No lap data available', canvasWidth / 2, canvasHeight / 2);
        return;
    }
    
    // Find fastest and slowest laps
    let fastestLap = laps.reduce((prev, current) => 
        (prev.time < current.time) ? prev : current, laps[0]);
    
    let slowestLap = laps.reduce((prev, current) => 
        (prev.time > current.time) ? prev : current, laps[0]);
    
    // Always use dark theme colors for better visibility and contrast regardless of theme
    const textColor = '#e1e1e1'; // Light text for dark background
    const primaryColor = '#5d7fff'; // Dark theme primary color
    const fastestColor = '#1db954'; // Dark theme fastest lap color
    const slowestColor = '#e55039'; // Dark theme slowest lap color
    const gridColor = '#333'; // Dark theme grid color
    const bgColor = '#121212'; // Dark theme background
    
    // Chart dimensions
    const padding = Math.max(40, canvasWidth * 0.05);
    const chartWidth = canvasWidth - (padding * 2);
    const chartHeight = canvasHeight - (padding * 2);
    
    // Adaptive spacing based on number of laps
    const maxBarWidth = 50;
    const minBarWidth = 15;
    const minGap = 4;
    
    // Calculate bar and gap width based on available space
    let barWidth, barGap;
    
    if (laps.length <= Math.floor(chartWidth / (maxBarWidth + minGap))) {
        // Few laps - use max bar width
        barWidth = maxBarWidth;
        barGap = Math.min(20, (chartWidth - (laps.length * barWidth)) / (laps.length + 1));
    } else {
        // Many laps - calculate proportionally
        barWidth = Math.max(minBarWidth, (chartWidth - (laps.length * minGap)) / laps.length);
        barGap = minGap;
    }
    
    // Calculate max value for y-axis
    const maxLapTime = slowestLap.time * 1.1; // Add 10% for margin
    
    // Fill background for better visibility
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw grid and axes
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    // Draw y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();
    
    // Draw x-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
    
    // Draw horizontal grid lines (5 lines)
    for (let i = 0; i <= 5; i++) {
        const y = padding + chartHeight - (i * chartHeight / 5);
        
        // Draw grid line
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.globalAlpha = 0.3;
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        // Add y-axis labels
        const value = (maxLapTime * i / 5);
        ctx.font = `${Math.max(10, Math.min(14, canvasWidth / 50))}px Roboto`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';
        ctx.fillText(formatTimeShort(value), padding - 10, y + 4);
    }
    
    // Draw vertical grid lines
    const verticalLineCount = Math.min(laps.length, 10);
    if (laps.length > 0) {
        for (let i = 0; i <= verticalLineCount; i++) {
            const lapIndex = Math.floor((i / verticalLineCount) * (laps.length - 1));
            const x = padding + (lapIndex * (barWidth + barGap)) + barWidth/2;
            
            // Draw grid line
            ctx.beginPath();
            ctx.strokeStyle = gridColor;
            ctx.globalAlpha = 0.2;
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + chartHeight);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }
    
    // Draw bars with smoother rendering
    laps.forEach((lap, i) => {
        const barHeight = (lap.time / maxLapTime) * chartHeight * 0.95;
        const x = padding + (i * (barWidth + barGap));
        const y = padding + (chartHeight - barHeight);
        
        // Choose bar color
        let barColor;
        if (lap.time === fastestLap.time) {
            barColor = fastestColor;
        } else if (lap.time === slowestLap.time) {
            barColor = slowestColor;
        } else {
            barColor = primaryColor;
        }
        
        // Draw bar shadow for depth
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 2, y + 2, barWidth, barHeight);
        
        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, adjustColor(barColor, 30)); // Lighter at top
        gradient.addColorStop(1, adjustColor(barColor, -10)); // Darker at bottom
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw border for the bar
        ctx.strokeStyle = adjustColor(barColor, -30);
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Add glow effect for fastest/slowest
        if (lap.time === fastestLap.time || lap.time === slowestLap.time) {
            ctx.save();
            ctx.shadowColor = lap.time === fastestLap.time ? fastestColor : slowestColor;
            ctx.shadowBlur = 10;
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.restore();
        }
        
        // Add bar value
        const fontSize = Math.max(9, Math.min(12, canvasWidth / 80));
        ctx.font = `${fontSize}px Roboto`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(formatTimeShort(lap.time), x + barWidth / 2, y - 5);
        
        // Draw lap numbers below bars (removed 'Lap' prefix, keeping only #X)
        if (i === 0 || i === laps.length - 1 || 
            i % Math.max(1, Math.floor(laps.length / 10)) === 0) {
            ctx.fillText(`#${lap.number}`, x + barWidth / 2, canvasHeight - padding / 2);
        }
    });
    
    // Draw chart title
    const titleFontSize = Math.max(16, Math.min(24, canvasWidth / 30));
    ctx.font = `bold ${titleFontSize}px Roboto`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText('Lap Time Comparison', canvasWidth / 2, padding / 2);
    
    // Copy from offscreen canvas to visible canvas (reduce flickering)
    const destCtx = lapCanvas.getContext('2d', { alpha: false });
    destCtx.drawImage(offscreenCanvas, 0, 0);
    
    // Helper function to adjust color brightness
    function adjustColor(color, percent) {
        // Convert hex to RGB first if needed
        if (color.startsWith('#')) {
            color = hexToRgb(color);
        }
        
        // Extract RGB values
        let r, g, b;
        if (color.startsWith('rgb')) {
            const rgbValues = color.match(/\d+/g);
            r = parseInt(rgbValues[0]);
            g = parseInt(rgbValues[1]);
            b = parseInt(rgbValues[2]);
        } else {
            r = 128;
            g = 128;
            b = 128;
        }
        
        // Adjust brightness
        r = Math.max(0, Math.min(255, r + percent));
        g = Math.max(0, Math.min(255, g + percent));
        b = Math.max(0, Math.min(255, b + percent));
        
        return `rgb(${r},${g},${b})`;
    }
    
    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
        
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `rgb(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)})` :
            null;
    }
}

// Export graph as image
function exportGraph() {
    // If no laps, show error
    if (laps.length === 0) {
        alert('No lap data to export');
        return;
    }
    
    // Create a notification
    const notification = document.createElement('div');
    notification.className = 'export-notification';
    notification.textContent = 'Preparing export...';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.padding = '10px 20px';
    notification.style.backgroundColor = 'var(--primary-color)';
    notification.style.color = '#fff';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '2000';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.style.opacity = '1', 10);
    
    // If modal is not open, use a hidden canvas for export
    if (graphModal.style.display !== 'flex') {
        // Create an offscreen canvas for export
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = 800;
        offscreenCanvas.height = 400;
        document.body.appendChild(offscreenCanvas);
        offscreenCanvas.style.position = 'absolute';
        offscreenCanvas.style.left = '-9999px';
        
        // Draw chart to offscreen canvas
        drawLapChartToCanvas(offscreenCanvas);
        
        // Create a downloadable image
        setTimeout(() => {
            const dataUrl = offscreenCanvas.toDataURL('image/png');
            triggerDownload(dataUrl);
            document.body.removeChild(offscreenCanvas);
            document.body.removeChild(notification);
        }, 300);
    } else {
        // Use the visible canvas
        setTimeout(() => {
            const dataUrl = lapCanvas.toDataURL('image/png');
            triggerDownload(dataUrl);
            document.body.removeChild(notification);
        }, 300);
    }
    
    function triggerDownload(dataUrl) {
        // Create a link and trigger download
        const downloadLink = document.createElement('a');
        downloadLink.href = dataUrl;
        downloadLink.download = `stopwatch-laps-${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        playSound('export');
    }
    
    // Draw chart to any canvas
    function drawLapChartToCanvas(canvas) {
        const ctx = canvas.getContext('2d', { alpha: false });
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // The rest of the chart drawing code (same as in drawLapChart)
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        if (laps.length === 0) {
            // Show no data message
            ctx.font = '20px Roboto';
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color');
            ctx.textAlign = 'center';
            ctx.fillText('No lap data available', canvasWidth / 2, canvasHeight / 2);
            return;
        }
        
        // Find fastest and slowest laps
        let fastestLap = laps.reduce((prev, current) => 
            (prev.time < current.time) ? prev : current, laps[0]);
        
        let slowestLap = laps.reduce((prev, current) => 
            (prev.time > current.time) ? prev : current, laps[0]);
        
        // Get colors from CSS variables
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
        const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary-color');
        const fastestColor = getComputedStyle(document.body).getPropertyValue('--fastest-lap');
        const slowestColor = getComputedStyle(document.body).getPropertyValue('--slowest-lap');
        const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color');
        const bgColor = getComputedStyle(document.body).getPropertyValue('--background-color');
        
        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Chart dimensions
        const padding = 40;
        const chartWidth = canvasWidth - (padding * 2);
        const chartHeight = canvasHeight - (padding * 2);
        const barPadding = 10;
        
        // Calculate max value for y-axis
        const maxLapTime = slowestLap.time * 1.1; // Add 10% for margin
        
        // Adaptive bar width
        const barWidth = Math.max(15, Math.min(50, (chartWidth - ((laps.length - 1) * barPadding)) / laps.length));
        
        // Draw grid and axes
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        
        // Draw horizontal grid lines (5 lines)
        for (let i = 0; i <= 5; i++) {
            const y = padding + chartHeight - (i * chartHeight / 5);
            
            // Draw grid line
            ctx.beginPath();
            ctx.strokeStyle = gridColor;
            ctx.globalAlpha = 0.3;
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            
            // Add y-axis labels
            const value = (maxLapTime * i / 5);
            ctx.font = '12px Roboto';
            ctx.fillStyle = textColor;
            ctx.textAlign = 'right';
            ctx.fillText(formatTimeShort(value), padding - 10, y + 4);
        }
        
        // Draw bars
        laps.forEach((lap, i) => {
            const barHeight = (lap.time / maxLapTime) * chartHeight * 0.95;
            const x = padding + (i * (barWidth + barPadding));
            const y = padding + (chartHeight - barHeight);
            
            // Choose bar color
            let barColor;
            if (lap.time === fastestLap.time) {
                barColor = fastestColor;
            } else if (lap.time === slowestLap.time) {
                barColor = slowestColor;
            } else {
                barColor = primaryColor;
            }
            
            // Draw bar
            ctx.fillStyle = barColor;
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // Add bar value
            ctx.font = '10px Roboto';
            ctx.fillStyle = textColor;
            ctx.textAlign = 'center';
            ctx.fillText(formatTimeShort(lap.time), x + barWidth / 2, y - 5);
            
            // Draw lap numbers below bars (removed 'Lap' prefix, keeping only #X)
            if (i === 0 || i === laps.length - 1 || 
                i % Math.max(1, Math.floor(laps.length / 10)) === 0) {
                ctx.fillText(`#${lap.number}`, x + barWidth / 2, canvasHeight - padding / 2);
            }
        });
        
        // Draw chart title
        ctx.font = 'bold 16px Roboto';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText('Lap Time Comparison', canvasWidth / 2, padding / 2);
    }
}    // Filter laps based on search
    function filterLaps() {
        renderLaps();
    }
    
    // Clear all laps
    function clearLaps() {
        if (laps.length === 0) return;
        
        showConfirmationModal('Clear All Laps', 'Are you sure you want to clear all lap records?', () => {
            laps = [];
            renderLaps();
            updateStats();
            updateVisualization();
            localStorage.removeItem('laps');
            playSound('clear');
        });
    }
    
    // Custom confirmation modal
    function showConfirmationModal(title, message, onConfirm) {
        // Set modal content
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Show modal with animation
        modal.style.display = 'flex';
        
        // Setup event listeners
        const confirmHandler = () => {
            modal.style.display = 'none';
            onConfirm();
            cleanupListeners();
        };
        
        const cancelHandler = () => {
            modal.style.display = 'none';
            cleanupListeners();
        };
        
        const outsideClickHandler = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                cleanupListeners();
            }
        };
        
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.style.display = 'none';
                cleanupListeners();
            }
        };
        
        // Function to remove all event listeners
        const cleanupListeners = () => {
            modalConfirm.removeEventListener('click', confirmHandler);
            modalCancel.removeEventListener('click', cancelHandler);
            modal.removeEventListener('click', outsideClickHandler);
            document.removeEventListener('keydown', escapeHandler);
        };
        
        // Add event listeners
        modalConfirm.addEventListener('click', confirmHandler);
        modalCancel.addEventListener('click', cancelHandler);
        modal.addEventListener('click', outsideClickHandler);
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Export laps to file
    function exportLaps() {
        if (laps.length === 0) {
            showConfirmationModal('No Laps', 'There are no lap records to export.', () => {});
            return;
        }
        
        showConfirmationModal('Export Laps', `Export ${laps.length} lap records as CSV?`, () => {
            // Create CSV content
            let csvContent = 'Lap Number,Lap Time,Total Time\n';
            laps.forEach(lap => {
                csvContent += `${lap.number},${lap.formattedTime},${lap.formattedTotalTime}\n`;
            });
            
            // Create file for download
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stopwatch_laps_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
            
            playSound('export');
        });
    }
    // Toggle theme
    
    // Toggle theme
    function toggleTheme() {
        document.body.classList.toggle('dark-theme');
        localStorage.setItem('darkTheme', document.body.classList.contains('dark-theme'));
        playSound('theme');
    }
    
    // Toggle sound
    function toggleSound() {
        soundEnabled = soundToggle.checked;
        localStorage.setItem('soundEnabled', soundEnabled);
    }
    
    // Toggle fullscreen
    function toggleFullscreen() {
        document.body.classList.toggle('fullscreen-mode');
        if (document.body.classList.contains('fullscreen-mode')) {
            fullscreenBtn.textContent = 'Exit Fullscreen';
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } else {
            fullscreenBtn.textContent = 'Fullscreen';
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    // Exit fullscreen
    function exitFullscreen() {
        document.body.classList.remove('fullscreen-mode');
        fullscreenBtn.textContent = 'Fullscreen';
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    
    // Play sound effects
    function playSound(type) {
        if (!soundEnabled) return;
        
        // Create simple beep sound using AudioContext
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        // Use sine wave for softer sound
        oscillator.type = 'sine';
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Set sound type
        switch(type) {
            case 'start':
                oscillator.frequency.value = 440; // Lower frequency for a softer sound
                gainNode.gain.value = 0.08;
                oscillator.start();
                // Add fade-out effect
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
                setTimeout(() => oscillator.stop(), 120);
                break;
            case 'lap':
                oscillator.frequency.value = 330; // Lower frequency for a softer sound
                gainNode.gain.value = 0.08;
                oscillator.start();
                // Add fade-out effect
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
                setTimeout(() => oscillator.stop(), 60);
                break;
            case 'reset':
                oscillator.frequency.value = 220; // Lower frequency for a softer sound
                gainNode.gain.value = 0.08;
                oscillator.start();
                // Add fade-out effect
                gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
                setTimeout(() => oscillator.stop(), 150);
                break;
            case 'export':
            case 'clear':
                oscillator.frequency.value = 180; // Lower frequency for a deeper "boop"
                gainNode.gain.value = 0.07;
                oscillator.start();
                // Add fade-out effect
                gainNode.gain.setValueAtTime(0.07, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.10);
                setTimeout(() => oscillator.stop(), 100);
                break;
            case 'click':
                oscillator.frequency.value = 260; // Light click sound
                gainNode.gain.value = 0.05;
                oscillator.start();
                // Add quick fade-out for click sound
                gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
                setTimeout(() => oscillator.stop(), 50);
                break;
            case 'theme':
                oscillator.frequency.value = document.body.classList.contains('dark-theme') ? 200 : 300; // Gentler tones
                gainNode.gain.value = 0.07;
                oscillator.start();
                // Add fade-out effect
                gainNode.gain.setValueAtTime(0.07, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);
                setTimeout(() => oscillator.stop(), 140);
                break;
        }
    }
    
    // Save laps to local storage
    function saveLaps() {
        localStorage.setItem('laps', JSON.stringify(laps));
    }
    
    // Utility function to debounce frequent events
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Utility function to throttle frequent events
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function() {
            const context = this;
            const args = arguments;
            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
    
    // Initialize the app
    init();
});