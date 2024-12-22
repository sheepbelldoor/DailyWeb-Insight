const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const UserManager = require('../user/userManager');
const ReportGenerator = require('../reports/reportGenerator');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize managers
const userManager = new UserManager({
    apiKey: process.env.PADDLE_API_KEY,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
});

const reportGenerator = new ReportGenerator(
    process.env.OPENAI_API_KEY,
    {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    }
);

// Routes
app.post('/api/users', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userManager.createUser(email);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        const checkoutUrl = await userManager.upgradeSubscription(email);
        res.json({ checkoutUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/reports/generate', async (req, res) => {
    try {
        const { email, stats } = req.body;
        const report = await reportGenerator.generateReport(stats);
        await reportGenerator.sendReport(email, report);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/webhook/paddle', async (req, res) => {
    try {
        await userManager.handleWebhook(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 