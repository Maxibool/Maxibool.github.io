open cmd or PowerShell here:
for server:
C:\Users\maxim\Downloads\php-8.4.14-Win32-vs17-x64\php.exe -S localhost:80

for mails:
C:\Users\maxim\Documents\Project\mailpit.exe

## 📁 Final Project Structure

```
sophrologie/
│
├── index.php                # Main HTML page (updated)
├── config.php              # Central configuration
├── config.json.php         # Config API endpoint for JS
├── contact.php             # Contact form handler
│
├── css/
│   └── styles.css          # Main stylesheet
│
├── js/
│   ├── main.js            # General site functionality
│   ├── form-handler.js    # Form validation & submission (loads config)
│   └── video-handler.js   # Video carousel with auto-play
│
├── assets/                 # Media files
│   ├── 1.jpeg
│   ├── 2.jpeg
│   ├── 3.jpeg
│   ├── video1.mp4
│   ├── video2.mp4
│   ├── video3.mp4
│   └── video4.mp4
│
├── data/                   # Generated data
│   └── contacts.json      # Stored submissions
│
└── PHPMailer/             # Email library (if using SMTP)
    ├── Exception.php
    ├── PHPMailer.php
    └── SMTP.php
```