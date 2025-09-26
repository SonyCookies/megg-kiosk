#!/bin/sh

# Start Xvfb for headless display
Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset &

# Wait for Xvfb to start
sleep 2

# Start the Next.js application
npm start &

# Wait for Next.js to start
sleep 5

# Try to start Electron in kiosk mode, but don't fail if it doesn't work
npm run electron 2>/dev/null || echo "Electron not available, running in web-only mode"

# Keep the container running
wait

