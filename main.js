const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs').promises

let mainWindow
const powershellSessions = new Map()

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    mainWindow.loadFile('index.html')
}

function createPowerShellSession(sessionId) {
    const powershellProcess = spawn('powershell.exe', [
        '-NoExit',
        '-Command',
        '-'
    ], {
        stdio: ['pipe', 'pipe', 'pipe']
    })

    powershellProcess.on('exit', () => {
        // Remove the session if PowerShell exits
        powershellSessions.delete(sessionId)
        mainWindow.webContents.send('session-closed', sessionId)
    })

    powershellSessions.set(sessionId, {
        process: powershellProcess,
        cwd: process.cwd()
    })

    return powershellProcess
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    powershellSessions.forEach(session => {
        if (session.process) {
            session.process.kill()
        }
    })
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

ipcMain.handle('create-session', async (event) => {
    const sessionId = Date.now().toString()
    createPowerShellSession(sessionId)
    return sessionId
})

ipcMain.handle('save-file', async (event, { path, content }) => {
    try {
        await fs.writeFile(path, content, 'utf8')
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('read-file', async (event, { path }) => {
    try {
        const content = await fs.readFile(path, 'utf8')
        return { success: true, content }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('execute-command', async (event, { sessionId, command }) => {
    const session = powershellSessions.get(sessionId)
    if (!session) {
        throw new Error('Session not found')
    }

    return new Promise((resolve, reject) => {
        let output = ''
        let error = ''

        const fullCommand = `
            ${command}
            Write-Output "[[PWD]]"
            (Get-Location).Path
        `

        session.process.stdin.write(fullCommand + '\n')

        const outputHandler = (data) => {
            const text = data.toString()
            if (text.includes('[[PWD]]')) {
                const lines = text.split('\n')
                const pwdIndex = lines.findIndex(line => line.includes('[[PWD]]'))
                if (pwdIndex !== -1 && lines[pwdIndex + 1]) {
                    session.cwd = lines[pwdIndex + 1].trim()
                }
                output += lines.slice(0, pwdIndex).join('\n')
            } else {
                output += text
            }
        }

        const errorHandler = (data) => {
            error += data.toString()
        }

        session.process.stdout.on('data', outputHandler)
        session.process.stderr.on('data', errorHandler)

        setTimeout(() => {
            session.process.stdout.removeListener('data', outputHandler)
            session.process.stderr.removeListener('data', errorHandler)

            resolve({
                success: !error,
                output: output.trim(),
                error: error.trim(),
                cwd: session.cwd
            })
        }, 500)
    })
})