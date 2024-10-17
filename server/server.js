// const express = require('express');
// const bodyParser = require('body-parser');
// const { exec } = require('child_process');

// const app = express();
// const port = 3000;

// // Middleware to parse JSON bodies
// app.use(bodyParser.json());

// // Route to execute PowerShell commands
// app.post('/run-powershell', (req, res) => {
//     const command = req.body.command;

//     // Validate input
//     if (!command || typeof command !== 'string') {
//         return res.status(400).json({ error: 'Invalid command input' });
//     }

//     // Execute the PowerShell command using child_process
//     exec(`powershell.exe -Command "${command}"`, (error, stdout, stderr) => {
//         if (error) {
//             return res.status(500).json({ error: `Execution error: ${error.message}` });
//         }
//         if (stderr) {
//             return res.status(400).json({ error: `PowerShell error: ${stderr}` });
//         }

//         return res.json({ output: stdout });
//     });
// });

// // Start the server
// app.listen(port, () => {
//     console.log(`PowerShell API server running on http://localhost:${port}`);
// });
