const axios = require('axios');
const qs = require('qs');

module.exports = async function (context, req) {

    // parse Basic Auth username and password
    var header = req.headers["authorization"] || "", // get the header
        token = header.split(/\s+/).pop() || "", // and the encoded auth token
        auth = new Buffer.from(token, "base64").toString(), // convert from base64
        parts = auth.split(/:/), // split on colon
        username = parts[0],
        password = parts[1];

    // Check for HTTP Basic Authentication, return HTTP 401 error if invalid credentials.
    if (
        username !== process.env["BASIC_AUTH_USERNAME"] ||
        password !== process.env["BASIC_AUTH_PASSWORD"]
    ) {
        context.res = {
            status: 401,
        };
        context.log("Invalid Authentication");
        return;
    }

    context.log('JavaScript HTTP trigger function processed a request.');
    
    var body = {};
    var status = 200;

    let data = req.body;

    const extensionAttributeKey = "extension_" + process.env["B2C_EXTENSIONS_APP_ID"] +"_CaptchaUserResponseToken";

    let captchaToken = data && data[extensionAttributeKey]; //extension app-id

    if (!captchaToken) {
        context.log.error("No captcha token verification issue was sent to the API.");
    }

    let captchaApiCheck = captchaToken && await axios.post("https://www.google.com/recaptcha/api/siteverify", qs.stringify({
        "secret": process.env["CAPTCHA_SECRET_KEY"],
        "response": captchaToken
    })).then(function (response) {
        const success = response.data.success;
        if (!success) {
            context.log("Captcha verification unsuccessful: " + JSON.stringify(response));
        }
        return success;
    }).catch(function (err) {
        context.log.error("Some other issue with Captcha API call: " + JSON.stringify(err));
        return false;
    });

    context.log("value of captcha check");
    context.log(captchaApiCheck);

    if (captchaApiCheck) {
        body = {
            "version": "1.0.0",
            "action": "Continue",
            [extensionAttributeKey]: ""
        };
    }
    else {
        body = {
            "version": "1.0.0",
            "action": "ShowBlockPage",
            "userMessage": "Invalid captcha or captcha expired. Please try signing up again or contact an administrator.",
        };
    }

    context.res = {
        status: status,
        body: body
    };
};