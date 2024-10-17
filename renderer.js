const electron = require('electron');

window.addEventListener('load', async () => {

    const { ipcRenderer } = require('electron')

    class DialogManager {
        static async showInputDialog(title, message) {
            return new Promise((resolve) => {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                <div class="modal-content">
                    <h2>${title}</h2>
                    <p>${message}</p>
                    <input type="text" id="modal-input" />
                    <div class="modal-buttons">
                        <button id="modal-ok">OK</button>
                        <button id="modal-cancel">Cancel</button>
                    </div>
                </div>
            `;

                document.body.appendChild(modal);

                const input = modal.querySelector('#modal-input');
                const okButton = modal.querySelector('#modal-ok');
                const cancelButton = modal.querySelector('#modal-cancel');

                okButton.addEventListener('click', () => {
                    const value = input.value;
                    document.body.removeChild(modal);
                    resolve(value);
                });

                cancelButton.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve(null);
                });

                input.focus();
            });
        }
    }

    class Terminal {
        constructor(sessionId) {
            this.sessionId = sessionId
            this.commandHistory = []
            this.historyIndex = -1

            this.element = document.createElement('div')
            this.element.className = 'terminal'

            this.output = document.createElement('div')
            this.output.className = 'output'

            this.inputContainer = document.createElement('div')
            this.inputContainer.className = 'input-container'

            this.directorySpan = document.createElement('span')
            this.directorySpan.className = 'current-directory'
            this.directorySpan.textContent = 'PS>'

            this.input = document.createElement('input')
            this.input.type = 'text'
            this.input.className = 'command-input'
            this.input.placeholder = 'Enter PowerShell command...'

            this.inputContainer.appendChild(this.directorySpan)
            this.inputContainer.appendChild(this.input)

            this.element.appendChild(this.output)
            this.element.appendChild(this.inputContainer)

            this.setupEventListeners()
            this.executeCommand('Get-Location')  // Initialize with current directory
        }

        setupEventListeners() {
            this.input.addEventListener('keyup', async (e) => {
                if (e.key === 'Enter') {
                    await this.executeCommand(this.input.value)
                } else if (e.key === 'ArrowUp') {
                    if (this.historyIndex > 0) {
                        this.historyIndex--
                        this.input.value = this.commandHistory[this.historyIndex]
                    }
                } else if (e.key === 'ArrowDown') {
                    if (this.historyIndex < this.commandHistory.length - 1) {
                        this.historyIndex++
                        this.input.value = this.commandHistory[this.historyIndex]
                    } else {
                        this.historyIndex = this.commandHistory.length
                        this.input.value = ''
                    }
                }
            })
        }

        appendOutput(text, isError = false) {
            const p = document.createElement('p')
            p.style.margin = '5px 0'
            p.style.color = isError ? '#FF6B6B' : '#FFFFFF'
            p.textContent = text
            this.output.appendChild(p)
            this.output.scrollTop = this.output.scrollHeight
        }

        updatePrompt(directory) {
            this.directorySpan.textContent = `PS ${directory}>`
        }

        async executeCommand(command) {
            if (!command) return

            this.commandHistory.push(command)
            this.historyIndex = this.commandHistory.length

            this.appendOutput(`PS> ${command}`)
            this.input.value = ''

            try {
                const result = await ipcRenderer.invoke('execute-command', {
                    sessionId: this.sessionId,
                    command
                })

                if (result.success) {
                    if (result.output) {
                        this.appendOutput(result.output)
                    }
                    if (result.cwd) {
                        this.updatePrompt(result.cwd)
                    }
                } else {
                    this.appendOutput(result.error, true)
                }
            } catch (error) {
                this.appendOutput(error.message, true)
            }
        }
    }


    class TerminalManager {
        constructor() {
            this.terminals = new Map()
            this.activeTerminalId = null
            this.tabsContainer = document.querySelector('.tabs')
            this.terminalsContainer = document.getElementById('terminals')
        }

        async createTerminal() {
            const sessionId = await ipcRenderer.invoke('create-session')
            const terminal = new Terminal(sessionId)

            this.terminals.set(sessionId, terminal)
            this.terminalsContainer.appendChild(terminal.element)

            this.createTab(sessionId)
            this.activateTerminal(sessionId)

            return terminal
        }

        createTab(sessionId) {
            const tab = document.createElement('button')
            tab.className = 'tab'
            tab.innerHTML = `PowerShell ${this.terminals.size} <span class="tab-close">X</span>`

            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close')) {
                    this.closeTerminal(sessionId)
                } else {
                    this.activateTerminal(sessionId)
                }
            })

            // Insert before the "New Terminal" button
            this.tabsContainer.insertBefore(tab, this.tabsContainer.lastElementChild)
        }

        activateTerminal(sessionId) {
            // Deactivate all terminals and tabs
            this.terminals.forEach((terminal, id) => {
                terminal.element.classList.remove('active')
                const tab = this.findTab(id)
                if (tab) tab.classList.remove('active')
            })

            // Activate the selected terminal and tab
            const terminal = this.terminals.get(sessionId)
            terminal.element.classList.add('active')
            const tab = this.findTab(sessionId)
            if (tab) tab.classList.add('active')
            terminal.input.focus()

            this.activeTerminalId = sessionId
        }

        closeTerminal(sessionId) {
            const terminal = this.terminals.get(sessionId)
            if (!terminal) return

            terminal.element.remove()
            this.findTab(sessionId).remove()
            this.terminals.delete(sessionId)

            // Activate another terminal if available
            if (this.terminals.size > 0) {
                this.activateTerminal(this.terminals.keys().next().value)
            }
        }

        findTab(sessionId) {
            const index = Array.from(this.terminals.keys()).indexOf(sessionId)
            return this.tabsContainer.children[index]
        }
    }

    let editor;
    const terminalManager = new TerminalManager()

    // Initialize Monaco Editor
    require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.36.1/min/vs' } });

    // Wait for Monaco to load
    await new Promise((resolve) => {
        require(['vs/editor/editor.main'], () => {
            editor = monaco.editor.create(document.getElementById('editor-container'), {
                value: '// Write your code here',
                language: 'java',
                theme: 'vs-dark',
                automaticLayout: true
            });
            resolve();
        });
    });




    async function createNewTerminal() {
        await terminalManager.createTerminal()
    }

    

    window.newFile = async function () {
        if (editor) {
            editor.setValue('');
        }
    };

    window.openFile = async function () {
        // TODO: Implement file opening dialog
    };

    window.saveFile = async function () {
        if (editor) {
            const content = editor.getValue();
            // TODO: Implement file saving
        }
    };

    window.createAndroidProject = async function () {
        const projectName = await DialogManager.showInputDialog(
            'Create Android Project',
            'Enter project name:'
        );

        if (!projectName) return;

        const terminal = terminalManager.terminals.get(terminalManager.activeTerminalId);
        if (!terminal) return;

        try {
            await terminal.executeCommand(`mkdir "${projectName}"`);
            await terminal.executeCommand(`cd "${projectName}"`);
            await terminal.executeCommand('gradle init --type basic');

            // Add basic Android project structure
            await terminal.executeCommand(`
                mkdir -p app/src/main/java
                mkdir -p app/src/main/res/layout
                mkdir -p app/src/main/res/values
                `);
        } catch (error) {
            await DialogManager.showInputDialog('Error', `Failed to create project: ${error.message}`);
        }
    };


    window.buildAndDeploy = async function () {
        const terminal = terminalManager.terminals.get(terminalManager.activeTerminalId);
        if (!terminal) return;

        try {
            await terminal.executeCommand('./gradlew assembleDebug');
            await terminal.executeCommand('adb install build/outputs/apk/debug/app-debug.apk');
        } catch (error) {
            await DialogManager.showInputDialog('Error', `Build failed: ${error.message}`);
        }
    };
    // Initialize the environment
    document.addEventListener('DOMContentLoaded', () => {
        createNewTerminal();
    });

    // Handle window resize
    await terminalManager.createTerminal()


    const style = document.createElement('style');
    style.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            }
            
            .modal-content {
                background: #2d2d2d;
                padding: 20px;
                border-radius: 5px;
                min-width: 300px;
                }
                
                .modal input {
                    width: 100%;
                    padding: 8px;
                    margin: 10px 0;
                    background: #1e1e1e;
                    border: 1px solid #3c3c3c;
                    color: white;
                    }
                    
                    .modal-buttons {
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        margin-top: 15px;
                        }
                        
                        .modal button {
                            padding: 8px 16px;
                            background: #0e639c;
                            border: none;
                            color: white;
                            cursor: pointer;
                            border-radius: 3px;
                            }
                            
                            .modal button:hover {
                                background: #1177bb;
                                }
                                `;
    document.head.appendChild(style);

    window.addEventListener('resize', () => {
        if (editor) {
            editor.layout();
        }
        ipcRenderer.on('session-closed', (event, sessionId) => {
            terminalManager.closeTerminal(sessionId);
        });
    });
});
