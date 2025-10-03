# Modern Stopwatch Application

A feature-rich, responsive stopwatch web application with a clean and modern UI designed for precision timing and performance analysis.

## Features

- **Precise Timing**: HH:MM:SS.ms format with millisecond precision
- **Lap Recording**: Track and save lap times with automatic highlighting of fastest/slowest laps
- **Lap Comparison**: Shows time difference between consecutive laps
- **Statistics**: Displays average lap time, fastest lap, and total elapsed time
- **Data Visualization**: Interactive bar chart showing lap time comparisons
- **Graph View**: Expandable full-screen graph modal with detailed lap analysis
- **Export Functionality**: Export lap data to CSV file and charts as images
- **Theme Options**: Toggle between light and dark themes
- **Sound Effects**: Optional sound feedback for interactions
- **Fullscreen Mode**: Distraction-free viewing with large timer display
- **Keyboard Shortcuts**:
  - Space: Start/Pause
  - L: Record Lap
  - R: Reset Timer
  - G: Show Graph
  - E: Export Data
  - Esc: Close Modal/Exit Fullscreen
- **Mobile Responsive**: Adapts to different screen sizes
- **Search/Filter**: Search through recorded laps
- **Persistent Storage**: Saves laps and preferences using localStorage

## Layout Structure

The application is organized into four main sections:

1. **Left Panel**: Controls and features
   - Start/Pause/Reset buttons
   - Lap recording
   - Export functionality
   - Theme and sound toggles
   - Fullscreen mode

2. **Center Panel**: Main stopwatch display
   - Large, clear digital timer with HH:MM:SS.ms format
   - Monospace font for better readability
   - Lap time visualization with interactive bar charts
   - Expandable graph for detailed analysis

3. **Right Panel**: Lap history
   - Scrollable list of recorded laps
   - Color highlighting for fastest/slowest laps
   - Time difference between consecutive laps
   - Search functionality

4. **Footer**: Statistics section
   - Average lap time
   - Fastest lap time with lap number
   - Total elapsed time
   - Clear all laps button

5. **Graph Modal**: Detailed visualization (triggered by "Expand" button)
   - Fullscreen interactive chart
   - Optimized rendering for smooth performance
   - Color-coded bars for fastest/slowest laps
   - Time indicators and lap numbers

## Design Elements

- **Modern UI**: Flat design with clean typography
- **Responsive Layout**: Adapts to different screen sizes
- **Customizable**: Light/dark theme options
- **Animations**: Subtle transitions for a polished experience
- **Performance Optimized**: Techniques to prevent flickering and ensure smooth rendering
- **Canvas Visualization**: Hardware-accelerated graphical data representation

## How to Use

1. Open the `index.html` file in any modern web browser
2. Use the buttons to control the stopwatch or keyboard shortcuts:
   - Space: Start/Pause
   - L: Record Lap
   - R: Reset
   - G: Show Graph Modal
   - E: Export Data
3. View and analyze your lap times in the right panel
4. Click "Expand" to see detailed graph visualization in fullscreen mode
5. Use the export buttons to save:
   - Lap data as a CSV file
   - Graph visualization as an image

## Technologies Used

- HTML5
- CSS3 with hardware acceleration and optimized animations
- JavaScript (ES6+)
- Canvas API for data visualization
- Web Audio API for sound effects
- Local Storage API for data persistence
- Responsive design techniques

## Performance Features

- **Anti-Flickering Technology**: Multiple techniques prevent visual flickering during updates:
  - Frozen graph state during modal display
  - Fixed dimensions to prevent layout shifts
  - Double buffering for smooth canvas rendering
  - Strategic animation throttling
  - Hardware-accelerated CSS transitions

- **Optimized Rendering**: Graph updates only when necessary to preserve performance
- **Efficient Data Processing**: Optimized algorithms for lag-free experience even with many laps

No external libraries or frameworks are required - the application is built with vanilla JavaScript for maximum performance and minimal dependencies.

## Project Structure

- `index.html`: Main HTML structure
- `styles.css`: CSS styling with light/dark theme support
- `script.js`: JavaScript functionality with timing and visualization logic