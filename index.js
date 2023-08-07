require("dotenv").config();
const express = require("express");
const axios = require("axios");
const bodyParser = require('body-parser');
const port = process.env.PORT || 3001;
const xml2js = require("xml2js");
const app = express();
const builder = new xml2js.Builder();
const cors = require("cors");

app.use(bodyParser.json());

app.use(cors());

app.use(express.json());

// authentication
app.post("/authenticate", async (req, res) => {
  const { client_id, client_secret, account_id } = req.body;

  try {
    const response = await axios.post(
      `${process.env.AUTH_BASE_URI}v2/token`,
      {
        grant_type: "client_credentials", // common in OAuth 2.0
        client_id,
        client_secret,
        account_id,
      },
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, // commonly used Content-Type for OAuth
      }
    );

    // Extract the bearer token
    const bearerToken = response.data.access_token;

    // Store or use the token as needed
    // ...

    // Send success response
    // res.status(200).json({ token: bearerToken });
    res
      .status(200)
      .json({ token: bearerToken, message: "Authenticated successfully" });
  } catch (error) {
    console.error(error);
    if (error.response) {
      // The request was made, and the server responded with a status code
      // that falls out of the range of 2xx
      // console.error(error.response.data);
      // console.error(error.response.status);
      // console.error(error.response.headers);
    } else if (error.request) {
      // The request was made, but no response was received
      // console.error(error.request);
    } else {
      // Something happened in setting up the request that triggered an error
      console.error("Error", error.message);
    }
    res
      .status(500)
      .json({ message: "Failed to authenticate", error: error.message });
  }
});

// role assign
app.get("/getRoles", async (req, res) => {
  try {
    console.log("Headers:", req.headers); // Log headers
    const token = req.headers.authorization;

    const response = await axios.get(
      `${process.env.REST_BASE_URI}platform/v1/setup/quickflow/data`,
      {
        headers: { Authorization: `${token}` },
      }
    );
    console.log("Third-Party API Response:", response.data);
    console.log("Roles Response:", response.data.roles); // Log response data
    res.status(200).json(response.data.roles);
  } catch (error) {
    // console.error("Axios Error:", error:response ? error.response.data: error);
    res.status(500).json({ message: "Failed to get roles" });
  }
});


// User Creation

app.post("/createUser", async (req, res) => {
  let xml; // Declare xml variable outside the try block
  try {
    const { token, userDetails, Role } = req.body;
    console.log("Received User Details: ", userDetails);
    console.log("Selected Role: ", Role);
    const userXML = {
      "s:Envelope": {
        $: {
          "xmlns:s": "http://www.w3.org/2003/05/soap-envelope",
          "xmlns:a": "http://schemas.xmlsoap.org/ws/2004/08/addressing",
          "xmlns:u": "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
          "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
          "xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
        },
        "s:Header": {
          "a:Action": { _: "Create", $: { "s:mustUnderstand": "1" } },
          "a:To": {
            _: process.env.SOAP_BASE_URI + "Service.asmx",
            $: { "s:mustUnderstand": "1" },
          },
          fueloauth: { _: token, $: { xmlns: "http://exacttarget.com" } },
        },
        "s:Body": {
          CreateRequest: {
            $: { xmlns: "http://exacttarget.com/wsdl/partnerAPI" },
            Options: {
              SaveOptions: {
                SaveOption: {
                  PropertyName: "*",
                  SaveAction: "UpdateAdd",
                },
              },
            },
            Objects: {
              $: { "xsi:type": "AccountUser" },
              PartnerKey: { $: { "xsi:nil": "true" } },
              ObjectID: { $: { "xsi:nil": "true" } },
              Client: { ID: userDetails.clientId },
              UserID: userDetails.userId,
              Password: userDetails.password,
              Name: userDetails.name,
              Email: userDetails.email,
              NotificationEmailAddress: userDetails.notificationEmail,
              ActiveFlag: userDetails.activeFlag,
              IsAPIUser: userDetails.isApiUser,
              IsLocked: userDetails.isLocked,
              MustChangePassword: userDetails.mustChangePassword,
              DefaultBusinessUnit: userDetails.defaultBusinessUnit,
              Roles: {
                Role: {
                  ObjectID: Role,
                },
              },
            },
          },
        },
      },
    };

    xml = builder.buildObject(userXML);
    console.log('XML Request:', xml); // Log the XML request

    const response = await axios.post(
      process.env.SOAP_BASE_URI + "Service.asmx",
      xml,
      {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          // Authorization: `${token}`,
          // SOAPAction: Create,
        },
      }
    );

    console.log('SOAP Response:', response.data); // Log the SOAP response
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    if (xml) {
      console.log("XML Payload:", xml);
    }
    if (error.response) {
      console.log("SOAP Response:", error.response.data);
      console.error("Error Data:", error.response.data);
      console.error("Response status:", error.response.status);
      console.error("Response headers:", error.response.headers);
    }
    res.status(500).json({ message: "Failed to create user" });
  }
});



app.listen(port, () => {
  // console.log(`Server running on http://localhost:${port}`);
  console.log(`Server running`);
});
