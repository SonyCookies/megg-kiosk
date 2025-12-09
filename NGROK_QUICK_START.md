# Quick Start: ngrok SMS Server Setup

This is a simplified guide for setting up SMS server with ngrok.

## Setup Flow

```
Kiosk App → HTTP POST → ngrok URL → Your Phone Server → SMS Sent
```

## Step-by-Step

### 1. Install Dependencies in Termux

```bash
pkg update && pkg upgrade
pkg install python python-pip
pip install flask
```

### 2. Create SMS Server

Create `~/sms_server.py`:

```python
#!/usr/bin/env python3
from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

def send_sms_via_termux(phone_number, message):
    try:
        result = subprocess.run(
            ['termux-sms-send', '-n', phone_number, message],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0, result.stderr if result.returncode != 0 else "OK"
    except Exception as e:
        return False, str(e)

@app.route('/send-sms', methods=['POST'])
def send_sms():
    try:
        data = request.get_json()
        
        phone = data.get('phone')
        message = data.get('message')
        
        if not phone or not message:
            return jsonify({'success': False, 'error': 'Missing phone or message'}), 400
        
        success, error_msg = send_sms_via_termux(phone, message)
        
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': error_msg}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)
```

Make it executable:
```bash
chmod +x ~/sms_server.py
```

### 3. Grant SMS Permission

```bash
termux-setup-storage
# Grant SMS permission when prompted
```

### 4. Install and Configure ngrok

```bash
# Install ngrok (download from https://ngrok.com/download if pkg doesn't work)
pkg install ngrok

# Sign up at https://ngrok.com and get your authtoken
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### 5. Start Server and ngrok

**Terminal 1 - Start SMS Server:**
```bash
python ~/sms_server.py
```

**Terminal 2 - Start ngrok:**
```bash
ngrok http 8080
```

You'll see output like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:8080
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

### 6. Configure in Kiosk App Code

SMS is automatically enabled. You just need to update the ngrok URL in the code:

1. Open `app/services/smsService.ts`
2. Find the `SMS_CONFIG` object (around line 13-14)
3. Update `phoneServerUrl` with your ngrok URL:

```typescript
const SMS_CONFIG = {
  phoneServerUrl: 'https://abc123.ngrok-free.app' // Your ngrok URL
}
```

**Note:** The recipient phone number is automatically fetched from the users collection in Firebase using the accountId. Make sure the user's phone number is set in their profile in the users collection.

SMS will automatically send on every calibration event after you update the ngrok URL.

## API Request Format

The kiosk app sends POST requests to your ngrok URL:

```json
POST https://your-ngrok-url.ngrok-free.app/send-sms
Content-Type: application/json

{
  "phone": "+1234567890",
  "message": "✅ UNO calibration completed successfully. Timestamp: 12/25/2024, 10:30:00 AM"
}
```

## Running in Background

### Option 1: Using screen

```bash
# Install screen
pkg install screen

# Start server
screen -S sms_server
python ~/sms_server.py
# Press Ctrl+A then D to detach

# Start ngrok
screen -S ngrok
ngrok http 8080
# Press Ctrl+A then D to detach

# To reattach later:
screen -r sms_server
screen -r ngrok
```

### Option 2: Using nohup

```bash
# Start server
nohup python ~/sms_server.py > ~/sms_server.log 2>&1 &

# Start ngrok
nohup ngrok http 8080 > ~/ngrok.log 2>&1 &
```

## Testing

### Test from command line:

```bash
curl -X POST https://your-ngrok-url.ngrok-free.app/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "message": "Test message"
  }'
```

### Test from Kiosk App:
- After configuring the SMS settings in code, perform a calibration to test SMS sending

## Troubleshooting

**ngrok URL not working:**
- Check if ngrok is still running
- Free tier URLs change on restart
- Check ngrok logs: `cat ~/ngrok.log`

**SMS not sending:**
- Verify SMS permission: `termux-sms-send -n +1234567890 "Test"`
- Check server logs: `cat ~/sms_server.log`
- Verify phone server URL is correct in kiosk app

**Connection timeout:**
- Ensure both server and ngrok are running
- Check phone's internet connection
- Verify ngrok URL is correct in kiosk app

## Security Tips

1. **Use HTTPS** - ngrok provides this automatically
2. **Keep ngrok URL private** - Don't share it publicly
3. **Monitor logs** - Check for suspicious activity

## Notes

- ngrok free tier URLs expire after 2 hours of inactivity
- For 24/7 operation, consider ngrok paid plan or static domain
- Phone must have internet connection for ngrok to work
- SMS delivery depends on phone's cellular connection

