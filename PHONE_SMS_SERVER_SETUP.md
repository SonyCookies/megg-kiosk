# Phone SMS Server Setup Guide

This guide explains how to set up an HTTP server on your phone to send SMS notifications for calibration events.

## Overview

The kiosk application sends HTTP POST requests to your phone server, which then uses your phone's SMS capabilities to send text messages. This allows you to receive real-time notifications about calibration events without using third-party SMS services.

## Option 1: Android Phone with Termux (Recommended)

### Prerequisites
- Android phone (Android 5.0+)
- Termux app installed from [F-Droid](https://f-droid.org/en/packages/com.termux/) or [Google Play](https://play.google.com/store/apps/details?id=com.termux)
- Python 3 installed in Termux

### Setup Steps

1. **Install Termux and Python**
   ```bash
   # In Termux terminal
   pkg update && pkg upgrade
   pkg install python python-pip
   pip install flask
   ```

2. **Grant SMS Permission**
   - Open Termux
   - Run: `termux-setup-storage`
   - Grant SMS permission when prompted

3. **Create SMS Server Script**
   
   Create a file `sms_server.py` in Termux:
   ```bash
   cd ~
   nano sms_server.py
   ```
   
    Paste the following code:
    ```python
    #!/usr/bin/env python3
    from flask import Flask, request, jsonify
    import subprocess
    import sys
    
    app = Flask(__name__)
    
    def send_sms_via_termux(phone_number, message):
        """Send SMS using Termux SMS API"""
        try:
            # Use termux-sms-send command
            result = subprocess.run(
                ['termux-sms-send', '-n', phone_number, message],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return True, "SMS sent successfully"
            else:
                return False, f"Error: {result.stderr}"
        except subprocess.TimeoutExpired:
            return False, "SMS send timeout"
        except Exception as e:
            return False, f"Exception: {str(e)}"
    
    @app.route('/send-sms', methods=['POST'])
    def send_sms():
        try:
            data = request.get_json()
            
            phone = data.get('phone')
            message = data.get('message')
            
            if not phone or not message:
                return jsonify({
                    'success': False,
                    'error': 'Missing phone or message'
                }), 400
            
            # Send SMS
            success, result_msg = send_sms_via_termux(phone, message)
            
            if success:
                return jsonify({
                    'success': True,
                    'message': result_msg
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result_msg
                }), 500
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Server error: {str(e)}'
            }), 500
    
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'service': 'SMS Server'})
    
    if __name__ == '__main__':
        # Run on all interfaces (0.0.0.0) so it's accessible from network
        # Use port 8080 (change if needed)
        app.run(host='0.0.0.0', port=8080, debug=False)
    ```

4. **Make Script Executable**
   ```bash
   chmod +x sms_server.py
   ```
   
5. **Start the Server**
   ```bash
   python sms_server.py
   ```

6. **Find Your Phone's IP Address**
   ```bash
   # In Termux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # Or use: ip addr show
   ```
   
   Note the IP address (e.g., `192.168.1.100`)

7. **Configure in Kiosk App Code**
   - Open `app/services/smsService.ts`
   - Find the `SMS_CONFIG` object
   - Update `phoneServerUrl` to: `http://192.168.1.100:8080` (or your ngrok URL)
   - **Note:** The recipient phone number is automatically fetched from the users collection in Firebase using the accountId. Make sure the user's phone number is set in their profile.
   - SMS is automatically enabled and will send on every calibration event

### Running Server in Background

To keep the server running when Termux is closed:

1. **Install Termux:API**
   ```bash
   pkg install termux-api
   ```

2. **Use nohup or screen**
   ```bash
   # Option 1: nohup
   nohup python sms_server.py > sms_server.log 2>&1 &
   
   # Option 2: screen (install first: pkg install screen)
   screen -S sms_server
   python sms_server.py
   # Press Ctrl+A then D to detach
   ```

3. **Auto-start on Boot (Optional)**
   
   Create `~/.termux/boot/sms_server.sh`:
   ```bash
   #!/data/data/com.termux/files/usr/bin/bash
   cd ~
   nohup python sms_server.py > sms_server.log 2>&1 &
   ```
   
   Make it executable:
   ```bash
   chmod +x ~/.termux/boot/sms_server.sh
   ```

## Option 2: Expose via ngrok (Recommended for Remote Access)

**This is the recommended setup if your kiosk and phone are on different networks.**

### Setup Steps

1. **Install ngrok in Termux**
   ```bash
   # Option 1: Install via pkg (if available)
   pkg install ngrok
   
   # Option 2: Download from ngrok.com
   # Visit https://ngrok.com/download and download for Android/ARM
   # Extract and place in ~/bin or add to PATH
   ```

2. **Sign up for ngrok account** (Free tier available)
   - Go to https://ngrok.com/
   - Sign up and get your authtoken
   - Configure in Termux:
     ```bash
     ngrok config add-authtoken YOUR_AUTH_TOKEN
     ```

3. **Start SMS Server** (from Option 1, step 5)
   ```bash
   python sms_server.py
   ```
   Keep this terminal open.

4. **Expose with ngrok** (in a new Termux session or screen)
   ```bash
   ngrok http 8080
   ```
   
   You'll see output like:
   ```
   Forwarding   https://abc123.ngrok-free.app -> http://localhost:8080
   ```
   
   **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

5. **Configure in Kiosk App Code**
   - Open `app/services/smsService.ts`
   - Find the `SMS_CONFIG` object
   - Update `phoneServerUrl` to your ngrok URL: `https://abc123.ngrok-free.app`
   - **Note:** The recipient phone number is automatically fetched from the users collection in Firebase using the accountId. Make sure the user's phone number is set in their profile.
   - Note: Free ngrok URLs change on restart. Consider paid plan for static URL.
   - SMS is automatically enabled and will send on every calibration event

### Running Both Server and ngrok in Background

To keep both running:

1. **Use screen or tmux**
   ```bash
   # Install screen
   pkg install screen
   
   # Start screen session
   screen -S sms_server
   python sms_server.py
   # Press Ctrl+A then D to detach
   
   # Start another screen for ngrok
   screen -S ngrok
   ngrok http 8080
   # Press Ctrl+A then D to detach
   ```

2. **Or use nohup**
   ```bash
   # Start server
   nohup python sms_server.py > sms_server.log 2>&1 &
   
   # Start ngrok
   nohup ngrok http 8080 > ngrok.log 2>&1 &
   ```

### Important Notes for ngrok

- **Free tier**: URLs change on restart. For production, consider paid plan with static domain
- **ngrok warning page**: Free tier shows a warning page on first visit. You can disable this with:
  ```bash
  ngrok http 8080 --host-header="localhost:8080"
  ```
- **Keep ngrok running**: If ngrok stops, the URL becomes invalid. Consider using ngrok's paid plan for stability

## Option 3: Node.js Server (Alternative)

If you prefer Node.js:

1. **Install Node.js in Termux**
   ```bash
   pkg install nodejs
   ```

2. **Create `sms_server.js`**
   ```javascript
    const express = require('express');
    const { exec } = require('child_process');
    const app = express();
    
    app.use(express.json());
    
    app.post('/send-sms', (req, res) => {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
       return res.status(400).json({ success: false, error: 'Missing phone or message' });
     }
     
     exec(`termux-sms-send -n ${phone} "${message}"`, (error, stdout, stderr) => {
       if (error) {
         return res.status(500).json({ success: false, error: stderr });
       }
       res.json({ success: true });
     });
   });
   
   app.get('/health', (req, res) => {
     res.json({ status: 'ok', service: 'SMS Server' });
   });
   
   app.listen(8080, '0.0.0.0', () => {
     console.log('SMS Server running on port 8080');
   });
   ```

3. **Install dependencies and run**
   ```bash
   npm init -y
   npm install express
   node sms_server.js
   ```

## Troubleshooting

### Server Not Accessible
- **Check firewall**: Ensure phone firewall allows connections on port 8080
- **Check network**: Phone and kiosk must be on same network (or use ngrok)
- **Check IP**: Phone IP may change if using DHCP - consider static IP

### SMS Not Sending
- **Check permissions**: Ensure Termux has SMS permission
- **Check phone number format**: Use international format (e.g., +1234567890)
- **Test manually**: Try `termux-sms-send -n +1234567890 "Test"` in Termux

### Server Crashes
- **Check logs**: Look at `sms_server.log` or terminal output
- **Check Python/Node**: Ensure correct version installed
- **Check port**: Ensure port 8080 is not in use

## Security Considerations

1. **Network**: Only expose on local network unless using ngrok
2. **HTTPS**: For production, use ngrok or set up proper SSL certificate

## Testing

1. **Test Server Health**
   ```bash
   curl http://YOUR_PHONE_IP:8080/health
   ```

2. **Test SMS Endpoint**
   ```bash
   curl -X POST http://YOUR_PHONE_IP:8080/send-sms \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890", "message": "Test message"}'
   ```

3. **Test via Calibration**: Perform a calibration in the Calibration Tab to trigger SMS sending

## Notes

- Phone must be powered on and connected to network
- Server must be running for SMS to work
- SMS delivery depends on phone's cellular connection
- Consider battery usage if running 24/7

