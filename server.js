const express = require("express");
const multer = require("multer");
const { SignatureRequestApi } = require('@dropbox/sign');
const fs = require('fs');

// Load your environment variables from your .env
// file
require("dotenv").config();

const app = express();
// Use the JSON parser to parse incoming JSON data
app.use(express.json());
// Use multer to parse incoming multipart form data
// requests (used for Dropbox Sign Events)
app.use(multer().none());

// Create a new instance of the SignatureRequestApi
const dropbox = new SignatureRequestApi();
// Specify your API key as the username on the API
dropbox.username = process.env.DROPBOX_SIGN_API_KEY;


app.get("/", (req, res) => {
  res.send({
    message: "Welcome to Gym Management System API",
  });
});

app.post("/webhook", async (req, res) => {

    const data = JSON.parse(req.body["json"]);
    const eventType = data["event"]["event_type"];

    console.log(`Received ${eventType} event.`);

     // Handle the different events
    if (eventType === 'signature_request_all_signed') {
        // Get the request ID for the signing request
        const requestId = data['signature_request']['signature_request_id'];

        // Download the signing request as a single PDF file
        // to the 'signed_docs' folder
        const fileRes = await dropbox.signatureRequestFiles(requestId, 'pdf');
        fs.createWriteStream(`./signed_docs/${requestId}.pdf`).write(fileRes.body);
    }


    res.status(200).send("Hello API event received");

});

app.post('/member', async (req, res) => {

    await dropbox.signatureRequestSendWithTemplate({
        // Specify the ID of the template in Dropbox Sign
        templateIds: [process.env.DROPBOX_SIGN_TEMPLATE_ID],
           // Subject and message that are used for the email
        subject: 'The Gym - Release of Liability',
        message:
        "We're so excited you decided to join The Gym. " +
        'Please make sure to sign this Release of Liability before your ' +
        'first visit. Looking forward to seeing you!',
        // Specify the signer details using details from the
        // request.
        signers: [
            {
                // Remember signer role is case-sensitive so enter it
                // exactly as you entered it when creating the template.
                role: 'Gym Member',
                name: req.body.name,
                emailAddress: req.body.email,
            },
        ],
         // Configure the signing experience
        signingOptions: {
            draw: true,
            type: true,
            upload: true,
            phone: false,
            defaultType: 'draw',
        },
        // Specify that you're using test mode so you can develop
        // the app for free. Remove or set to false in production
        test_mode: true,

  
    });

    res.status(200).send('Member created.');
});


const port = process.env.PORT ?? 3000;
app.listen(port, () =>
  console.log(`Example app is listening on port ${port}.`)
);
