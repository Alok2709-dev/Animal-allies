Animal Allies

## Donations and payments

## Rescue alerts and AI guide

The rescue-report form now calls the local server at `/api/rescue-reports`. It sends:

- an urgent email to `RESCUE_ALERT_TO`;
- an acknowledgement email to the reporter; and
- an optional SMS to `RESCUE_ALERT_SMS_TO` through Twilio.

Copy `.env.example` to `.env`, then supply working SMTP details and/or Twilio
credentials. Without a configured mail or SMS provider, the site shows an honest
error and points the reporter to call or WhatsApp instead of claiming an alert was sent.

The floating **Ask Ally** guide calls `/api/ask-ally` using the server-only
`OPENAI_API_KEY`. Its default model is `gpt-5.6-luna`, with no reasoning,
240 output-token maximum, 150-word responses, no tools, no server-side response
storage, and a configurable hourly cap of 20 questions per connection.

The redesigned [donation page](donate.html) works immediately with the configured UPI ID
`7398259999@okbizaxis`: it generates a fresh QR code for the selected amount and opens
the donor's UPI app on supported phones.

For a complete secure gateway (UPI, cards, wallets and netbanking), it also includes a
Razorpay order and signature-verification backend. To enable it:

1. Run `npm install`.
2. Copy `.env.example` to `.env` and add the Razorpay Key ID and Key Secret issued
   for your account.
3. Put the same **Key ID** (never the secret) in `payment-config.js`.
4. Start the site with `npm start` and open `http://localhost:3000/donate.html`.

Keep `.env` private. Do not publish the Razorpay secret in HTML, JavaScript, or Git.

Project Overview

Animal Allies is a web platform dedicated to promoting animal welfare and rescue efforts. The website allows users to report injured animals, donate to support animal care, and access resources on how to get involved in helping animals. The goal is to create a compassionate community where users can take meaningful action to protect and assist animals in need.

Features

Report Injured Animals: Users can submit reports of injured animals, helping local organizations respond quickly.

Donation System: A secure donation feature where users can enter an amount and generate a QR code for easy payment processing.

User-Friendly Interface: A responsive, modern design that works well on both desktop and mobile devices.


Technologies Used

Frontend: HTML, CSS, JavaScript

Other Tools: Any additional tools or libraries used (e.g., Bootstrap, jQuery)


How to Run

1. Clone the repository: git clone [[https://github.com/Alok2709-dev/animal-allies-project-2.git
](https://github.com/Alok2709-dev/Animal-allies-2/tree/main/animal-allies-project-
](https://github.com/Alok2709-dev/Animal-allies-2/tree/main/animal-allies-project-2)
3. Open index.html in a browser to view the homepage.


4. (Optional) Set up the backend if applicable.



Future Enhancements

Implement user login for tracking reports.

Add an interactive map to show reported cases in real-time.

Expand donation options (e.g., PayPal, credit card).


Contributing

Feel free to fork this project and submit pull requests with any improvements or bug fixes. Suggestions are always welcome!
