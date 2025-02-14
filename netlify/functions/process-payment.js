const { Client, Environment } = require('square');
const express = require('express');
const cors = require('cors');

exports.handler = async (event, context) => { // Netlify function handler
    const app = express();

    // Replace with your actual access token and environment
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;  // Get from Netlify environment variables
    const environment = Environment.Sandbox; // Or Environment.Production

    if (!accessToken) {
        console.error('SQUARE_ACCESS_TOKEN environment variable not set!');
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: 'Server configuration error.' })
        };
    }

    const client = new Client({
        environment: environment,
        accessToken: accessToken
    });

    app.use(express.json());
    app.use(cors()); // Enable CORS for local development (remove/configure for production)

    if (event.httpMethod === 'POST') {
        if (event.path === '/.netlify/functions/process-payment') {
            const body = JSON.parse(event.body);
            const { nonce, name, email } = body;

            try {
                const paymentsApi = client.paymentsApi;

                const requestBody = {
                    sourceId: nonce,
                    amountMoney: {
                        amount: 100, // Example: $1.00 (in cents) - Dynamically set this amount
                        currency: 'USD'
                    },
                    idempotencyKey: require('crypto').randomBytes(22).toString('hex'), // Unique key to prevent duplicate charges
                    customerId: null, // Consider storing customer IDs for recurring payments

                    // Add customer data to payment request.
                    billingAddress: {
                        familyName: name.split(' ')[1],
                        givenName: name.split(' ')[0],
                        emailAddress: email,
                    }
                };

                const { result } = await paymentsApi.createPayment(requestBody);

                console.log(result);

                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: true, message: 'Payment successful!' })
                };

            } catch (error) {
                console.error(error);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ success: false, message: 'Payment failed.', errors: error.errors })
                };
            }
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ success: false, message: 'Endpoint not found' })
            };
        }
    } else {
        return {
            statusCode: 405,
            body: JSON.stringify({ success: false, message: 'Method not allowed.' })
        };
    }
};
