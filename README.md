# Kiosk Next.js Frontend

This is a [Next.js](https://nextjs.org) project with Electron integration, designed to run as a kiosk application in a Raspberry Pi-like environment using Docker.

## Features

- Next.js 15 with React 19
- Electron integration for desktop/kiosk mode
- Docker support for Raspberry Pi-like environments
- Camera integration support
- Firebase integration
- QR code generation
- Responsive design with Tailwind CSS

## Getting Started

### Local Development

First, install dependencies and run the development server:

```bash
npm install
npm run dev
```

For Electron development:
```bash
npm run start-electron
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Docker Deployment (Raspberry Pi-like Environment)

This project includes Docker configuration optimized for Raspberry Pi-like environments with headless display support.

#### Prerequisites

- Docker and Docker Compose installed
- For camera access: ensure your host system has camera devices available

#### Quick Start with Docker Compose

```bash
# Build and run the application
npm run docker:compose

# Or run in detached mode
npm run docker:compose:detached

# Stop the application
npm run docker:stop
```

#### Manual Docker Commands

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run
```

#### Docker Configuration Details

The Docker setup includes:

- **Multi-stage build** for optimized image size
- **Alpine Linux base** for Raspberry Pi compatibility
- **Headless display support** using Xvfb
- **Chromium browser** for Electron rendering
- **Camera device mounting** for hardware access
- **Privileged mode** for hardware access

#### Environment Variables

- `NODE_ENV=production` - Sets production mode
- `DISPLAY=:99` - Virtual display for headless operation
- `ELECTRON_DISABLE_SECURITY_WARNINGS=true` - Disables Electron security warnings

#### Volume Mounts

- `./data:/app/data` - Persistent data storage
- `./logs:/app/logs` - Application logs
- `/dev/video0:/dev/video0` - Camera device access

## Project Structure

```
kiosk-next-frontend/
├── app/                    # Next.js app directory
├── electron/              # Electron main process
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
├── docker-entrypoint.sh   # Container startup script
└── .dockerignore          # Docker ignore file
```

## Hardware Requirements

### For Raspberry Pi Deployment

- Raspberry Pi 4 (recommended) or Pi 3B+
- 4GB+ RAM
- 16GB+ SD card
- Camera module (optional)
- Display (HDMI or touchscreen)

### For Docker on Other Systems

- Any system with Docker support
- Camera device (if camera functionality needed)
- Display (for testing, not required for headless operation)

## Troubleshooting

### Camera Issues

If camera access doesn't work:

1. Ensure camera device is properly mounted:
   ```bash
   docker run --device=/dev/video0:/dev/video0 kiosk-next-frontend
   ```

2. Check camera permissions on host system

### Display Issues

If the application doesn't display properly:

1. Ensure Xvfb is running in the container
2. Check DISPLAY environment variable
3. Verify Chromium installation

### Performance Issues

For better performance on Raspberry Pi:

1. Use SSD instead of SD card
2. Increase swap space
3. Use hardware acceleration if available

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Raspberry Pi Documentation](https://www.raspberrypi.org/documentation/)
