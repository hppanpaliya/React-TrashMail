#!/usr/bin/env bash

set -euo pipefail

########################################
# LOCAL SMTP SETTINGS
########################################
SMTP_SERVER="localhost"
SMTP_PORT=2525

########################################
# RECIPIENTS & SENDER
########################################
FROM="sender@test.com"
TO="test@harsh.al,test@react-mail.com,admin@harsh.al,admin@react-mail.com"
SUBJECT="Complex Local Test Email"

########################################
# CREATE TEMP WORKDIR
########################################
WORKDIR=$(mktemp -d)

########################################
# MOCK FILES (attachments)
########################################
TXT_FILE="$WORKDIR/sample.txt"
HTML_FILE="$WORKDIR/sample.html"
BODY_HTML="$WORKDIR/body.html"

echo "This is a mock text file attachment." > "$TXT_FILE"

cat > "$HTML_FILE" << 'EOF'
<html>
  <body>
    <h2>Attachment HTML File</h2>
    <p>This simulates an HTML file you'd attach.</p>
  </body>
</html>
EOF

########################################
# EMAIL BODY HTML
########################################
cat > "$BODY_HTML" << 'EOF'
<html>
  <head><style>
    body { font-family: Arial, sans-serif; }
    h1 { color: #336699; }
  </style></head>
  <body>
    <h1>Hello from Localhost SMTP!</h1>
    <p>This is a <strong>rich HTML email</strong> with attachments.</p>
    <p>It includes:</p>
    <ul>
      <li>Styled HTML content</li>
      <li>Text attachment</li>
      <li>HTML attachment</li>
    </ul>
  </body>
</html>
EOF

########################################
# SEND VIA SWAKS
########################################
echo "Sending email to: $TO"

swaks \
  --to "$TO" \
  --from "$FROM" \
  --server "$SMTP_SERVER" \
  --port "$SMTP_PORT" \
  --header "Subject: $SUBJECT" \
  --header "MIME-Version: 1.0" \
  --attach-body "$BODY_HTML;type=text/html" \
  --attach "@$TXT_FILE" \
  --attach "@$HTML_FILE"

echo "Email sent!"

########################################
# CLEANUP
########################################
rm -rf "$WORKDIR"
echo "Cleaned up temp files."