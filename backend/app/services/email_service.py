import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

def _get_credentials():
    return {
        "user": os.getenv("EMAIL_USER", ""),
        "pass": os.getenv("EMAIL_PASS", "")
    }

def send_verification_email(to_email: str, code: str):
    subject = "Verify Your DrugInteraction Vault Account"
    body = f"Hello,\n\nYour verification code is: {code}\n\nThank you for registering."

    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    _send_email(to_email, msg)

def send_pdf_report(to_email: str, pdf_bytes: bytes, filename: str = "Interaction_Report.pdf"):
    subject = "Your Drug Interaction Report"
    body = "Please find attached your requested drug interaction report."

    msg = MIMEMultipart()
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))

    part = MIMEApplication(pdf_bytes, Name=filename)
    part['Content-Disposition'] = f'attachment; filename="{filename}"'
    msg.attach(part)

    _send_email(to_email, msg)

def _send_email(to_email: str, msg: MIMEMultipart):
    creds = _get_credentials()
    sender_user = creds["user"]
    sender_pass = creds["pass"]

    msg['From'] = sender_user
    msg['To'] = to_email

    # Check for placeholder or empty credentials
    if not sender_user or not sender_pass or "your-email" in sender_user or "your-app-password" in sender_pass:
        logger.warning("\n" + "!"*60)
        logger.warning(" EMAIL NOT CONFIGURED: OTP WILL NOT BE SENT VIA EMAIL ")
        logger.warning(f" Target Email: {to_email}")
        logger.warning(" Check your .env file and ensure EMAIL_USER/EMAIL_PASS are set.")
        logger.warning("!"*60 + "\n")
        return

    # Try Port 587 (TLS) first, then fallback to 465 (SSL)
    ports = [587, 465]
    success = False
    
    for port in ports:
        try:
            print(f"\n[EMAIL SYSTEM] Attempting delivery to {to_email} via Port {port}...")
            logger.info(f"Attempting to send email to {to_email} via port {port}...")
            
            if port == 465:
                server = smtplib.SMTP_SSL(SMTP_SERVER, port, timeout=10)
            else:
                server = smtplib.SMTP(SMTP_SERVER, port, timeout=10)
                server.starttls()
            
            print(f"[EMAIL SYSTEM] SMTP Connection established. Logging in as {sender_user}...")
            server.login(sender_user, sender_pass)
            
            print(f"[EMAIL SYSTEM] Login successful. Sending message...")
            server.send_message(msg)
            server.quit()
            
            print(f"[EMAIL SYSTEM] SUCCESS: EMAIL SENT to {to_email}\n")
            logger.info(f"Email successfully sent to {to_email} via port {port}")
            success = True
            break
        except Exception as e:
            print(f"[EMAIL SYSTEM] ERROR: Port {port} failed: {e}")
            logger.error(f"Port {port} failed for {to_email}: {e}")
            continue

    if not success:
        print(f"[EMAIL SYSTEM] FAILED: ALL PORTS FAILED for {to_email}")
        logger.error(f"CRITICAL: All email delivery attempts failed for {to_email}")
        raise Exception("Clinical Email Delivery System failed to reach Gmail. Check network/credentials.")
